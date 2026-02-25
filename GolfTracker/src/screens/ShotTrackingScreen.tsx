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

// Shot types with icons - organized into 2 rows of 4
const SHOT_TYPES = {
  ROW1: [
    { id: 'tee', label: 'Tee Shot', icon: 'golf-tee', iconType: 'material-community' },
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
  puttDistance?: string; // Add putt distance
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
  const [currentPuttDistance, setCurrentPuttDistance] = useState<string>('');
  const [showParSelector, setShowParSelector] = useState(false);
  const [mediaCount, setMediaCount] = useState({ photos: 0, videos: 0 });
  const [capturedMedia, setCapturedMedia] = useState<MediaItem[]>([]);
  const [distanceToHole, setDistanceToHole] = useState<string>('');  // New state for distance to hole
  const [showDistanceModal, setShowDistanceModal] = useState(false);
  const [isPuttingMode, setIsPuttingMode] = useState(false);  // Track putting mode
  const [puttingStrokes, setPuttingStrokes] = useState(0);  // Track putts in current sequence
  
  // Auto-append 'ft' to distance input
  const handleDistanceChange = (text: string) => {
    // Remove any existing 'ft' or 'feet' to avoid duplication
    const cleanedText = text.replace(/\s*(ft|feet)\s*$/i, '');
    setDistanceToHole(cleanedText);
  };
  
  const getFormattedDistance = () => {
    if (!distanceToHole) return '';
    // If it's just a number, add 'ft'
    const trimmed = distanceToHole.trim();
    if (/^\d+$/.test(trimmed)) {
      return `${trimmed} ft`;
    }
    return distanceToHole;
  };

  const autoSave = async (currentShots: Shot[], currentPar: number = par) => {
    // If we have recorded shots in this session, use that count
    // Otherwise, preserve the existing strokes value from the hole data
    // This prevents overwriting scores when just changing par or viewing the hole
    const totalStrokes = currentShots.length > 0 ? currentShots.length : (hole.strokes || 0);
    
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

  const generateDetailedShotDescription = (shots: Shot[], par: number): string => {
    if (shots.length === 0) return 'No shots recorded yet';
    
    const scoreName = (() => {
      const diff = shots.length - par;
      if (diff <= -3) return 'Albatross! 🦅🦅';
      if (diff === -2) return 'Eagle! 🦅';
      if (diff === -1) return 'Birdie 🐦';
      if (diff === 0) return 'Par ✅';
      if (diff === 1) return 'Bogey';
      if (diff === 2) return 'Double Bogey';
      if (diff === 3) return 'Triple Bogey';
      return `+${diff}`;
    })();

    let message = `Hole ${hole.holeNumber} - Par ${par}\n`;
    message += `Score: ${shots.length} strokes (${scoreName})\n\n`;
    message += `Shot by shot:\n`;
    
    shots.forEach((shot, index) => {
      const shotNum = index + 1;
      const shotTypeLabel = SHOT_TYPES.ROW1.concat(SHOT_TYPES.ROW2).find(t => t.id === shot.type)?.label || shot.type;
      
      message += `${shotNum}. ${shotTypeLabel}`;
      
      // Add putt distance if it's a putt
      if (shot.type === 'Putt' && shot.puttDistance) {
        // If puttDistance already includes 'ft', use it as is, otherwise format it
        const distanceLabel = shot.puttDistance.includes('ft') 
          ? shot.puttDistance 
          : (shot.puttDistance === 'short' ? '< 5ft' : 
             shot.puttDistance === 'medium' ? '5-15ft' : 
             shot.puttDistance === 'long' ? '> 15ft' : 
             `${shot.puttDistance} ft`);
        message += ` (${distanceLabel})`;
      }
      
      if (shot.results && shot.results.length > 0) {
        const resultDescriptions = shot.results.map(r => {
          const result = SHOT_RESULTS.ROW1.concat(SHOT_RESULTS.ROW2).find(res => res.id === r);
          return result?.label || r;
        });
        message += ` - ${resultDescriptions.join(', ')}`;
      }
      
      message += '\n';
    });
    
    // Add final result
    if (shots.length <= par - 1) {
      message += '\n🎉 Outstanding play!';
    } else if (shots.length === par) {
      message += '\n⛳ Solid par!';
    }
    
    return message;
  };

  const generateSMSShotDescription = (shots: Shot[], par: number, runningScore?: number, isUpdate?: boolean): string => {
    if (shots.length === 0) return 'No shots recorded yet';
    
    const scoreName = (() => {
      const diff = shots.length - par;
      if (diff <= -3) return 'Albatross!';
      if (diff === -2) return 'Eagle!';
      if (diff === -1) return 'Birdie';
      if (diff === 0) return 'Par';
      if (diff === 1) return 'Bogey';
      if (diff === 2) return 'Double Bogey';
      if (diff === 3) return 'Triple Bogey';
      return `+${diff}`;
    })();

    // Map shot results to icons
    const resultToIcon = (resultId: string): string => {
      switch (resultId) {
        case 'up': return '⬆️';
        case 'down': return '⬇️';
        case 'target': return '🎯';
        case 'left': return '⬅️';
        case 'right': return '➡️';
        case 'hazard': return '💧';
        case 'lost': return '❓';
        case 'ob': return '❌';
        default: return '';
      }
    };

    let message = `Hole ${hole.holeNumber}\n`;
    if (isUpdate) {
      message += `Ball on green!\n`;
      if (distanceToHole) {
        message += `Distance: ${getFormattedDistance()}\n`;
      }
    } else {
      message += `Score: ${shots.length} (${scoreName})\n`;
    }
    if (runningScore !== undefined) {
      const scoreText = runningScore === 0 ? 'E' : runningScore > 0 ? `+${runningScore}` : `${runningScore}`;
      message += `Running Total: ${scoreText}\n`;
    }
    message += `\nShot by shot:\n`;
    
    shots.forEach((shot, index) => {
      const shotNum = index + 1;
      const shotTypeLabel = SHOT_TYPES.ROW1.concat(SHOT_TYPES.ROW2).find(t => t.id === shot.type)?.label || shot.type;
      
      // For updates, only show non-putt shots
      if (isUpdate && shot.type === 'putt') {
        return;
      }
      
      message += `${shotNum}. ${shotTypeLabel}`;
      
      // Add putt distance if it's a putt
      if (shot.type === 'putt' && shot.puttDistance) {
        // If puttDistance already includes 'ft', use it as is, otherwise format it
        const distanceLabel = shot.puttDistance.includes('ft') 
          ? shot.puttDistance 
          : (shot.puttDistance === 'short' ? '< 5ft' : 
             shot.puttDistance === 'medium' ? '5-15ft' : 
             shot.puttDistance === 'long' ? '> 15ft' : 
             `${shot.puttDistance} ft`);
        message += ` (${distanceLabel})`;
      }
      
      if (shot.results && shot.results.length > 0) {
        const resultIcons = shot.results.map(r => resultToIcon(r)).filter(icon => icon !== '');
        if (resultIcons.length > 0) {
          message += ` ${resultIcons.join(' ')}`;
        }
      }
      
      message += '\n';
    });
    
    // Add final result
    if (shots.length <= par - 1) {
      message += '\n🎉 Outstanding play!';
    } else if (shots.length === par) {
      message += '\n⛳ Solid par!';
    }
    
    return message;
  };

  const calculateRunningScore = async (): Promise<number | undefined> => {
    if (!roundId) return undefined;
    
    try {
      const round = await DatabaseService.getRound(roundId);
      if (round) {
        // Calculate total strokes and par for all holes played (not including current)
        let totalStrokes = 0;
        let totalPar = 0;
        round.holes.forEach(h => {
          // Only count holes that have been scored and are not the current hole
          if (h.strokes > 0 && h.holeNumber !== hole.holeNumber) {
            totalStrokes += h.strokes;
            totalPar += h.par || 4;
          }
        });
        // Return cumulative score to par
        return totalStrokes - totalPar;
      }
    } catch (error) {
      console.error('Error calculating running score:', error);
    }
    return undefined;
  };

  // Update function removed - updates are now sent with each putt
  // const handleUpdate = async () => { ... }

  const sendPuttUpdate = async () => {
    setShowDistanceModal(false);
    
    // Calculate running score up to this point
    const runningScore = await calculateRunningScore();
    const currentHoleScore = shots.length - par; // Score with shots so far
    const totalRunningScore = (runningScore || 0) + currentHoleScore;
    
    // Calculate what the putt is for
    // currentStroke is the stroke number for this putt
    const strokesAfterPutt = currentStroke;
    let puttFor = '';
    if (strokesAfterPutt === par - 2) puttFor = ' for eagle';
    else if (strokesAfterPutt === par - 1) puttFor = ' for birdie';
    else if (strokesAfterPutt === par) puttFor = ' for par';
    else if (strokesAfterPutt === par + 1) puttFor = ' for bogey';
    else if (strokesAfterPutt === par + 2) puttFor = ' for double bogey';
    else if (strokesAfterPutt > par + 2) puttFor = ` for +${strokesAfterPutt - par}`;
    
    // Format distance with "ft" and putt description
    const formattedDistance = getFormattedDistance();
    const distanceMessage = formattedDistance ? `${formattedDistance}${puttFor}` : `Putting${puttFor}`;
    
    // Check if default contact group is configured
    const defaultGroup = await DatabaseService.getPreference('default_sms_group');
    
    try {
      // Send full hole summary with all shots up to this point
      let message = `Hole ${hole.holeNumber} - Par ${par}\n`;
      message += `${distanceMessage}\n`;
      
      // Add shot-by-shot summary if there are shots before the putt
      if (shots.length > 0) {
        message += `\nShots to green:\n`;
        shots.forEach((shot, index) => {
          const shotNum = index + 1;
          const shotTypeLabel = SHOT_TYPES.ROW1.concat(SHOT_TYPES.ROW2).find(t => t.id === shot.type)?.label || shot.type;
          message += `${shotNum}. ${shotTypeLabel}`;
          
          if (shot.results && shot.results.length > 0) {
            const resultDescriptions = shot.results.map(r => {
              const result = SHOT_RESULTS.ROW1.concat(SHOT_RESULTS.ROW2).find(res => res.id === r);
              return result?.label || r;
            });
            message += ` - ${resultDescriptions.join(', ')}`;
          }
          message += '\n';
        });
      }
      
      // Send SMS to default contact group
      const result = await SMSService.sendQuickUpdate(message);
      if (!result.success) {
        console.error('SMS error:', result.errors);
        showToast('Failed to open Messages', 'error');
      } else if (!defaultGroup || defaultGroup.trim() === '') {
        // Alert user if no contacts configured
        showToast('Add recipients in settings for automatic text group', 'info');
      } else if (result.sent) {
        showToast(`Message opened for ${result.groupName}`, 'success');
      }
    } catch (error: any) {
      console.error('Error sending SMS:', error);
      showToast('Error sending message', 'error');
    }

    // Save the putt distance for the current shot
    const puttDistanceValue = distanceToHole || '0';
    setCurrentPuttDistance(`${puttDistanceValue} ft`);
    setDistanceToHole('');
    
    // Enter putting mode instead of shot result selection
    setIsPuttingMode(true);
    setPuttingStrokes(0);
    setCurrentShotType('');  // Clear shot type
    setCurrentShotResults([]);  // Clear shot results
  };

  // Handler for "Missed It" button in putting mode
  const handlePuttMissed = () => {
    // Add a missed putt to shots
    const missedPutt: Shot = {
      stroke: currentStroke,
      type: 'putt',
      results: ['missed'],
      puttDistance: currentPuttDistance,
    };
    
    setShots([...shots, missedPutt]);
    setCurrentStroke(currentStroke + 1);
    setPuttingStrokes(puttingStrokes + 1);
    // Stay in putting mode for next putt
  };
  
  // Handler for "Made It" button in putting mode
  const handlePuttMade = async () => {
    // Add the made putt to shots
    const madePutt: Shot = {
      stroke: currentStroke,
      type: 'putt',
      results: ['target'],  // Use 'target' to indicate made putt
      puttDistance: currentPuttDistance,
    };
    
    const newShots = [...shots, madePutt];
    setShots(newShots);
    
    // Exit putting mode
    setIsPuttingMode(false);
    const totalPutts = puttingStrokes + 1; // Include the made putt
    setPuttingStrokes(0);
    setCurrentPuttDistance('');
    setCurrentStroke(currentStroke + 1);
    
    // Save the hole data
    await autoSave(newShots, par);
    
    // Calculate running score including current hole
    const runningScore = await calculateRunningScore();
    const currentHoleScore = newShots.length - par;
    const totalRunningScore = (runningScore || 0) + currentHoleScore;
    
    // Generate putting-only summary
    const scoreName = (() => {
      const diff = newShots.length - par;
      if (diff <= -3) return 'Albatross! 🦅🦅';
      if (diff === -2) return 'Eagle! 🦅';
      if (diff === -1) return 'Birdie 🐦';
      if (diff === 0) return 'Par ✅';
      if (diff === 1) return 'Bogey';
      if (diff === 2) return 'Double Bogey';
      if (diff === 3) return 'Triple Bogey';
      return `+${diff}`;
    })();
    
    // Check if default contact group is configured
    const defaultGroup = await DatabaseService.getPreference('default_sms_group');
    
    // Automatically send SMS to default contact group
    try {
      let message = `Hole ${hole.holeNumber} - Par ${par}\n`;
      message += `Score: ${newShots.length} (${scoreName})\n`;
      
      // Add running score
      if (totalRunningScore !== undefined) {
        const scoreText = totalRunningScore === 0 ? 'E' : totalRunningScore > 0 ? `+${totalRunningScore}` : `${totalRunningScore}`;
        message += `Running Total: ${scoreText}\n`;
      }
      
      // Add putting summary
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
      
      // Add final result
      if (newShots.length <= par - 1) {
        message += '\n\n🎉 Outstanding play!';
      } else if (newShots.length === par) {
        message += '\n\n⛳ Solid par!';
      }
      
      // Check for media
      const media = await DatabaseService.getMediaForHole(roundId, hole.holeNumber);
      if (media.length > 0) {
        message += `\n\n📸 ${media.length} photo${media.length !== 1 ? 's' : ''} captured`;
      }
      
      // Send SMS to default contact group
      const result = await SMSService.sendQuickUpdate(message);
      if (!result.success) {
        console.error('SMS error:', result.errors);
        showToast('Failed to open Messages', 'error');
      } else if (!defaultGroup || defaultGroup.trim() === '') {
        // Alert user if no contacts configured
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
    // Exit putting mode and clear putting-related state
    setIsPuttingMode(false);
    setPuttingStrokes(0);
    setCurrentPuttDistance('');
    setCurrentShotType('');
    setCurrentShotResults([]);
  };

  const handleSave = async () => {
    // Save the hole data
    await autoSave(shots, par);
    
    // Calculate running score including current hole
    const runningScore = await calculateRunningScore();
    const currentHoleScore = shots.length - par;
    const totalRunningScore = (runningScore || 0) + currentHoleScore;
    
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
              // Generate SMS-specific format for iOS SMS, regular format for other sharing
              const isSMS = Platform.OS === 'ios';
              const description = isSMS 
                ? generateSMSShotDescription(shots, par, totalRunningScore)
                : generateDetailedShotDescription(shots, par);
              
              // Get media for the hole
              const media = await DatabaseService.getMediaForHole(roundId, hole.holeNumber);
              const mediaUrls = media.map(m => m.uri).filter(uri => uri);
              
              // Share using react-native-share
              await Share.open({
                title: `Hole ${hole.holeNumber} - Shot Details`,
                message: description,
                urls: mediaUrls,
              });
              
              navigation.goBack();
            } catch (error: any) {
              // Silently handle user cancellation
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
    // If putt is selected, open distance modal immediately
    if (type === 'Putt') {
      setCurrentShotType(type);
      setCurrentShotResults([]);
      setShowDistanceModal(true);
    } else {
      setCurrentShotType(type);
      setCurrentShotResults([]);
    }
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
    // For putts, distance should already be set from modal
    if (currentShotType === 'Putt' && !currentPuttDistance) {
      // Re-open distance modal if somehow distance wasn't set
      setShowDistanceModal(true);
      return;
    }
    
    if (currentShotResults.length > 0) {
      const newShot: Shot = {
        stroke: currentStroke,
        type: currentShotType,
        results: currentShotResults,
        ...(currentShotType === 'putt' && currentPuttDistance ? { puttDistance: currentPuttDistance } : {})
      };
      setShots([...shots, newShot]);
      setCurrentStroke(currentStroke + 1);
      setCurrentShotType('');
      setCurrentShotResults([]);
      setCurrentPuttDistance('');
      
      // Auto-scroll to show all buttons
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }
  };

  const confirmShot = () => {
    // For putts, distance should already be set from modal
    if (currentShotType === 'Putt' && !currentPuttDistance) {
      // Re-open distance modal if somehow distance wasn't set
      setShowDistanceModal(true);
      return;
    }
    
    if (currentShotResults.length > 0 && currentShotResults.length <= 2) {
      const newShot: Shot = {
        stroke: currentStroke,
        type: currentShotType,
        results: currentShotResults,
        ...(currentShotType === 'putt' && currentPuttDistance ? { puttDistance: currentPuttDistance } : {})
      };
      setShots([...shots, newShot]);
      setCurrentStroke(currentStroke + 1);
      setCurrentShotType('');
      setCurrentShotResults([]);
      setCurrentPuttDistance('');
      
      // Auto-scroll to show all buttons
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }
  };

  // Removed auto-confirm to allow manual confirmation with checkmark

  

  const handleMediaFromLibrary = async () => {
    if (!roundId) {
      Alert.alert('Error', 'Please save the round first before adding media');
      return;
    }

    if (isCapturing) {
      return;
    }

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
      {/* Compact Header with Score */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {/* Empty space to balance header */}
        </View>
        
        <View style={styles.headerCenter}>
          <TouchableOpacity onPress={() => setShowParSelector(true)} style={styles.parButton}>
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

        {/* Putting Mode UI */}
        {isPuttingMode ? (
          <View style={styles.buttonSection}>
            {/* Display putt distance */}
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
            
            {/* Made It / Missed It / Cancel buttons */}
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
        ) : !currentShotType ? (
          // Show Shot Type buttons
          <View style={styles.buttonSection}>
            <View style={styles.buttonRowFour}>
              {SHOT_TYPES.ROW1.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={styles.typeButtonSquare}
                  onPress={() => handleShotTypeSelection(type.label)}
                >
                  {type.iconType === 'material-community' ? (
                    <MaterialCommunityIcons name={type.icon} size={24} color="#333" />
                  ) : (
                    <Icon name={type.icon} size={24} color="#333" />
                  )}
                  <Text style={styles.typeButtonLabel}>
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
                  <Text style={styles.typeButtonLabel}>
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
            
            {/* Only show hazard/lost/OB for shots that are not putts or chips */}
            {currentShotType !== 'Putt' && currentShotType !== 'Chip/Pitch' && (
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
            )}
            
            {/* Putt Distance Display for Putts */}
            {currentShotType === 'Putt' && currentPuttDistance && (
              <View style={styles.puttDistanceSection}>
                <Text style={styles.puttDistanceLabel}>Putt Distance:</Text>
                <View style={styles.puttDistanceDisplay}>
                  <Text style={styles.puttDistanceValue}>{currentPuttDistance}</Text>
                </View>
              </View>
            )}
            
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
                style={[styles.parButton, par === 3 && styles.parButtonActive]}
                onPress={() => {
                  setPar(3);
                  autoSave(shots, 3);
                  setShowParSelector(false);
                }}
              >
                <Text style={[styles.parButtonText, par === 3 && styles.parButtonTextActive]}>Par 3</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.parButton, par === 4 && styles.parButtonActive]}
                onPress={() => {
                  setPar(4);
                  autoSave(shots, 4);
                  setShowParSelector(false);
                }}
              >
                <Text style={[styles.parButtonText, par === 4 && styles.parButtonTextActive]}>Par 4</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.parButton, par === 5 && styles.parButtonActive]}
                onPress={() => {
                  setPar(5);
                  autoSave(shots, 5);
                  setShowParSelector(false);
                }}
              >
                <Text style={[styles.parButtonText, par === 5 && styles.parButtonTextActive]}>Par 5</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Distance to Hole Modal (for Putts) */}
      <Modal
        visible={showDistanceModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowDistanceModal(false);
          if (currentShotType === 'Putt') {
            setCurrentShotType('');
            setDistanceToHole('');
          }
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
              if (currentShotType === 'Putt') {
                setCurrentShotType('');
                setDistanceToHole('');
              }
            }}
          >
            <View style={[styles.parSelectorModal, { marginBottom: 100 }]}>
              <Text style={styles.parSelectorTitle}>
                {currentShotType === 'Putt' ? 'Putt Distance' : 'Distance to Hole'}
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
                    if (currentShotType === 'Putt') {
                      setCurrentShotType('');
                      setDistanceToHole('');
                    }
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

      {/* Update link removed - updates are now sent with each putt */}
      
      {/* Hide FAB save button during putting mode */}
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
  backButton: {
    padding: 5,
  },
  saveIconButton: {
    padding: 5,
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
    fontSize: 9,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginTop: 3,
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
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
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
  puttDistanceSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  puttDistanceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  puttDistanceDisplay: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignSelf: 'center',
  },
  puttDistanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  puttDistanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
  },
  puttDistanceButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  puttDistanceButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  puttDistanceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  puttDistanceSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  puttDistanceTextActive: {
    color: '#fff',
  },
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
  headerLeft: {
    width: 40,  // Same width as media buttons to keep center balanced
  },
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
  fabUpdate: {
    bottom: 110,
    backgroundColor: '#2196F3',
    width: 100,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  fabText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
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
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  modalButtonCancel: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modalButtonSend: {
    backgroundColor: '#4CAF50',
  },
  modalButtonCancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonSendText: {
    color: '#fff',
    fontSize: 16,
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
  updateLink: {
    position: 'absolute',
    bottom: 110,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 15,
    gap: 6,
  },
  updateLinkText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
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
});

export default ShotTrackingScreen;