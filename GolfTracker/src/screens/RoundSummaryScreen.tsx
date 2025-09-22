import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { useNavigation, useRoute } from '@react-navigation/native';
import DatabaseService from '../services/database';
import AIService from '../services/ai';
import SMSService from '../services/sms';
import { GolfRound, Contact, MediaItem } from '../types';

const RoundSummaryScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { roundId } = route.params as { roundId: string };

  const [round, setRound] = useState<GolfRound | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoundData();
  }, [roundId]);

  const loadRoundData = async () => {
    try {
      const roundData = await DatabaseService.getRound(roundId);
      if (roundData) {
        setRound(roundData);
        
        // Load contacts and media
        const media = await DatabaseService.getMediaForRound(roundId);
        
        setMediaItems(media);

        // Generate AI analysis if not already present
        if (!roundData.aiAnalysis) {
          generateAIAnalysis(roundData);
        } else {
          setAiAnalysis(roundData.aiAnalysis);
        }
      }
    } catch (error) {
      console.error('Error loading round:', error);
      Alert.alert('Error', 'Failed to load round data');
    } finally {
      setLoading(false);
    }
  };

  const generateAIAnalysis = async (roundData: GolfRound) => {
    setIsAnalyzing(true);
    try {
      const analysis = await AIService.analyzeRound(roundData);
      setAiAnalysis(analysis);
      
      // Save the analysis to the database
      const updatedRound = { ...roundData, aiAnalysis: analysis, updatedAt: new Date() };
      await DatabaseService.saveRound(updatedRound);
    } catch (error) {
      console.error('Error generating AI analysis:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sendSummary = async () => {
    if (!round) return;

    const result = await SMSService.sendRoundSummary(round, mediaItems);
    
    if (result.success) {
      Alert.alert('Success', 'SMS app opened with your round summary');
    } else {
      Alert.alert('Error', result.errors.join('\n'));
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!round) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Round not found</Text>
      </View>
    );
  }

  const calculateStats = () => {
    const totalPar = round.holes.reduce((sum, h) => sum + h.par, 0);
    const totalStrokes = round.holes.reduce((sum, h) => sum + h.strokes, 0);
    const score = totalStrokes - totalPar;
    
    let eagles = 0;
    let birdies = 0;
    let pars = 0;
    let bogeys = 0;
    let doubleBogeys = 0;

    round.holes.forEach(hole => {
      const holeScore = hole.strokes - hole.par;
      if (holeScore <= -2) eagles++;
      else if (holeScore === -1) birdies++;
      else if (holeScore === 0) pars++;
      else if (holeScore === 1) bogeys++;
      else if (holeScore >= 2) doubleBogeys++;
    });

    return { totalPar, totalStrokes, score, eagles, birdies, pars, bogeys, doubleBogeys };
  };

  const stats = calculateStats();

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.courseName}>{round.courseName}</Text>
        <Text style={styles.date}>{round.date.toLocaleDateString()}</Text>
        {round.tournamentName && (
          <View style={styles.tournamentBadge}>
            <Icon name="emoji-events" size={16} color="#FFD700" />
            <Text style={styles.tournamentName}>{round.tournamentName}</Text>
          </View>
        )}
      </View>

      {/* Score Summary */}
      <View style={styles.scoreCard}>
        <View style={styles.mainScore}>
          <Text style={styles.totalScore}>{stats.totalStrokes}</Text>
          <Text style={styles.scoreLabel}>Total Strokes</Text>
        </View>
        <View style={styles.scoreDetails}>
          <View style={styles.scoreDetailItem}>
            <Text style={styles.scoreDetailValue}>
              {stats.score > 0 ? '+' : ''}{stats.score}
            </Text>
            <Text style={styles.scoreDetailLabel}>vs Par</Text>
          </View>
          <View style={styles.scoreDetailItem}>
            <Text style={styles.scoreDetailValue}>{round.totalPutts || '-'}</Text>
            <Text style={styles.scoreDetailLabel}>Putts</Text>
          </View>
        </View>
      </View>

      {/* Score Distribution */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Score Distribution</Text>
        <View style={styles.distribution}>
          {stats.eagles > 0 && (
            <View style={[styles.distributionItem, { backgroundColor: '#FFD700' }]}>
              <Text style={styles.distributionCount}>{stats.eagles}</Text>
              <Text style={styles.distributionLabel}>Eagle</Text>
            </View>
          )}
          {stats.birdies > 0 && (
            <View style={[styles.distributionItem, { backgroundColor: '#4CAF50' }]}>
              <Text style={styles.distributionCount}>{stats.birdies}</Text>
              <Text style={styles.distributionLabel}>Birdie</Text>
            </View>
          )}
          <View style={[styles.distributionItem, { backgroundColor: '#2196F3' }]}>
            <Text style={styles.distributionCount}>{stats.pars}</Text>
            <Text style={styles.distributionLabel}>Par</Text>
          </View>
          {stats.bogeys > 0 && (
            <View style={[styles.distributionItem, { backgroundColor: '#FF9800' }]}>
              <Text style={styles.distributionCount}>{stats.bogeys}</Text>
              <Text style={styles.distributionLabel}>Bogey</Text>
          </View>
          )}
          {stats.doubleBogeys > 0 && (
            <View style={[styles.distributionItem, { backgroundColor: '#F44336' }]}>
              <Text style={styles.distributionCount}>{stats.doubleBogeys}</Text>
              <Text style={styles.distributionLabel}>Double+</Text>
            </View>
          )}
        </View>
      </View>

      {/* Shot Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shot Statistics</Text>
        <View style={styles.statsList}>
          <View style={styles.statRow}>
            <Text style={styles.statName}>Fairways Hit</Text>
            <Text style={styles.statValue}>
              {round.fairwaysHit || 0} / 14 ({Math.round(((round.fairwaysHit || 0) / 14) * 100)}%)
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statName}>Greens in Regulation</Text>
            <Text style={styles.statValue}>
              {round.greensInRegulation || 0} / 18 ({Math.round(((round.greensInRegulation || 0) / 18) * 100)}%)
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statName}>Average Putts per Hole</Text>
            <Text style={styles.statValue}>
              {((round.totalPutts || 0) / round.holes.length).toFixed(1)}
            </Text>
          </View>
        </View>
      </View>

      {/* AI Analysis */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="psychology" size={20} color="#4CAF50" />
          <Text style={styles.sectionTitle}>AI Analysis</Text>
        </View>
        {isAnalyzing ? (
          <ActivityIndicator size="small" color="#4CAF50" />
        ) : (
          <Text style={styles.aiAnalysisText}>
            {aiAnalysis || 'AI analysis unavailable. Please configure OpenAI API key.'}
          </Text>
        )}
      </View>

      {/* Hole-by-hole Scorecard */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Scorecard</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.scorecard}>
            <View style={styles.scorecardRow}>
              <Text style={styles.scorecardLabel}>Hole</Text>
              {round.holes.map(hole => (
                <Text key={hole.holeNumber} style={styles.scorecardCell}>
                  {hole.holeNumber}
                </Text>
              ))}
            </View>
            <View style={styles.scorecardRow}>
              <Text style={styles.scorecardLabel}>Par</Text>
              {round.holes.map(hole => (
                <Text key={hole.holeNumber} style={styles.scorecardCell}>
                  {hole.par}
                </Text>
              ))}
            </View>
            <View style={styles.scorecardRow}>
              <Text style={styles.scorecardLabel}>Score</Text>
              {round.holes.map(hole => {
                const diff = hole.strokes - hole.par;
                let color = '#333';
                if (diff <= -2) color = '#FFD700';
                else if (diff === -1) color = '#4CAF50';
                else if (diff === 0) color = '#2196F3';
                else if (diff === 1) color = '#FF9800';
                else if (diff >= 2) color = '#F44336';
                
                return (
                  <Text key={hole.holeNumber} style={[styles.scorecardCell, { color, fontWeight: 'bold' }]}>
                    {hole.strokes}
                  </Text>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Media Count */}
      {mediaItems.length > 0 && (
        <View style={styles.section}>
          <View style={styles.mediaInfo}>
            <Icon name="photo-library" size={20} color="#4CAF50" />
            <Text style={styles.mediaText}>
              {mediaItems.length} photo{mediaItems.length !== 1 ? 's' : ''} and videos captured
            </Text>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.shareButton} onPress={sendSummary}>
          <FontAwesome5 name="sms" size={20} color="#fff" />
          <Text style={styles.shareButtonText}>Send SMS Summary</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.homeButton}
          onPress={() => navigation.navigate('Home' as never)}
        >
          <FontAwesome5 name="home" size={20} color="#4CAF50" />
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    alignItems: 'center',
  },
  courseName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  date: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginTop: 5,
  },
  tournamentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tournamentName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scoreCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mainScore: {
    alignItems: 'center',
    marginBottom: 20,
  },
  totalScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  scoreDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  scoreDetailItem: {
    alignItems: 'center',
  },
  scoreDetailValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  scoreDetailLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
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
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  distribution: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  distributionItem: {
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 60,
  },
  distributionCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  distributionLabel: {
    fontSize: 11,
    color: '#fff',
    marginTop: 3,
  },
  statsList: {
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statName: {
    fontSize: 14,
    color: '#666',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  aiAnalysisText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  scorecard: {
    gap: 8,
  },
  scorecardRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scorecardLabel: {
    width: 50,
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  scorecardCell: {
    width: 30,
    textAlign: 'center',
    fontSize: 12,
    color: '#333',
  },
  mediaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mediaText: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
    padding: 15,
    gap: 10,
  },
  shareButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  homeButton: {
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
  homeButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RoundSummaryScreen;
