import React, { useState, useEffect } from 'react';
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
import { GolfHole, MediaItem } from '../types';

// Shot types - organized into 3 rows for better layout
const SHOT_TYPES = {
  ROW1: ['Tee', 'Approach', 'Chip'],
  ROW2: ['Putt', 'Fairway Bunker', 'Greenside Bunker'],
  ROW3: ['Trouble', 'Recovery', 'Penalty'],
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
  const { hole, onSave, roundId } = route.params as { hole: GolfHole; onSave: (hole: GolfHole) => void; roundId?: string };

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
  const [currentShotType, setCurrentShotType] = useState<string>('');
  const [currentShotResults, setCurrentShotResults] = useState<string[]>([]);
  const [currentStroke, setCurrentStroke] = useState(initialData.currentStroke);
  const [mediaCount, setMediaCount] = useState({ photos: 0, videos: 0 });
  const [capturedMedia, setCapturedMedia] = useState<MediaItem[]>([]);
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
    }
  };

  // Removed auto-confirm to allow manual confirmation with checkmark

  const handleSave = async () => {
    // Calculate total strokes including any in-progress shot
    const totalStrokes = shots.length > 0 ? shots.length : (currentStroke - 1);
    
    // Convert shots to a format for saving
    const shotData = {
      par,
      shots: shots.map(s => ({
        stroke: s.stroke,
        type: s.type,
        results: s.results,
      })),
    };

    const updatedHole: GolfHole = {
      ...hole,
      par,
      strokes: totalStrokes,
      shotData: JSON.stringify(shotData),
    };

    onSave(updatedHole);

    // Prompt to share after save
    Alert.alert(
      'Share Hole?',
      'Would you like to share a quick summary with photos/videos?',
      [
        { text: 'Not now', style: 'cancel', onPress: () => navigation.goBack() },
        {
          text: 'Share',
          style: 'default',
          onPress: async () => {
            try {
              // Ensure we have latest media
              let media = capturedMedia;
              if ((!media || media.length === 0) && roundId) {
                media = await MediaService.getMediaForHole(roundId, hole.holeNumber);
              }

              // Build AI summary
              const ai = new AIHoleAnalysisService();
              const summary = await ai.analyzeHoleWithMedia(updatedHole, media || []);

              // Prepare share content
              const urls = (media || [])
                .map(m => m.uri)
                .filter(Boolean);

              await Share.open({
                title: `Hole ${updatedHole.holeNumber} Summary`,
                message: summary,
                urls,
                failOnCancel: false,
              });
            } catch (e) {
              console.error('Share error:', e);
              Alert.alert('Share Error', 'Unable to open share sheet.');
            } finally {
              navigation.goBack();
            }
          }
        }
      ]
    );
  };

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
        
        <Text style={styles.holeLabel}>H{hole.holeNumber}</Text>
        
        <View style={styles.parButtons}>
          {[3, 4, 5].map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.parButton, par === p && styles.parButtonActive]}
              onPress={() => setPar(p as 3 | 4 | 5)}
            >
              <Text style={[styles.parButtonText, par === p && styles.parButtonTextActive]}>
                P{p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <Text style={styles.strokeCount}>{currentStroke - 1}</Text>
        
        <View style={styles.mediaButtons}>
          <TouchableOpacity 
            onPress={() => handleMediaCapture('photo')} 
            style={styles.mediaButton}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="camera" size={16} color="#fff" />
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
            style={styles.mediaButton}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="videocam" size={16} color="#fff" />
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
            <View style={styles.buttonRow}>
              {SHOT_TYPES.ROW1.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={styles.typeButton}
                  onPress={() => handleShotTypeSelection(type)}
                >
                  <Text style={styles.typeButtonText} numberOfLines={2} adjustsFontSizeToFit>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.buttonRow}>
              {SHOT_TYPES.ROW2.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={styles.typeButton}
                  onPress={() => handleShotTypeSelection(type)}
                >
                  <Text style={styles.typeButtonText} numberOfLines={2} adjustsFontSizeToFit>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.buttonRow}>
              {SHOT_TYPES.ROW3.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={styles.typeButton}
                  onPress={() => handleShotTypeSelection(type)}
                >
                  <Text style={styles.typeButtonText} numberOfLines={2} adjustsFontSizeToFit>
                    {type}
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
              
              {/* Confirm button */}
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  currentShotResults.length === 0 && styles.confirmButtonDisabled
                ]}
                onPress={confirmShotWithResults}
                disabled={currentShotResults.length === 0}
              >
                <Icon 
                  name="check" 
                  size={24} 
                  color={currentShotResults.length > 0 ? '#fff' : '#999'} 
                />
              </TouchableOpacity>
            </View>
            
            {/* Instruction text */}
            <Text style={styles.instructionText}>
              Select up to 2 results, then tap ✓ to confirm
              {currentShotResults.length > 0 && ` (${currentShotResults.length} selected)`}
            </Text>
          </View>
        )}

        {/* Clear/Reset button */}
        {currentShotType && (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => {
              setCurrentShotType('');
              setCurrentShotResults([]);
            }}
          >
            <Text style={styles.resetButtonText}>Cancel Shot</Text>
          </TouchableOpacity>
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

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Hole ({currentStroke - 1} strokes)</Text>
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
    gap: 8,
  },
  mediaButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 6,
    borderRadius: 15,
    position: 'relative',
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
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
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
  confirmButtonDisabled: {
    backgroundColor: '#e0e0e0',
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