import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import MediaService from '../services/media';
import Share from 'react-native-share';
import AIHoleAnalysisService from '../services/aiHoleAnalysis';
import DatabaseService from '../services/database';
import { GolfHole, MediaItem } from '../types';

// Shot types with icons - organized into 2 rows of 4
const SHOT_TYPES = {
  ROW1: [
    { id: 'tee', label: 'Tee Shot', icon: 'golf-course' },
    { id: 'approach', label: 'Approach', icon: 'flag' },
    { id: 'chip', label: 'Chip/Pitch', icon: 'terrain' },
    { id: 'putt', label: 'Putt', icon: 'radio-button-unchecked' },
  ],
  ROW2: [
    { id: 'bunker', label: 'Bunker', icon: 'beach-access' },
    { id: 'hazard', label: 'Hazard', icon: 'warning' },
    { id: 'recovery', label: 'Recovery', icon: 'undo' },
    { id: 'penalty', label: 'Penalty', icon: 'close-circle-outline' },
  ],
};

// Shot results - will be shown as icons
const SHOT_RESULTS = {
  ROW1: [
    { id: 'up', icon: 'arrow-upward', label: 'Long' },
    { id: 'down', icon: 'arrow-downward', label: 'Short' },
    { id: 'target', icon: 'adjust', label: 'On Target' },
    { id: 'left', icon: 'arrow-back', label: 'Left' },
    { id: 'right', icon: 'arrow-forward', label: 'Right' },
  ],
  ROW2: [
    { id: 'hazard', icon: 'water', label: 'Hazard' },
    { id: 'lost', icon: 'help-outline', label: 'Lost' },
    { id: 'ob', icon: 'block', label: 'OB' },
  ],
};

interface Shot {
  stroke: number;
  type: string;
  results: string[];
}

const ShotTrackingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const scrollViewRef = useRef<ScrollView>(null);
  const { hole, onSave, roundId, preselectedShotType } = route.params as { hole: GolfHole; onSave: (hole: GolfHole) => Promise<void>; roundId?: string; preselectedShotType?: string };

  // Initialize state from saved data if available
  const loadSavedShotData = () => {
    if (hole.shotData) {
      try {
        const savedData = JSON.parse(hole.shotData);
        return {
          par: savedData.par || hole.par || 4,
          shots: savedData.shots || [],
          currentStroke: savedData.shots ? savedData.shots.length + 1 : 1,
        };
      } catch (error) {
        console.error('Error parsing saved shot data:', error);
      }
    }
    return {
      par: hole.par || 4,
      shots: [],
      currentStroke: 1,
    };
  };

  const initialData = loadSavedShotData();
  
  const [par, setPar] = useState<3 | 4 | 5>(initialData.par as 3 | 4 | 5);
  const [shots, setShots] = useState<Shot[]>(initialData.shots);
  const [currentShotType, setCurrentShotType] = useState<string>(preselectedShotType || '');
  const [currentShotResults, setCurrentShotResults] = useState<string[]>([]);
  const [currentStroke, setCurrentStroke] = useState(initialData.currentStroke);
  const [mediaCount, setMediaCount] = useState({ photos: 0, videos: 0 });
  const [capturedMedia, setCapturedMedia] = useState<MediaItem[]>([]);

  const autoSave = async (currentShots: Shot[], currentPar: number = par) => {
    const totalStrokes = currentShots.length;
    
    const shotData = {
      par: currentPar,
      shots: currentShots.map(s => ({
        stroke: s.stroke,
        type: s.type,
        results: s.results,
      })),
      currentStroke: currentShots.length + 1,
    };

    const updatedHole: GolfHole = {
      ...hole,
      par: currentPar,
      strokes: totalStrokes,
      shotData: JSON.stringify(shotData),
    };

    await onSave(updatedHole);
  };

  const handleSave = async () => {
    // Save the hole data
    await autoSave(shots, par);
    
    // Prompt to share
    Alert.alert(
      'Share Hole Summary?',
      'Would you like to share this hole summary?',
      [
        {
          text: 'No',
          style: 'cancel',
          onPress: () => navigation.goBack(),
        },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              // Generate AI summary
              const aiService = new AIHoleAnalysisService();
              const media = await DatabaseService.getMediaForHole(roundId, hole.holeNumber);
              const summary = await aiService.analyzeHoleWithMedia({
                ...hole,
                par,
                strokes: shots.length,
                shotData: JSON.stringify({ par, shots }),
              }, media);
              
              // Prepare media for sharing
              const mediaUrls = media.map(m => m.uri).filter(uri => uri);
              
              // Share using react-native-share
              await Share.open({
                title: `Hole ${hole.holeNumber} Summary`,
                message: summary,
                urls: mediaUrls,
              });
              
              navigation.goBack();
            } catch (error) {
              console.error('Share error:', error);
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    loadMediaCount();
    loadExistingMedia();
    // If we have saved shots, update the strokes count
    if (hole.strokes && hole.strokes > 0 && shots.length === 0 && hole.shotData) {
      // This handles the case where strokes were saved but detailed shot data wasn't
      // We'll keep the stroke count but allow re-entering shot details
      setCurrentStroke(hole.strokes + 1);
    }
  }, []);

  const loadMediaCount = async () => {
    if (roundId && hole.holeNumber) {
      const count = await MediaService.getMediaCount(roundId, hole.holeNumber);
      setMediaCount(count);
    }
  };

  const loadExistingMedia = async () => {
    if (roundId && hole.holeNumber) {
      try {
        const media = await MediaService.getMediaForHole(roundId, hole.holeNumber);
        setCapturedMedia(media);
      } catch (error) {
        console.error('Error loading media:', error);
      }
    }
  };

  const handleShotTypeSelection = (type: string) => {
    setCurrentShotType(type);
    setCurrentShotResults([]);
  };

  const handleShotResultSelection = (resultId: string) => {
    // Define mutually exclusive pairs
    const exclusivePairs: { [key: string]: string } = {
      'up': 'down',      // Long excludes Short
      'down': 'up',      // Short excludes Long
      'left': 'right',   // Left excludes Right
      'right': 'left',   // Right excludes Left
    };

    if (currentShotResults.includes(resultId)) {
      // If already selected, deselect it
      setCurrentShotResults(currentShotResults.filter(r => r !== resultId));
    } else {
      // Check if we need to remove the mutually exclusive option
      let newResults = [...currentShotResults];
      
      // Remove the opposite if it exists
      if (exclusivePairs[resultId] && newResults.includes(exclusivePairs[resultId])) {
        newResults = newResults.filter(r => r !== exclusivePairs[resultId]);
      }
      
      // Add the new selection if we haven't reached the limit
      if (newResults.length < 2) {
        newResults.push(resultId);
        setCurrentShotResults(newResults);
      }
    }
  };

  const confirmShotWithResults = () => {
    if (currentShotResults.length > 0) {
      const newShot: Shot = {
        stroke: currentStroke,
        type: currentShotType,
        results: currentShotResults,
      };
      setShots([...shots, newShot]);
      setCurrentStroke(currentStroke + 1);
      setCurrentShotType('');
      setCurrentShotResults([]);
      
      // Auto-scroll to show all buttons
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }
  };

  const confirmShot = () => {
    if (currentShotResults.length > 0 && currentShotResults.length <= 2) {
      const newShot: Shot = {
        stroke: currentStroke,
        type: currentShotType,
        results: currentShotResults,
      };
      setShots([...shots, newShot]);
      setCurrentStroke(currentStroke + 1);
      setCurrentShotType('');
      setCurrentShotResults([]);
      
      // Auto-scroll to show all buttons
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }
  };

  // Removed auto-confirm to allow manual confirmation with checkmark

  

  const handleMediaCapture = async (type: 'photo' | 'video') => {
    if (!roundId) {
      Alert.alert('Error', 'Please save the round first before adding media');
      return;
    }

    if (isCapturing) {
      return; // Prevent multiple simultaneous captures
    }

    setIsCapturing(true);
    try {
      const captured = await MediaService.captureMedia(type);
      if (captured) {
        await MediaService.saveMedia(captured, roundId, hole.holeNumber);
        await loadMediaCount();
        await loadExistingMedia(); // Reload media to show thumbnails
        // Don't show alert, just update the UI
      }
    } catch (error) {
      console.error('Error capturing media:', error);
      Alert.alert(
        'Media Capture Error', 
        `Failed to capture ${type}. Please check app permissions in Settings.`
      );
    } finally {
      setIsCapturing(false);
    }
  };

  const removeMedia = async (mediaId: string) => {
    Alert.alert(
      'Remove Media',
      'Are you sure you want to remove this media?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove from local state
              setCapturedMedia(capturedMedia.filter(m => m.id !== mediaId));
              await loadMediaCount();
            } catch (error) {
              console.error('Error removing media:', error);
            }
          },
        },
      ]
    );
  };

  const removeShot = (index: number) => {
    const newShots = shots.filter((_, i) => i !== index);
    // Renumber strokes
    const renumberedShots = newShots.map((shot, i) => ({
      ...shot,
      stroke: i + 1,
    }));
    setShots(renumberedShots);
    setCurrentStroke(renumberedShots.length + 1);
  };

  const getResultIcon = (resultId: string) => {
    const allResults = [...SHOT_RESULTS.ROW1, ...SHOT_RESULTS.ROW2];
    return allResults.find(r => r.id === resultId);
  };

  return (
    <View style={styles.container}>
      {/* Compact Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        
        <Text style={styles.holeLabel}>Hole {hole.holeNumber}</Text>
        
        <View style={styles.mediaButtons}>
          <TouchableOpacity 
            onPress={() => handleMediaCapture('photo')} 
            style={styles.mediaButtonLarge}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="camera" size={24} color="#fff" />
                {mediaCount.photos > 0 && (
                  <View style={styles.mediaBadge}>
                    <Text style={styles.mediaBadgeText}>{mediaCount.photos}</Text>
                  </View>
                )}
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => handleMediaCapture('video')} 
            style={styles.mediaButtonLarge}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="videocam" size={24} color="#fff" />
                {mediaCount.videos > 0 && (
                  <View style={styles.mediaBadge}>
                    <Text style={styles.mediaBadgeText}>{mediaCount.videos}</Text>
                  </View>
                )}
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView ref={scrollViewRef} style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Saved Data Indicator */}
        {hole.shotData && shots.length > 0 && (
          <View style={styles.savedDataIndicator}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.savedDataText}>Viewing saved shot data</Text>
          </View>
        )}
        
        {/* Shot History */}
        {shots.length > 0 && (
          <View style={styles.shotHistory}>
            {shots.map((shot, index) => (
              <TouchableOpacity
                key={index}
                style={styles.shotHistoryItem}
                onPress={() => removeShot(index)}
                onLongPress={() => removeShot(index)}
              >
                <Text style={styles.shotHistoryText}>
                  {shot.stroke}. {shot.type}: {shot.results.map(r => {
                    const result = getResultIcon(r);
                    return result?.label || r;
                  }).join(' + ')}
                </Text>
                <Ionicons name="close-circle" size={18} color="#ff6b6b" />
              </TouchableOpacity>
            ))}
            {shots.length > 1 && (
              <TouchableOpacity
                style={styles.clearAllButton}
                onPress={() => {
                  Alert.alert(
                    'Clear All Shots',
                    'Are you sure you want to clear all shot data and start over?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Clear All',
                        style: 'destructive',
                        onPress: () => {
                          setShots([]);
                          setCurrentStroke(1);
                          setCurrentShotType('');
                          setCurrentShotResults([]);
                        },
                      },
                    ]
                  );
                }}
              >
                <Ionicons name="trash-outline" size={16} color="#ff6b6b" />
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Current Shot Header */}
        {(currentShotType || shots.length > 0) && (
          <View style={styles.currentShotHeader}>
            <Text style={styles.currentShotText}>
              Stroke {currentStroke}
              {currentShotType && `: ${currentShotType}`}
              {currentShotResults.length > 0 && ` - ${currentShotResults.map(r => {
                const result = getResultIcon(r);
                return result?.label || r;
              }).join(' + ')}`}
            </Text>
          </View>
        )}

        {/* Shot Type Selection OR Shot Result Selection */}
        {!currentShotType ? (
          // Show Shot Type buttons
          <View style={styles.buttonSection}>
            <View style={styles.buttonRowFour}>
              {SHOT_TYPES.ROW1.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={styles.typeButtonSquare}
                  onPress={() => handleShotTypeSelection(type.label)}
                >
                  <Icon name={type.icon} size={24} color="#333" />
                  <Text style={styles.typeButtonLabel} numberOfLines={2} adjustsFontSizeToFit>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.buttonRowFour}>
              {SHOT_TYPES.ROW2.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={styles.typeButtonSquare}
                  onPress={() => handleShotTypeSelection(type.label)}
                >
                  {type.icon === 'close-circle-outline' ? (
                    <Ionicons name={type.icon} size={24} color="#333" />
                  ) : (
                    <Icon name={type.icon} size={24} color="#333" />
                  )}
                  <Text style={styles.typeButtonLabel} numberOfLines={2} adjustsFontSizeToFit>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          // Show Shot Result buttons
          <View style={styles.buttonSection}>
            <View style={styles.buttonRow}>
              {SHOT_RESULTS.ROW1.map((result) => (
                <TouchableOpacity
                  key={result.id}
                  style={[
                    styles.resultButton,
                    currentShotResults.includes(result.id) && styles.resultButtonActive
                  ]}
                  onPress={() => handleShotResultSelection(result.id)}
                >
                  <Icon 
                    name={result.icon} 
                    size={24} 
                    color={currentShotResults.includes(result.id) ? '#fff' : '#333'} 
                  />
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.buttonRow}>
              {SHOT_RESULTS.ROW2.map((result) => (
                <TouchableOpacity
                  key={result.id}
                  style={[
                    styles.resultButton,
                    currentShotResults.includes(result.id) && styles.resultButtonActive
                  ]}
                  onPress={() => handleShotResultSelection(result.id)}
                >
                  {result.id === 'hazard' ? (
                    <FontAwesome5 
                      name="water" 
                      size={20} 
                      color={currentShotResults.includes(result.id) ? '#fff' : '#333'} 
                    />
                  ) : (
                    <Icon 
                      name={result.icon} 
                      size={24} 
                      color={currentShotResults.includes(result.id) ? '#fff' : '#333'} 
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Instruction text */}
            <Text style={styles.instructionText}>
              Select up to 2 results
              {currentShotResults.length > 0 && ` (${currentShotResults.length} selected)`}
            </Text>
            
            {/* Confirm button - full width and green */}
            <TouchableOpacity
              style={[
                styles.confirmButtonFull,
                currentShotResults.length === 0 && styles.confirmButtonDisabled
              ]}
              onPress={confirmShotWithResults}
              disabled={currentShotResults.length === 0}
            >
              <View style={styles.confirmButtonContent}>
                <Icon 
                  name="check-circle" 
                  size={24} 
                  color={currentShotResults.length > 0 ? '#fff' : '#999'} 
                />
                <Text style={[
                  styles.confirmButtonText,
                  currentShotResults.length === 0 && { color: '#999' }
                ]}>
                  Confirm Shot
                </Text>
              </View>
            </TouchableOpacity>
            
            {/* Cancel button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setCurrentShotType('');
                setCurrentShotResults([]);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel Shot</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Media Thumbnails */}
      {capturedMedia.length > 0 && (
        <View style={styles.mediaThumbnailContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.mediaThumbnailList}>
              {capturedMedia.map((media) => (
                <TouchableOpacity
                  key={media.id}
                  style={styles.mediaThumbnail}
                  onPress={() => removeMedia(media.id)}
                  onLongPress={() => removeMedia(media.id)}
                >
                  {media.type === 'photo' ? (
                    <Image source={{ uri: media.uri }} style={styles.thumbnailImage} />
                  ) : (
                    <View style={styles.videoThumbnail}>
                      <Ionicons name="play-circle" size={20} color="#fff" />
                    </View>
                  )}
                  <View style={styles.thumbnailBadge}>
                    <Ionicons 
                      name={media.type === 'photo' ? 'image' : 'videocam'} 
                      size={10} 
                      color="#fff" 
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Done Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSave}
        >
          <Icon name="save" size={20} color="#fff" />
          <Text style={styles.saveButtonText}>Save Hole</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingTop: 45,
    paddingBottom: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  backButton: {
    padding: 5,
  },
  holeLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  parButtons: {
    flexDirection: 'row',
    gap: 5,
  },
  parButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  parButtonActive: {
    backgroundColor: '#fff',
  },
  parButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  parButtonTextActive: {
    color: '#4CAF50',
  },
  strokeCount: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    minWidth: 25,
    textAlign: 'center',
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  mediaButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 6,
    borderRadius: 15,
    position: 'relative',
  },
  mediaButtonLarge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 12,
    borderRadius: 20,
    position: 'relative',
    minWidth: 50,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff6b6b',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 10,
  },
  shotHistory: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  shotHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  shotHistoryText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  savedDataIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    gap: 6,
  },
  savedDataText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#ffebee',
    borderRadius: 6,
  },
  clearAllText: {
    color: '#ff6b6b',
    fontSize: 12,
    fontWeight: '600',
  },
  currentShotHeader: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  currentShotText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  buttonSection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 5,
    flexWrap: 'wrap',
    gap: 8,
  },
  buttonRowFour: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
    gap: 8,
  },
  typeButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 100,
    maxWidth: 110,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 45,
  },
  typeButtonSquare: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 75,
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  typeButtonLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginTop: 4,
  },
  resultButton: {
    backgroundColor: '#f0f0f0',
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultButtonActive: {
    backgroundColor: '#4CAF50',
  },
  confirmButton: {
    backgroundColor: '#2196F3',
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonFull: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    marginHorizontal: 0,
  },
  confirmButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  cancelButton: {
    backgroundColor: '#ff6b6b',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  instructionText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    marginTop: 10,
    fontStyle: 'italic',
  },
  resetButton: {
    backgroundColor: '#ff6b6b',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mediaThumbnailContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  mediaThumbnailList: {
    flexDirection: 'row',
    gap: 8,
  },
  mediaThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f0f0f0',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 10,
    padding: 2,
  },
});

export default ShotTrackingScreen;