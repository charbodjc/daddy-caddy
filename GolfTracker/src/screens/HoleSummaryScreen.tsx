import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Share,
  Linking,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import DatabaseService from '../services/database';
import AIHoleAnalysisService from '../services/aiHoleAnalysis';
import SMSService from '../services/sms';
import { GolfHole, MediaItem, Contact } from '../types';
import { Toast, useToast } from '../components/Toast';
import { calculateRunningRoundStats, formatRunningStatsForSMS } from '../utils/roundStats';

const aiService = new AIHoleAnalysisService();

const HoleSummaryScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { hole, roundId, onNext } = route.params as { 
    hole: GolfHole; 
    roundId: string;
    onNext?: () => void;
  };
  const { toastConfig, showToast, hideToast } = useToast();

  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState<string>('your text group');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load media for this hole
      const allMedia = await DatabaseService.getMediaForRound(roundId);
      const holeMedia = allMedia.filter(m => m.holeNumber === hole.holeNumber);
      setMediaItems(holeMedia);

      // Load group name and contacts
      const savedGroupName = await DatabaseService.getPreference('default_sms_group_name');
      setGroupName(savedGroupName || 'your text group');
      
      // Load contacts to get count
      const raw = await DatabaseService.getPreference('default_sms_group');
      if (raw) {
        try {
          // Try to parse as JSON first (new format)
          const parsedContacts = JSON.parse(raw);
          if (Array.isArray(parsedContacts)) {
            setContacts(parsedContacts);
          }
        } catch {
          // Fallback: Parse old format
          const phoneNumbers = raw.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
          const contactsList = phoneNumbers.map((phone, index) => ({
            id: `saved-${index}`,
            name: phone,
            phoneNumber: phone,
            isActive: true
          }));
          setContacts(contactsList);
        }
      }

      // Generate AI summary
      await generateAISummary(holeMedia);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAISummary = async (media: MediaItem[]) => {
    setIsAnalyzing(true);
    try {
      const summary = await aiService.analyzeHoleWithMedia(hole, media);
      setAiSummary(summary);
    } catch (error) {
      console.error('Error generating AI summary:', error);
      setAiSummary(aiService.generateBasicSummary(hole, media));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const regenerateSummary = async () => {
    await generateAISummary(mediaItems);
  };

  const getScoreDisplay = () => {
    const diff = hole.strokes - hole.par;
    if (diff === 0) return { text: 'Par', color: '#2196F3' };
    if (diff === -3) return { text: 'Albatross!', color: '#FFD700' };
    if (diff === -2) return { text: 'Eagle!', color: '#FFD700' };
    if (diff === -1) return { text: 'Birdie', color: '#4CAF50' };
    if (diff === 1) return { text: 'Bogey', color: '#FF9800' };
    if (diff === 2) return { text: 'Double Bogey', color: '#F44336' };
    if (diff === 3) return { text: 'Triple Bogey', color: '#F44336' };
    return { text: diff > 0 ? `+${diff}` : diff.toString(), color: '#F44336' };
  };

  const formatShotData = () => {
    if (!hole.shotData) return [];
    
    const shots = [];
    const data = hole.shotData;

    if (data.teeShot) {
      shots.push({ 
        type: hole.par === 3 ? 'Tee Shot' : 'Drive', 
        result: data.teeShot,
        icon: 'golf-course',
        color: data.teeShot === 'Fairway' || data.teeShot === 'On Green' ? '#4CAF50' : '#FF9800'
      });
    }

    if (data.approach) {
      shots.push({ 
        type: 'Approach', 
        result: data.approach,
        icon: 'flag',
        color: data.approach === 'Green' ? '#4CAF50' : '#FF9800'
      });
    }

    if (data.chip) {
      shots.push({ 
        type: 'Chip', 
        result: data.chip,
        icon: 'sports-golf',
        color: data.chip === 'On Target' ? '#4CAF50' : '#FF9800'
      });
    }

    if (data.greensideBunker) {
      shots.push({ 
        type: 'Greenside Bunker', 
        result: data.greensideBunker,
        icon: 'landscape',
        color: data.greensideBunker === 'On Target' ? '#4CAF50' : '#F4B400'
      });
    }

    if (data.fairwayBunker) {
      shots.push({ 
        type: 'Fairway Bunker', 
        result: data.fairwayBunker,
        icon: 'landscape',
        color: data.fairwayBunker === 'On Target' ? '#4CAF50' : '#DB4437'
      });
    }

    if (data.troubleShot) {
      shots.push({ 
        type: 'Recovery', 
        result: data.troubleShot,
        icon: 'warning',
        color: data.troubleShot === 'On Target' ? '#4CAF50' : '#9C27B0'
      });
    }

    if (data.putts && data.putts.length > 0) {
      data.putts.forEach((putt, index) => {
        shots.push({ 
          type: `Putt ${index + 1}`, 
          result: putt,
          icon: 'flag',
          color: putt === 'In Hole' ? '#4CAF50' : '#0F9D58'
        });
      });
    }

    return shots;
  };

  const sendSMSUpdate = async () => {
    if (contacts.length === 0) {
      showToast('Please add contacts in Settings first', 'error');
      return;
    }

    // Calculate media counts
    const photos = mediaItems.filter(m => m.type === 'photo').length;
    const videos = mediaItems.filter(m => m.type === 'video').length;

    // Calculate running round stats
    let runningStatsText = '';
    if (roundId) {
      const runningStats = await calculateRunningRoundStats(roundId);
      runningStatsText = formatRunningStatsForSMS(runningStats);
    }

    // Use SMS service to send the hole summary as a group text to all contacts
    const result = await SMSService.sendHoleSummary(
      hole,
      aiSummary,
      { photos, videos },
      contacts,
      runningStatsText
    );
    
    if (result.success) {
      if (result.sent) {
        const mediaNote = mediaItems.length > 0 ? ' (Note: photos/videos sent separately)' : '';
        showToast(`Message opened for ${groupName}${mediaNote}`, 'success');
      }
    } else {
      showToast(result.errors.join(', '), 'error');
    }
  };

  const shareUpdate = async () => {
    try {
      const result = await Share.share({
        message: aiSummary,
        title: `Hole ${hole.holeNumber} Update`,
      });

      if (result.action === Share.sharedAction) {
        console.log('Shared successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share update');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  const scoreInfo = getScoreDisplay();
  const shots = formatShotData();

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: scoreInfo.color }]}>
        <Text style={styles.holeNumber}>Hole {hole.holeNumber}</Text>
        <Text style={styles.parText}>Par {hole.par}</Text>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreValue}>{hole.strokes}</Text>
          <Text style={styles.scoreLabel}>{scoreInfo.text}</Text>
        </View>
      </View>

      {/* AI Summary */}
      <View style={styles.aiSection}>
        <View style={styles.sectionHeader}>
          <FontAwesome5 name="robot" size={24} color="#4CAF50" />
          <Text style={styles.sectionTitle}>AI Summary</Text>
          <TouchableOpacity onPress={regenerateSummary} style={styles.refreshButton}>
            <Ionicons name="refresh" size={20} color="#666" />
          </TouchableOpacity>
        </View>
        
        {isAnalyzing ? (
          <ActivityIndicator size="small" color="#4CAF50" />
        ) : (
          <Text style={styles.aiSummaryText}>{aiSummary}</Text>
        )}
      </View>

      {/* Shot Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shot Breakdown</Text>
        <View style={styles.shotsContainer}>
          {shots.map((shot, index) => (
            <View key={index} style={styles.shotItem}>
              <Icon name={shot.icon} size={20} color={shot.color} />
              <View style={styles.shotDetails}>
                <Text style={styles.shotType}>{shot.type}</Text>
                <Text style={styles.shotResult}>{shot.result}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Media Preview */}
      {mediaItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Captured Media</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.mediaContainer}>
              {mediaItems.map((media, index) => (
                <View key={media.id} style={styles.mediaThumbnail}>
                  {media.type === 'photo' ? (
                    <Image source={{ uri: media.uri }} style={styles.mediaImage} />
                  ) : (
                    <View style={styles.videoPlaceholder}>
                      <Icon name="play-circle-outline" size={40} color="#fff" />
                      <Text style={styles.videoText}>Video {index + 1}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* SMS Group Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Share With</Text>
        {contacts.length > 0 ? (
          <View style={styles.groupInfo}>
            <View style={styles.groupInfoRow}>
              <Icon name="group" size={24} color="#4CAF50" />
              <View style={styles.groupDetails}>
                <Text style={styles.groupNameText}>{groupName}</Text>
                <Text style={styles.groupCountText}>
                  {contacts.length} recipient{contacts.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.editGroupButton}
              onPress={() => navigation.navigate('Contacts' as never)}
            >
              <Icon name="edit" size={18} color="#4CAF50" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addContactsButton}
            onPress={() => navigation.navigate('Contacts' as never)}
          >
            <Icon name="person-add" size={20} color="#4CAF50" />
            <Text style={styles.addContactsText}>Add Contacts</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.smsButton} onPress={sendSMSUpdate}>
          <FontAwesome5 name="sms" size={20} color="#fff" />
          <Text style={styles.smsButtonText}>Send SMS Update</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareButton} onPress={shareUpdate}>
          <Ionicons name="share-social" size={20} color="#4CAF50" />
          <Text style={styles.shareButtonText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back to Hole</Text>
        </TouchableOpacity>

        {onNext && (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={onNext}
          >
            <Text style={styles.nextButtonText}>Next Hole</Text>
            <FontAwesome5 name="arrow-right" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Toast Notification */}
      <Toast
        visible={toastConfig.visible}
        message={toastConfig.message}
        type={toastConfig.type}
        onHide={hideToast}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  holeNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  parText: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginTop: 5,
  },
  scoreContainer: {
    marginTop: 15,
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  scoreLabel: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  aiSection: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  section: {
    backgroundColor: '#fff',
    margin: 15,
    marginTop: 0,
    padding: 15,
    borderRadius: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginLeft: 8,
  },
  refreshButton: {
    padding: 5,
  },
  aiSummaryText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  shotsContainer: {
    marginTop: 10,
  },
  shotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  shotDetails: {
    marginLeft: 12,
    flex: 1,
  },
  shotType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  shotResult: {
    fontSize: 16,
    color: '#333',
    marginTop: 2,
  },
  mediaContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  mediaThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 5,
  },
  groupInfo: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  groupInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  groupDetails: {
    flex: 1,
  },
  groupNameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  groupCountText: {
    fontSize: 14,
    color: '#666',
  },
  editGroupButton: {
    padding: 8,
  },
  addContactsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  addContactsText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  actions: {
    padding: 15,
    gap: 10,
  },
  smsButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  smsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  shareButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  shareButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  navigation: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
  },
  backButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default HoleSummaryScreen;
