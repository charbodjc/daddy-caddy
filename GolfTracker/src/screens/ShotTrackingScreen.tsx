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

// Flow states for the new streamlined tracking
type FlowState = 'direction' | 'trouble';

interface Shot {
  stroke: number;
  type: string;       // 'tee', 'approach', 'putt'
  results: string[];  // ['center'] or ['left', 'rough'] or ['right', 'ob']
  puttDistance?: string;
  penalty?: boolean;
}

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
          currentStroke: savedData.currentStroke || (savedData.shots ? savedData.shots.length + 1 : 1),
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

  // Core state
  const [par, setPar] = useState<3 | 4 | 5>(initialData.par as 3 | 4 | 5);
  const [shots, setShots] = useState<Shot[]>(initialData.shots);
  const [currentStroke, setCurrentStroke] = useState(initialData.currentStroke);
  const [showParSelector, setShowParSelector] = useState(false);

  // Flow state
  const [flowState, setFlowState] = useState<FlowState>('direction');
  const [selectedDirection, setSelectedDirection] = useState<string>('');

  // Putting state
  const [isPuttingMode, setIsPuttingMode] = useState(false);
  const [puttingStrokes, setPuttingStrokes] = useState(0);
  const [currentPuttDistance, setCurrentPuttDistance] = useState<string>('');
  const [distanceToHole, setDistanceToHole] = useState<string>('');
  const [showDistanceModal, setShowDistanceModal] = useState(false);

  // Media state
  const [mediaCount, setMediaCount] = useState({ photos: 0, videos: 0 });
  const [capturedMedia, setCapturedMedia] = useState<MediaItem[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);

  // Distance input helpers
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

  // Count non-putt shots (actual golf swings to get to green)
  const getNonPuttShots = (shotList: Shot[] = shots) => {
    return shotList.filter(s => s.type !== 'putt');
  };

  // Calculate total strokes including penalties
  const calculateTotalStrokes = (shotList: Shot[]) => {
    if (shotList.length === 0) return 0;
    return shotList.reduce((sum, s) => sum + 1 + (s.penalty ? 1 : 0), 0);
  };

  // Auto-save hole data
  const autoSave = async (currentShots: Shot[], currentPar: number = par) => {
    const totalStrokes = currentShots.length > 0
      ? calculateTotalStrokes(currentShots)
      : (hole.strokes || 0);

    const nextStroke = currentShots.length > 0
      ? calculateTotalStrokes(currentShots) + 1
      : 1;

    const shotData = {
      par: currentPar,
      shots: currentShots.map(s => ({
        stroke: s.stroke,
        type: s.type,
        results: s.results,
        ...(s.penalty ? { penalty: true } : {}),
        ...(s.puttDistance ? { puttDistance: s.puttDistance } : {}),
      })),
      currentStroke: nextStroke,
    };

    const updatedHole: GolfHole = {
      ...hole,
      par: currentPar,
      strokes: totalStrokes,
      shotData: JSON.stringify(shotData),
    };

    await onSave(updatedHole);
  };

  // Score name helper
  const getScoreName = (totalStrokes: number, holePar: number): string => {
    const diff = totalStrokes - holePar;
    if (diff <= -3) return 'Albatross! 🦅🦅';
    if (diff === -2) return 'Eagle! 🦅';
    if (diff === -1) return 'Birdie 🐦';
    if (diff === 0) return 'Par ✅';
    if (diff === 1) return 'Bogey';
    if (diff === 2) return 'Double Bogey';
    if (diff === 3) return 'Triple Bogey';
    return `+${diff}`;
  };

  const getScoreNameSMS = (totalStrokes: number, holePar: number): string => {
    const diff = totalStrokes - holePar;
    if (diff <= -3) return 'Albatross!';
    if (diff === -2) return 'Eagle!';
    if (diff === -1) return 'Birdie';
    if (diff === 0) return 'Par';
    if (diff === 1) return 'Bogey';
    if (diff === 2) return 'Double Bogey';
    if (diff === 3) return 'Triple Bogey';
    return `+${diff}`;
  };

  // Direction emoji for display
  const getDirectionEmoji = (dir: string): string => {
    switch (dir) {
      case 'left': return '⬅️';
      case 'center': return '⬆️';
      case 'right': return '➡️';
      default: return '';
    }
  };

  // Lie label for display
  const getLieLabel = (lie: string): string => {
    switch (lie) {
      case 'rough': return 'Rough';
      case 'sand': return 'Sand';
      case 'hazard': return 'Hazard';
      case 'ob': return 'OB';
      default: return lie;
    }
  };

  // Generate shot summary for SMS
  const generateShotSummary = (shotList: Shot[]): string => {
    return shotList
      .filter(s => s.type !== 'putt')
      .map((shot, index) => {
        const num = index + 1;
        const dirLabel = shot.results[0] === 'center' ? 'Center' :
                         shot.results[0] === 'left' ? 'Left' : 'Right';
        let desc = `${num}. ${dirLabel}`;
        if (shot.results.length > 1) {
          desc += ` - ${getLieLabel(shot.results[1])}`;
        }
        if (shot.penalty) desc += ' (+1)';
        return desc;
      })
      .join('\n');
  };

  // Generate detailed shot description for sharing
  const generateDetailedShotDescription = (shotList: Shot[], holePar: number): string => {
    if (shotList.length === 0) return 'No shots recorded yet';

    const totalStrokes = calculateTotalStrokes(shotList);
    const scoreName = getScoreName(totalStrokes, holePar);

    let message = `Hole ${hole.holeNumber} - Par ${holePar}\n`;
    message += `Score: ${totalStrokes} strokes (${scoreName})\n\n`;
    message += `Shot by shot:\n`;

    shotList.forEach((shot) => {
      if (shot.type === 'putt') {
        message += `${shot.stroke}. Putt`;
        if (shot.puttDistance) message += ` (${shot.puttDistance})`;
        if (shot.results.includes('target')) message += ' - Made';
        if (shot.results.includes('missed')) message += ' - Missed';
      } else {
        message += `${shot.stroke}. ${getDirectionEmoji(shot.results[0])}`;
        if (shot.results.length > 1) {
          message += ` ${getLieLabel(shot.results[1])}`;
        } else {
          message += ' Center';
        }
        if (shot.penalty) message += ' (+1)';
      }
      message += '\n';
    });

    if (totalStrokes <= holePar - 1) {
      message += '\n🎉 Outstanding play!';
    } else if (totalStrokes === holePar) {
      message += '\n⛳ Solid par!';
    }

    return message;
  };

  // Generate SMS-specific shot description
  const generateSMSShotDescription = (shotList: Shot[], holePar: number, runningScore?: number): string => {
    if (shotList.length === 0) return 'No shots recorded yet';

    const totalStrokes = calculateTotalStrokes(shotList);
    const scoreName = getScoreNameSMS(totalStrokes, holePar);

    let message = `Hole ${hole.holeNumber}\n`;
    message += `Score: ${totalStrokes} (${scoreName})\n`;
    if (runningScore !== undefined) {
      const scoreText = runningScore === 0 ? 'E' : runningScore > 0 ? `+${runningScore}` : `${runningScore}`;
      message += `Running Total: ${scoreText}\n`;
    }
    message += `\nShot by shot:\n`;

    shotList.forEach((shot) => {
      if (shot.type === 'putt') {
        message += `${shot.stroke}. Putt`;
        if (shot.puttDistance) message += ` (${shot.puttDistance})`;
        if (shot.results.includes('target')) message += ' ⛳';
        if (shot.results.includes('missed')) message += ' ✗';
      } else {
        const dirEmoji = shot.results[0] === 'center' ? '⬆️' :
                         shot.results[0] === 'left' ? '⬅️' : '➡️';
        message += `${shot.stroke}. ${dirEmoji}`;
        if (shot.results.length > 1) {
          message += ` ${getLieLabel(shot.results[1])}`;
        }
        if (shot.penalty) message += ' (+1)';
      }
      message += '\n';
    });

    if (totalStrokes <= holePar - 1) {
      message += '\n🎉 Outstanding play!';
    } else if (totalStrokes === holePar) {
      message += '\n⛳ Solid par!';
    }

    return message;
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

  // === DIRECTION HANDLERS ===

  const handleDirectionSelect = (direction: 'left' | 'center' | 'right') => {
    if (direction === 'center') {
      // Center = shot complete, record and move on
      const type = getNonPuttShots().length === 0 ? 'tee' : 'approach';
      const newShot: Shot = {
        stroke: currentStroke,
        type,
        results: ['center'],
      };
      const newShots = [...shots, newShot];
      setShots(newShots);
      setCurrentStroke(currentStroke + 1);
      autoSave(newShots, par);

      // Auto-scroll
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    } else {
      // Left or Right = needs further classification
      setSelectedDirection(direction);
      setFlowState('trouble');
    }
  };

  // === TROUBLE HANDLERS ===

  const handleTroubleSelect = (trouble: 'rough' | 'sand' | 'hazard' | 'ob') => {
    const type = getNonPuttShots().length === 0 ? 'tee' : 'approach';
    const isPenalty = trouble === 'hazard' || trouble === 'ob';
    const newShot: Shot = {
      stroke: currentStroke,
      type,
      results: [selectedDirection, trouble],
      penalty: isPenalty,
    };
    const newShots = [...shots, newShot];
    setShots(newShots);
    setCurrentStroke(currentStroke + (isPenalty ? 2 : 1));
    setFlowState('direction');
    setSelectedDirection('');
    autoSave(newShots, par);

    // Auto-scroll
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 100);
  };

  const handleTroubleBack = () => {
    setFlowState('direction');
    setSelectedDirection('');
  };

  // === ON GREEN HANDLER ===

  const handleOnGreen = () => {
    // Open distance modal - On Green is a transition, not a shot
    setShowDistanceModal(true);
  };

  // === PUTTING HANDLERS ===

  const sendPuttUpdate = async () => {
    setShowDistanceModal(false);

    // Calculate running score
    const runningScore = await calculateRunningScore();
    const currentHoleStrokes = calculateTotalStrokes(shots);
    const currentHoleScore = currentHoleStrokes - par;
    const totalRunningScore = (runningScore || 0) + currentHoleScore;

    // Calculate what the putt is for
    const strokesAfterPutt = currentStroke;
    let puttFor = '';
    if (strokesAfterPutt === par - 2) puttFor = ' for eagle';
    else if (strokesAfterPutt === par - 1) puttFor = ' for birdie';
    else if (strokesAfterPutt === par) puttFor = ' for par';
    else if (strokesAfterPutt === par + 1) puttFor = ' for bogey';
    else if (strokesAfterPutt === par + 2) puttFor = ' for double bogey';
    else if (strokesAfterPutt === par + 3) puttFor = ' for triple bogey';
    else if (strokesAfterPutt > par + 3) puttFor = ` for +${strokesAfterPutt - par}`;

    // Format distance message
    const formattedDistance = getFormattedDistance();
    const distanceMessage = formattedDistance ? `${formattedDistance}${puttFor}` : `Putting${puttFor}`;

    // Check for default contact group
    const defaultGroup = await DatabaseService.getPreference('default_sms_group');

    try {
      let message = `Hole ${hole.holeNumber} - Par ${par}\n`;
      message += `${distanceMessage}\n`;

      if (shots.length > 0) {
        message += `\nShots to green:\n`;
        message += generateShotSummary(shots);
        message += '\n';
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

    // Save putt distance and enter putting mode
    const puttDistanceValue = distanceToHole || '0';
    setCurrentPuttDistance(`${puttDistanceValue} ft`);
    setDistanceToHole('');
    setIsPuttingMode(true);
    setPuttingStrokes(0);
  };

  const handlePuttMissed = () => {
    const missedPutt: Shot = {
      stroke: currentStroke,
      type: 'putt',
      results: ['missed'],
      puttDistance: currentPuttDistance,
    };

    setShots([...shots, missedPutt]);
    setCurrentStroke(currentStroke + 1);
    setPuttingStrokes(puttingStrokes + 1);
  };

  const handlePuttMade = async () => {
    const madePutt: Shot = {
      stroke: currentStroke,
      type: 'putt',
      results: ['target'],
      puttDistance: currentPuttDistance,
    };

    const newShots = [...shots, madePutt];
    setShots(newShots);

    // Exit putting mode
    setIsPuttingMode(false);
    const totalPutts = puttingStrokes + 1;
    setPuttingStrokes(0);
    setCurrentPuttDistance('');
    setCurrentStroke(currentStroke + 1);

    // Save the hole data
    await autoSave(newShots, par);

    // Calculate running score including current hole
    const runningScore = await calculateRunningScore();
    const totalStrokes = calculateTotalStrokes(newShots);
    const currentHoleScore = totalStrokes - par;
    const totalRunningScore = (runningScore || 0) + currentHoleScore;

    const scoreName = getScoreName(totalStrokes, par);

    // Check for default contact group
    const defaultGroup = await DatabaseService.getPreference('default_sms_group');

    // Send final hole summary SMS
    try {
      let message = `Hole ${hole.holeNumber} - Par ${par}\n`;
      message += `Score: ${totalStrokes} (${scoreName})\n`;

      if (totalRunningScore !== undefined) {
        const scoreText = totalRunningScore === 0 ? 'E' : totalRunningScore > 0 ? `+${totalRunningScore}` : `${totalRunningScore}`;
        message += `Running Total: ${scoreText}\n`;
      }

      message += `\nPutting: `;
      if (totalPutts === 1) {
        message += `Made it! ⛳`;
      } else if (totalPutts === 2) {
        message += `2-putt`;
      } else if (totalPutts === 3) {
        message += `3-putt 😤`;
      } else {
        message += `${totalPutts}-putt 😱`;
      }

      if (totalStrokes <= par - 1) {
        message += '\n\n🎉 Outstanding play!';
      } else if (totalStrokes === par) {
        message += '\n\n⛳ Solid par!';
      }

      // Check for media
      const media = await DatabaseService.getMediaForHole(roundId, hole.holeNumber);
      if (media.length > 0) {
        message += `\n\n📸 ${media.length} photo${media.length !== 1 ? 's' : ''} captured`;
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

  const handlePuttCancel = () => {
    setIsPuttingMode(false);
    setPuttingStrokes(0);
    setCurrentPuttDistance('');
    setFlowState('direction');
  };

  // === SAVE HANDLER ===

  const handleSave = async () => {
    await autoSave(shots, par);

    const runningScore = await calculateRunningScore();
    const totalStrokes = calculateTotalStrokes(shots);
    const currentHoleScore = totalStrokes - par;
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
              const isSMS = Platform.OS === 'ios';
              const description = isSMS
                ? generateSMSShotDescription(shots, par, totalRunningScore)
                : generateDetailedShotDescription(shots, par);

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

  // === MEDIA HANDLERS ===

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

  // === SHOT HISTORY ===

  const removeShot = (index: number) => {
    const newShots = shots.filter((_, i) => i !== index);
    // Recalculate stroke numbers accounting for penalties
    let stroke = 1;
    const renumberedShots = newShots.map((shot) => {
      const newShot = { ...shot, stroke };
      stroke += shot.penalty ? 2 : 1;
      return newShot;
    });
    setShots(renumberedShots);
    setCurrentStroke(stroke);
    autoSave(renumberedShots, par);
  };

  // Format a shot for history display
  const formatShotHistory = (shot: Shot): string => {
    if (shot.type === 'putt') {
      let text = `${shot.stroke}. Putt`;
      if (shot.puttDistance) text += ` (${shot.puttDistance})`;
      if (shot.results.includes('target')) text += ' ✓';
      if (shot.results.includes('missed')) text += ' ✗';
      return text;
    }

    const dirEmoji = getDirectionEmoji(shot.results[0]);
    let text = `${shot.stroke}. ${dirEmoji}`;
    if (shot.results.length > 1) {
      text += ` ${getLieLabel(shot.results[1])}`;
    } else {
      text += ' Center';
    }
    if (shot.penalty) text += ' (+1)';
    return text;
  };

  // === RENDER ===

  const totalStrokes = calculateTotalStrokes(shots);
  const hasNonPuttShots = getNonPuttShots().length > 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {/* Balance header */}
        </View>

        <View style={styles.headerCenter}>
          <TouchableOpacity onPress={() => setShowParSelector(true)} style={styles.parHeaderButton}>
            <Text style={styles.holeLabel}>Hole {hole.holeNumber} • Par {par}</Text>
            <Icon name="edit" size={14} color="rgba(255,255,255,0.8)" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
          {(roundName || tournamentName) && (
            <Text style={styles.roundInfo}>
              {roundName && <Text style={styles.roundName}>{roundName}</Text>}
              {roundName && tournamentName && <Text style={styles.roundSeparator}> • </Text>}
              {tournamentName && <Text style={styles.tournamentName}>{tournamentName}</Text>}
            </Text>
          )}
          {totalStrokes > 0 && (
            <Text style={styles.scoreLabel}>
              Score: {totalStrokes} {totalStrokes === par ? '(E)' : totalStrokes < par ? `(${totalStrokes - par})` : `(+${totalStrokes - par})`}
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
                  {formatShotHistory(shot)}
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
                          setFlowState('direction');
                          setSelectedDirection('');
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

        {/* Current Stroke Header */}
        <View style={styles.currentShotHeader}>
          <Text style={styles.currentShotText}>
            Stroke {currentStroke}
            {flowState === 'trouble' && selectedDirection && ` • ${selectedDirection === 'left' ? 'Left' : 'Right'} - where?`}
          </Text>
        </View>

        {/* === MAIN FLOW === */}
        {isPuttingMode ? (
          /* Putting Mode */
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
        ) : flowState === 'trouble' ? (
          /* Trouble Classification */
          <View style={styles.buttonSection}>
            <View style={styles.troubleRow}>
              <TouchableOpacity
                style={[styles.troubleButton, styles.troubleRough]}
                onPress={() => handleTroubleSelect('rough')}
              >
                <MaterialCommunityIcons name="grass" size={40} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.troubleButton, styles.troubleSand]}
                onPress={() => handleTroubleSelect('sand')}
              >
                <Icon name="beach-access" size={40} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.troubleButton, styles.troubleHazard]}
                onPress={() => handleTroubleSelect('hazard')}
              >
                <FontAwesome5 name="water" size={34} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.troubleButton, styles.troubleOB]}
                onPress={() => handleTroubleSelect('ob')}
              >
                <Icon name="block" size={40} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Back button */}
            <TouchableOpacity
              style={styles.flowBackButton}
              onPress={handleTroubleBack}
            >
              <Icon name="undo" size={22} color="#666" />
              <Text style={styles.flowBackButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Direction Selection */
          <View style={styles.buttonSection}>
            <View style={styles.directionRow}>
              <TouchableOpacity
                style={[styles.directionButton, styles.directionLeft]}
                onPress={() => handleDirectionSelect('left')}
              >
                <Icon name="arrow-back" size={52} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.directionButton, styles.directionCenter]}
                onPress={() => handleDirectionSelect('center')}
              >
                <Icon name="arrow-upward" size={52} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.directionButton, styles.directionRight]}
                onPress={() => handleDirectionSelect('right')}
              >
                <Icon name="arrow-forward" size={52} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* On Green button - appears after first shot */}
            {hasNonPuttShots && (
              <TouchableOpacity
                style={styles.onGreenButton}
                onPress={handleOnGreen}
              >
                <Icon name="flag" size={28} color="#fff" />
                <Text style={styles.onGreenText}>On Green</Text>
              </TouchableOpacity>
            )}

            {/* Back button */}
            <TouchableOpacity
              style={styles.flowBackButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="undo" size={22} color="#666" />
              <Text style={styles.flowBackButtonText}>Back</Text>
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
              <Text style={styles.parSelectorTitle}>Distance to Hole</Text>
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
  parHeaderButton: {
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

  // Shot History
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

  // Current Shot Header
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

  // Button Section
  buttonSection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
  },

  // Direction Buttons (big!)
  directionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  directionButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    minHeight: 100,
  },
  directionLeft: {
    backgroundColor: '#2196F3',
  },
  directionCenter: {
    backgroundColor: '#4CAF50',
  },
  directionRight: {
    backgroundColor: '#2196F3',
  },

  // On Green Button
  onGreenButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 12,
    marginTop: 12,
    gap: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  onGreenText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },

  // Flow Back Button
  flowBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    backgroundColor: '#f0f0f0',
    gap: 6,
  },
  flowBackButtonText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
  },

  // Trouble Buttons
  troubleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  troubleButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    minHeight: 80,
  },
  troubleRough: {
    backgroundColor: '#558B2F',
  },
  troubleSand: {
    backgroundColor: '#F9A825',
  },
  troubleHazard: {
    backgroundColor: '#1565C0',
  },
  troubleOB: {
    backgroundColor: '#C62828',
  },

  // Putting Mode
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

  // Modals
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
    borderRadius: 10,
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
