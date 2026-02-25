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
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import MediaService from '../services/media';
import SMSService from '../services/sms';
import Share from 'react-native-share';
import AIHoleAnalysisService from '../services/aiHoleAnalysis';
import DatabaseService from '../services/database';
import { GolfHole, MediaItem } from '../types';
import { Toast, useToast } from '../components/Toast';

interface Shot {
  stroke: number;
  type: string;
  results: string[];
  puttDistance?: string;
}

// Flow phases for the streamlined tracking
type FlowPhase = 'direction' | 'classification' | 'putting_distance' | 'putting_mode';

const ShotTrackingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const scrollViewRef = useRef<ScrollView>(null);
  const { hole, onSave, roundId, roundName, tournamentName, preselectedShotType } = route.params as { hole: GolfHole; onSave: (hole: GolfHole) => Promise<void>; roundId?: string; roundName?: string; tournamentName?: string; preselectedShotType?: string };
  const { toastConfig, showToast, hideToast } = useToast();

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
  const [currentStroke, setCurrentStroke] = useState(initialData.currentStroke);
  const [showParSelector, setShowParSelector] = useState(false);
  const [mediaCount, setMediaCount] = useState({ photos: 0, videos: 0 });
  const [capturedMedia, setCapturedMedia] = useState<MediaItem[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);

  // Streamlined flow state
  const [flowPhase, setFlowPhase] = useState<FlowPhase>('direction');
  const [pendingDirection, setPendingDirection] = useState<string>(''); // 'left' or 'right'

  // Putting state
  const [isPuttingMode, setIsPuttingMode] = useState(false);
  const [puttingStrokes, setPuttingStrokes] = useState(0);
  const [currentPuttDistance, setCurrentPuttDistance] = useState<string>('');
  const [distanceToHole, setDistanceToHole] = useState<string>('');
  const [showDistanceModal, setShowDistanceModal] = useState(false);

  // Auto-append 'ft' to distance input
  const handleDistanceChange = (text: string) => {
    const cleanedText = text.replace(/\s*(ft|feet)\s*$/i, '');
    setDistanceToHole(cleanedText);
  };

  const getFormattedDistance = () => {
    if (!distanceToHole) return '';
    const trimmed = distanceToHole.trim();
    if (/^\d+$/.test(trimmed)) {
      return `${trimmed} ft`;
    }
    return distanceToHole;
  };

  // Infer shot type based on stroke number and par
  const inferShotType = (strokeNum: number): string => {
    if (strokeNum === 1) {
      return par === 3 ? 'Approach' : 'Tee Shot';
    }
    return 'Approach';
  };

  // Get the score name for a given number of strokes vs par
  const getScoreName = (strokes: number, holePar: number): string => {
    const diff = strokes - holePar;
    if (diff <= -3) return 'Albatross';
    if (diff === -2) return 'Eagle';
    if (diff === -1) return 'Birdie';
    if (diff === 0) return 'Par';
    if (diff === 1) return 'Bogey';
    if (diff === 2) return 'Double Bogey';
    if (diff === 3) return 'Triple Bogey';
    return `+${diff}`;
  };

  const autoSave = async (currentShots: Shot[], currentPar: number = par) => {
    const totalStrokes = currentShots.length > 0 ? currentShots.length : (hole.strokes || 0);

    const shotData = {
      par: currentPar,
      shots: currentShots.map(s => ({
        stroke: s.stroke,
        type: s.type,
        results: s.results,
        ...(s.puttDistance ? { puttDistance: s.puttDistance } : {}),
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

  const calculateRunningScore = async (): Promise<number | undefined> => {
    if (!roundId) return undefined;

    try {
      const round = await DatabaseService.getRound(roundId);
      if (round) {
        let totalStrokes = 0;
        let totalPar = 0;
        round.holes.forEach(h => {
          if (h.strokes > 0 && h.holeNumber !== hole.holeNumber) {
            totalStrokes += h.strokes;
            totalPar += h.par || 4;
          }
        });
        return totalStrokes - totalPar;
      }
    } catch (error) {
      console.error('Error calculating running score:', error);
    }
    return undefined;
  };

  // Record a shot and advance to the next
  const recordShot = (results: string[], addPenalty: boolean = false) => {
    const shotType = inferShotType(currentStroke);
    const newShot: Shot = {
      stroke: currentStroke,
      type: shotType,
      results: results,
    };

    let newShots = [...shots, newShot];
    let nextStroke = currentStroke + 1;

    // If penalty (hazard/OB), add a penalty stroke
    if (addPenalty) {
      const penaltyShot: Shot = {
        stroke: nextStroke,
        type: 'Penalty',
        results: results.includes('hazard') ? ['hazard'] : ['ob'],
      };
      newShots = [...newShots, penaltyShot];
      nextStroke += 1;
    }

    setShots(newShots);
    setCurrentStroke(nextStroke);
    setPendingDirection('');
    setFlowPhase('direction');

    // Auto-save after each shot
    autoSave(newShots, par);

    // Scroll to top
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 100);
  };

  // Handle direction selection (Left / Center / Right)
  const handleDirectionSelect = (direction: string) => {
    if (direction === 'center') {
      // Center = fairway/on target, shot complete
      recordShot(['center']);
    } else {
      // Left or Right - need further classification
      setPendingDirection(direction);
      setFlowPhase('classification');
    }
  };

  // Handle classification selection (Rough / Sand / Hazard / OB)
  const handleClassificationSelect = (classification: string) => {
    const results = [pendingDirection, classification];
    const addPenalty = classification === 'hazard' || classification === 'ob';
    recordShot(results, addPenalty);
  };

  // Handle On Green selection
  const handleOnGreen = () => {
    // Record the approach shot as on green
    const shotType = inferShotType(currentStroke);
    const newShot: Shot = {
      stroke: currentStroke,
      type: shotType,
      results: ['green'],
    };
    const newShots = [...shots, newShot];
    setShots(newShots);
    setCurrentStroke(currentStroke + 1);

    // Auto-save
    autoSave(newShots, par);

    // Open distance modal for putt
    setShowDistanceModal(true);
  };

  // Send putt update SMS and enter putting mode
  const sendPuttUpdate = async () => {
    setShowDistanceModal(false);

    const runningScore = await calculateRunningScore();
    const currentHoleScore = shots.length - par;
    const totalRunningScore = (runningScore || 0) + currentHoleScore;

    // Calculate what the putt is for based on current stroke count
    // shots already includes the "on green" shot, so currentStroke is the putt stroke
    const puttForStrokes = currentStroke; // this putt, if made, would be this many total strokes
    const puttForName = getScoreName(puttForStrokes, par);

    const formattedDistance = getFormattedDistance();
    const distanceMessage = formattedDistance ? `${formattedDistance} for ${puttForName.toLowerCase()}` : `Putting for ${puttForName.toLowerCase()}`;

    const defaultGroup = await DatabaseService.getPreference('default_sms_group');

    try {
      let message = `Hole ${hole.holeNumber} - Par ${par}\n`;
      message += `${distanceMessage}\n`;

      if (shots.length > 0) {
        message += `\nShots to green:\n`;
        shots.forEach((shot, index) => {
          const shotNum = index + 1;
          message += `${shotNum}. ${shot.type}`;

          if (shot.results && shot.results.length > 0) {
            const resultDescriptions = shot.results.map(r => {
              return getResultLabel(r);
            });
            message += ` - ${resultDescriptions.join(', ')}`;
          }
          message += '\n';
        });
      }

      const result = await SMSService.sendQuickUpdate(message);
      if (!result.success) {
        console.error('SMS error:', result.errors);
        showToast('Failed to open Messages', 'error');
      } else if (!defaultGroup || defaultGroup.trim() === '') {
        showToast('Add recipients in settings for automatic text group', 'info');
      } else if (result.sent) {
        showToast(`Message opened for ${result.groupName}`, 'success');
      }
    } catch (error: any) {
      console.error('Error sending SMS:', error);
      showToast('Error sending message', 'error');
    }

    const puttDistanceValue = distanceToHole || '0';
    setCurrentPuttDistance(`${puttDistanceValue} ft`);
    setDistanceToHole('');

    setIsPuttingMode(true);
    setFlowPhase('putting_mode');
    setPuttingStrokes(0);
  };

  // Get human-readable label for a result
  const getResultLabel = (resultId: string): string => {
    switch (resultId) {
      case 'left': return 'Left';
      case 'right': return 'Right';
      case 'center': return 'Center';
      case 'rough': return 'Rough';
      case 'sand': return 'Sand';
      case 'hazard': return 'Hazard';
      case 'ob': return 'OB';
      case 'green': return 'On Green';
      case 'missed': return 'Missed';
      case 'made': return 'Made';
      default: return resultId;
    }
  };

  // Get emoji for a result
  const getResultEmoji = (resultId: string): string => {
    switch (resultId) {
      case 'left': return '\u2B05\uFE0F';
      case 'right': return '\u27A1\uFE0F';
      case 'center': return '\u2705';
      case 'rough': return '\uD83C\uDF3F';
      case 'sand': return '\uD83C\uDFD6\uFE0F';
      case 'hazard': return '\uD83D\uDCA7';
      case 'ob': return '\u274C';
      case 'green': return '\u26F3';
      case 'missed': return '\u274C';
      case 'made': return '\u2705';
      default: return '';
    }
  };

  // Handler for "Missed It" button in putting mode
  const handlePuttMissed = () => {
    const missedPutt: Shot = {
      stroke: currentStroke,
      type: 'Putt',
      results: ['missed'],
      puttDistance: currentPuttDistance,
    };

    setShots([...shots, missedPutt]);
    setCurrentStroke(currentStroke + 1);
    setPuttingStrokes(puttingStrokes + 1);
  };

  // Handler for "Made It" button in putting mode
  const handlePuttMade = async () => {
    const madePutt: Shot = {
      stroke: currentStroke,
      type: 'Putt',
      results: ['made'],
      puttDistance: currentPuttDistance,
    };

    const newShots = [...shots, madePutt];
    setShots(newShots);

    setIsPuttingMode(false);
    const totalPutts = puttingStrokes + 1;
    setPuttingStrokes(0);
    setCurrentPuttDistance('');
    setCurrentStroke(currentStroke + 1);
    setFlowPhase('direction');

    await autoSave(newShots, par);

    const runningScore = await calculateRunningScore();
    const currentHoleScore = newShots.length - par;
    const totalRunningScore = (runningScore || 0) + currentHoleScore;

    const scoreName = getScoreName(newShots.length, par);
    const scoreEmoji = (() => {
      const diff = newShots.length - par;
      if (diff <= -2) return ' \uD83E\uDD85';
      if (diff === -1) return ' \uD83D\uDC26';
      if (diff === 0) return ' \u2705';
      return '';
    })();

    const defaultGroup = await DatabaseService.getPreference('default_sms_group');

    try {
      let message = `Hole ${hole.holeNumber} - Par ${par}\n`;
      message += `Score: ${newShots.length} (${scoreName}${scoreEmoji})\n`;

      if (totalRunningScore !== undefined) {
        const scoreText = totalRunningScore === 0 ? 'E' : totalRunningScore > 0 ? `+${totalRunningScore}` : `${totalRunningScore}`;
        message += `Running Total: ${scoreText}\n`;
      }

      message += `\nPutting: `;
      if (totalPutts === 1) {
        message += `Made it! \u26F3`;
      } else if (totalPutts === 2) {
        message += `2-putt`;
      } else if (totalPutts === 3) {
        message += `3-putt \uD83D\uDE24`;
      } else {
        message += `${totalPutts}-putt \uD83D\uDE31`;
      }

      if (newShots.length <= par - 1) {
        message += '\n\n\uD83C\uDF89 Outstanding play!';
      } else if (newShots.length === par) {
        message += '\n\n\u26F3 Solid par!';
      }

      const media = await DatabaseService.getMediaForHole(roundId, hole.holeNumber);
      if (media.length > 0) {
        message += `\n\n\uD83D\uDCF8 ${media.length} photo${media.length !== 1 ? 's' : ''} captured`;
      }

      const result = await SMSService.sendQuickUpdate(message);
      if (!result.success) {
        console.error('SMS error:', result.errors);
        showToast('Failed to open Messages', 'error');
      } else if (!defaultGroup || defaultGroup.trim() === '') {
        showToast('Add recipients in settings for automatic text group', 'info');
      } else if (result.sent) {
        showToast(`Message opened for ${result.groupName}`, 'success');
      }

      navigation.goBack();
    } catch (error: any) {
      console.error('Error sending SMS:', error);
      showToast('Error sending message', 'error');
      navigation.goBack();
    }
  };

  // Handler for "Cancel" button in putting mode
  const handlePuttCancel = () => {
    setIsPuttingMode(false);
    setPuttingStrokes(0);
    setCurrentPuttDistance('');
    setFlowPhase('direction');
  };

  const handleSave = async () => {
    await autoSave(shots, par);

    const runningScore = await calculateRunningScore();
    const currentHoleScore = shots.length - par;
    const totalRunningScore = (runningScore || 0) + currentHoleScore;

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
              const scoreName = getScoreName(shots.length, par);
              let description = `Hole ${hole.holeNumber} - Par ${par}\n`;
              description += `Score: ${shots.length} strokes (${scoreName})\n\n`;
              description += `Shot by shot:\n`;

              shots.forEach((shot, index) => {
                description += `${index + 1}. ${shot.type}`;
                if (shot.results && shot.results.length > 0) {
                  const resultDescriptions = shot.results.map(r => getResultLabel(r));
                  description += ` - ${resultDescriptions.join(', ')}`;
                }
                if (shot.puttDistance) {
                  description += ` (${shot.puttDistance})`;
                }
                description += '\n';
              });

              if (shots.length <= par - 1) {
                description += '\n\uD83C\uDF89 Outstanding play!';
              } else if (shots.length === par) {
                description += '\n\u26F3 Solid par!';
              }

              const media = await DatabaseService.getMediaForHole(roundId, hole.holeNumber);
              const mediaUrls = media.map(m => m.uri).filter(uri => uri);

              await Share.open({
                title: `Hole ${hole.holeNumber} - Shot Details`,
                message: description,
                urls: mediaUrls,
              });

              navigation.goBack();
            } catch (error: any) {
              if (error?.message !== 'User did not share') {
                console.error('Share error:', error);
              }
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    loadMediaCount();
    loadExistingMedia();
    if (hole.strokes && hole.strokes > 0 && shots.length === 0 && hole.shotData) {
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

  const handleMediaFromLibrary = async () => {
    if (!roundId) {
      Alert.alert('Error', 'Please save the round first before adding media');
      return;
    }
    if (isCapturing) return;

    setIsCapturing(true);
    try {
      const media = await MediaService.selectFromLibrary('mixed');
      if (media) {
        await MediaService.saveMedia(media, roundId, hole.holeNumber);
        setCapturedMedia([...capturedMedia, media]);
        await loadMediaCount();
        Alert.alert('Success', 'Media added from library');
      }
    } catch (error: any) {
      console.error('Error selecting from library:', error);
      Alert.alert('Error', error.message || 'Failed to select media from library');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleMediaCapture = async (type: 'photo' | 'video') => {
    if (!roundId) {
      Alert.alert('Error', 'Please save the round first before adding media');
      return;
    }
    if (isCapturing) return;

    setIsCapturing(true);
    try {
      const captured = await MediaService.captureMedia(type);
      if (captured) {
        await MediaService.saveMedia(captured, roundId, hole.holeNumber);
        await loadMediaCount();
        await loadExistingMedia();
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
    const renumberedShots = newShots.map((shot, i) => ({
      ...shot,
      stroke: i + 1,
    }));
    setShots(renumberedShots);
    setCurrentStroke(renumberedShots.length + 1);
  };

  // Whether to show the On Green option (available after first shot)
  const showOnGreen = shots.length > 0 && !isPuttingMode;

  // Build the shot history display label
  const getShotHistoryLabel = (shot: Shot): string => {
    let label = `${shot.stroke}. ${shot.type}`;
    if (shot.results && shot.results.length > 0) {
      const resultLabels = shot.results.map(r => getResultLabel(r));
      label += `: ${resultLabels.join(', ')}`;
    }
    if (shot.puttDistance) {
      label += ` (${shot.puttDistance})`;
    }
    return label;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {/* Empty space for balance */}
        </View>

        <View style={styles.headerCenter}>
          <TouchableOpacity onPress={() => setShowParSelector(true)} style={styles.parTouchable}>
            <Text style={styles.holeLabel}>Hole {hole.holeNumber} \u2022 Par {par}</Text>
            <Icon name="edit" size={14} color="rgba(255,255,255,0.8)" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
          {(roundName || tournamentName) && (
            <Text style={styles.roundInfo}>
              {roundName && <Text style={styles.roundName}>{roundName}</Text>}
              {roundName && tournamentName && <Text style={styles.roundSeparator}> \u2022 </Text>}
              {tournamentName && <Text style={styles.tournamentName}>{tournamentName}</Text>}
            </Text>
          )}
          {shots.length > 0 && (
            <Text style={styles.scoreLabel}>
              Score: {shots.length} {shots.length === par ? '(E)' : shots.length < par ? `(${shots.length - par})` : `(+${shots.length - par})`}
            </Text>
          )}
        </View>

        <View style={styles.mediaButtons}>
          <TouchableOpacity
            onPress={() => handleMediaCapture('photo')}
            style={styles.mediaButtonCompact}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="camera" size={26} color="#fff" />
                {mediaCount.photos > 0 && (
                  <View style={styles.mediaBadgeCompact}>
                    <Text style={styles.mediaBadgeTextCompact}>{mediaCount.photos}</Text>
                  </View>
                )}
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleMediaCapture('video')}
            style={styles.mediaButtonCompact}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="videocam" size={26} color="#fff" />
                {mediaCount.videos > 0 && (
                  <View style={styles.mediaBadgeCompact}>
                    <Text style={styles.mediaBadgeTextCompact}>{mediaCount.videos}</Text>
                  </View>
                )}
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleMediaFromLibrary}
            style={styles.mediaButtonCompact}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="images" size={26} color="#fff" />
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
                  {getShotHistoryLabel(shot)}
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
                          setFlowPhase('direction');
                          setPendingDirection('');
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
        {shots.length > 0 && !isPuttingMode && (
          <View style={styles.currentShotHeader}>
            <Text style={styles.currentShotText}>
              Stroke {currentStroke}: {inferShotType(currentStroke)}
            </Text>
          </View>
        )}

        {/* PUTTING MODE */}
        {isPuttingMode ? (
          <View style={styles.buttonSection}>
            {currentPuttDistance && (
              <View style={styles.puttingDistanceDisplay}>
                <Text style={styles.puttingDistanceLabel}>Putt Distance</Text>
                <Text style={styles.puttingDistanceValue}>{currentPuttDistance}</Text>
                {puttingStrokes > 0 && (
                  <Text style={styles.puttingStrokesCount}>
                    {puttingStrokes} {puttingStrokes === 1 ? 'putt' : 'putts'} so far
                  </Text>
                )}
              </View>
            )}

            <View style={styles.puttingButtonContainer}>
              <TouchableOpacity
                style={[styles.puttingButton, styles.puttingButtonMade]}
                onPress={handlePuttMade}
              >
                <Icon name="check-circle" size={32} color="#fff" />
                <Text style={styles.puttingButtonText}>Made It!</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.puttingButton, styles.puttingButtonMissed]}
                onPress={handlePuttMissed}
              >
                <Icon name="close" size={32} color="#fff" />
                <Text style={styles.puttingButtonText}>Missed It</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.puttingButton, styles.puttingButtonCancel]}
                onPress={handlePuttCancel}
              >
                <Icon name="undo" size={32} color="#fff" />
                <Text style={styles.puttingButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : flowPhase === 'classification' ? (
          /* CLASSIFICATION PHASE: Rough / Sand / Hazard / OB */
          <View style={styles.buttonSection}>
            <Text style={styles.classificationTitle}>
              {pendingDirection === 'left' ? 'Left' : 'Right'} - Where did it end up?
            </Text>
            <View style={styles.classificationRow}>
              {/* Rough */}
              <TouchableOpacity
                style={styles.classificationButton}
                onPress={() => handleClassificationSelect('rough')}
              >
                <MaterialCommunityIcons name="grass" size={36} color="#4CAF50" />
                <Text style={styles.classificationLabel}>Rough</Text>
              </TouchableOpacity>

              {/* Sand */}
              <TouchableOpacity
                style={styles.classificationButton}
                onPress={() => handleClassificationSelect('sand')}
              >
                <MaterialCommunityIcons name="waves" size={36} color="#F9A825" />
                <Text style={styles.classificationLabel}>Sand</Text>
              </TouchableOpacity>

              {/* Hazard */}
              <TouchableOpacity
                style={[styles.classificationButton, styles.classificationButtonDanger]}
                onPress={() => handleClassificationSelect('hazard')}
              >
                <FontAwesome5 name="water" size={30} color="#2196F3" />
                <Text style={styles.classificationLabel}>Hazard</Text>
                <Text style={styles.penaltyBadge}>+1</Text>
              </TouchableOpacity>

              {/* OB */}
              <TouchableOpacity
                style={[styles.classificationButton, styles.classificationButtonDanger]}
                onPress={() => handleClassificationSelect('ob')}
              >
                <Icon name="block" size={36} color="#f44336" />
                <Text style={styles.classificationLabel}>OB</Text>
                <Text style={styles.penaltyBadge}>+1</Text>
              </TouchableOpacity>
            </View>

            {/* Back button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setPendingDirection('');
                setFlowPhase('direction');
              }}
            >
              <Icon name="arrow-back" size={20} color="#666" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* DIRECTION PHASE: Left / Center / Right (+ On Green after first shot) */
          <View style={styles.buttonSection}>
            {shots.length === 0 && (
              <Text style={styles.directionTitle}>
                Stroke {currentStroke}: {inferShotType(currentStroke)}
              </Text>
            )}

            <View style={styles.directionRow}>
              {/* Left */}
              <TouchableOpacity
                style={[styles.directionButton, styles.directionButtonLeft]}
                onPress={() => handleDirectionSelect('left')}
              >
                <Icon name="arrow-back" size={48} color="#fff" />
              </TouchableOpacity>

              {/* Center */}
              <TouchableOpacity
                style={[styles.directionButton, styles.directionButtonCenter]}
                onPress={() => handleDirectionSelect('center')}
              >
                <Icon name="arrow-upward" size={48} color="#fff" />
              </TouchableOpacity>

              {/* Right */}
              <TouchableOpacity
                style={[styles.directionButton, styles.directionButtonRight]}
                onPress={() => handleDirectionSelect('right')}
              >
                <Icon name="arrow-forward" size={48} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* On Green button - shown after first shot */}
            {showOnGreen && (
              <TouchableOpacity
                style={styles.onGreenButton}
                onPress={handleOnGreen}
              >
                <MaterialCommunityIcons name="flag-variant" size={32} color="#fff" />
                <Text style={styles.onGreenButtonText}>On Green</Text>
              </TouchableOpacity>
            )}

            {/* Back / Go Back button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={20} color="#666" />
              <Text style={styles.backButtonText}>Back</Text>
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

      {/* Par Selector Modal */}
      <Modal
        visible={showParSelector}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowParSelector(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowParSelector(false)}
        >
          <View style={styles.parSelectorModal}>
            <Text style={styles.parSelectorTitle}>Select Par for Hole {hole.holeNumber}</Text>
            <View style={styles.parSelectorButtons}>
              <TouchableOpacity
                style={[styles.parSelectButton, par === 3 && styles.parSelectButtonActive]}
                onPress={() => {
                  setPar(3);
                  autoSave(shots, 3);
                  setShowParSelector(false);
                }}
              >
                <Text style={[styles.parSelectButtonText, par === 3 && styles.parSelectButtonTextActive]}>Par 3</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.parSelectButton, par === 4 && styles.parSelectButtonActive]}
                onPress={() => {
                  setPar(4);
                  autoSave(shots, 4);
                  setShowParSelector(false);
                }}
              >
                <Text style={[styles.parSelectButtonText, par === 4 && styles.parSelectButtonTextActive]}>Par 4</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.parSelectButton, par === 5 && styles.parSelectButtonActive]}
                onPress={() => {
                  setPar(5);
                  autoSave(shots, 5);
                  setShowParSelector(false);
                }}
              >
                <Text style={[styles.parSelectButtonText, par === 5 && styles.parSelectButtonTextActive]}>Par 5</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Distance to Hole Modal (for On Green) */}
      <Modal
        visible={showDistanceModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowDistanceModal(false);
          setDistanceToHole('');
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              setShowDistanceModal(false);
              setDistanceToHole('');
            }}
          >
            <View style={[styles.parSelectorModal, { marginBottom: 100 }]}>
              <Text style={styles.parSelectorTitle}>
                Putt Distance
              </Text>
              <View style={styles.distanceInputContainer}>
                <TextInput
                  style={styles.distanceInput}
                  placeholder="Enter distance (e.g., 15)"
                  value={distanceToHole}
                  onChangeText={handleDistanceChange}
                  keyboardType="numeric"
                  autoFocus={true}
                />
                <Text style={styles.distanceUnit}>ft</Text>
              </View>
              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[styles.modalIconButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setShowDistanceModal(false);
                    setDistanceToHole('');
                  }}
                >
                  <Icon name="close" size={32} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalIconButton, styles.modalButtonSend]}
                  onPress={sendPuttUpdate}
                >
                  <Icon name="check" size={32} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* FAB save button - hidden during putting mode */}
      {!isPuttingMode && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Icon name="save" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Toast Notification */}
      <Toast
        visible={toastConfig.visible}
        message={toastConfig.message}
        type={toastConfig.type}
        onHide={hideToast}
      />
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
    paddingTop: 40,
    paddingBottom: 8,
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
  headerLeft: {
    width: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  holeLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  scoreLabel: {
    color: '#fff',
    fontSize: 12,
    marginTop: 2,
    opacity: 0.9,
  },
  roundInfo: {
    flexDirection: 'row',
    marginTop: 2,
  },
  roundName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  roundSeparator: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  tournamentName: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
  },
  parTouchable: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  mediaButtonCompact: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 12,
    borderRadius: 20,
    position: 'relative',
    minWidth: 44,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaBadgeCompact: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ff6b6b',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaBadgeTextCompact: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 10,
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
    padding: 15,
  },

  // Direction Phase Styles
  directionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  directionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 15,
  },
  directionButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    minHeight: 100,
  },
  directionButtonLeft: {
    backgroundColor: '#FF9800',
  },
  directionButtonCenter: {
    backgroundColor: '#4CAF50',
  },
  directionButtonRight: {
    backgroundColor: '#2196F3',
  },
  onGreenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 18,
    borderRadius: 16,
    marginBottom: 15,
    gap: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  onGreenButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    gap: 6,
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },

  // Classification Phase Styles
  classificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  classificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 15,
  },
  classificationButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    position: 'relative',
  },
  classificationButtonDanger: {
    backgroundColor: '#FFF3E0',
  },
  classificationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginTop: 6,
    textAlign: 'center',
  },
  penaltyBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#f44336',
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },

  // Putting Mode Styles
  puttingDistanceDisplay: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
  },
  puttingDistanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  puttingDistanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  puttingStrokesCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
    fontStyle: 'italic',
  },
  puttingButtonContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  puttingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 12,
    gap: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  puttingButtonMade: {
    backgroundColor: '#4CAF50',
  },
  puttingButtonMissed: {
    backgroundColor: '#FF9800',
  },
  puttingButtonCancel: {
    backgroundColor: '#757575',
  },
  puttingButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  parSelectorModal: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  parSelectorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  parSelectorButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
  },
  parSelectButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  parSelectButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  parSelectButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  parSelectButtonTextActive: {
    color: '#fff',
  },
  distanceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginVertical: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  distanceInput: {
    flex: 1,
    padding: 12,
    fontSize: 18,
    color: '#333',
  },
  distanceUnit: {
    fontSize: 16,
    color: '#666',
    paddingRight: 15,
    fontWeight: '600',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
    gap: 15,
    marginTop: 10,
  },
  modalIconButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modalButtonCancel: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modalButtonSend: {
    backgroundColor: '#4CAF50',
  },

  // Media Thumbnails
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

  // FAB
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#4CAF50',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
});

export default ShotTrackingScreen;
