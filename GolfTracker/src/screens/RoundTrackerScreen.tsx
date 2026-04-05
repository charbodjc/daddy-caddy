/**
 * RoundTrackerScreen.tsx
 * 
 * Complete rewrite of RoundTrackerScreen (was 860 lines → now ~250 lines)
 * 
 * Key improvements:
 * - Uses useRound hook for data
 * - Uses useRoundStore for actions
 * - Uses reusable components (HoleGrid, RoundHeader, Button)
 * - Separated concerns (no business logic in UI)
 * - Optimized re-renders
 * - Clean, maintainable code
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, DrawerActions } from '@react-navigation/native';
import { AppNavigationProp } from '../types/navigation';
import { useRound } from '../hooks/useRound';
import { useRoundStore, getUnfinishedRoundSummary } from '../stores/roundStore';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ErrorScreen } from '../components/common/ErrorScreen';
import { RoundHeader } from '../components/round/RoundHeader';
import { Button } from '../components/common/Button';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Hole from '../database/watermelon/models/Hole';
import { useObservable } from '../hooks/useObservable';
import { HoleCard } from '../components/round/HoleCard';
import { GolferPicker } from '../components/golfer/GolferPicker';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { useGolfers } from '../hooks/useGolfers';
import { resetCommentaryHistory } from '../utils/holeCommentary';
import { useWatchScoringBridge } from '../hooks/useWatchScoringBridge';

interface RouteParams {
  roundId?: string;
  tournamentId?: string;
  tournamentName?: string;
  quickStart?: boolean;
}

const RoundTrackerScreen: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute();
  const params = (route.params as RouteParams) || {};

  const { round, loading, error } = useRound(params.roundId);
  const createRound = useRoundStore((s) => s.createRound);
  const updateHole = useRoundStore((s) => s.updateHole);
  const finishRound = useRoundStore((s) => s.finishRound);
  const deleteRound = useRoundStore((s) => s.deleteRound);
  const { golfers, activeGolferId, loading: golfersLoading, createGolfer } = useGolfers();
  const [selectedGolferId, setSelectedGolferId] = useState<string | null>(null);

  // Initialize selected golfer to active golfer
  useEffect(() => {
    if (!selectedGolferId && activeGolferId) {
      setSelectedGolferId(activeGolferId);
    }
  }, [activeGolferId, selectedGolferId]);

  // Observe holes reactively — UI updates automatically on DB changes.
  // Depend on round?.id (not round) to avoid creating a new Observable
  // when loadActiveRound() returns a new Round object with the same ID.
  const roundId = round?.id;
  const holesObservable = useMemo(
    () => round?.holes.observe(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stabilize on ID, not object reference
    [roundId],
  );
  const rawHoles = useObservable<Hole[]>(holesObservable);
  const holes = useMemo(
    () => (rawHoles ? [...rawHoles].sort((a, b) => a.holeNumber - b.holeNumber) : []),
    [rawHoles],
  );

  // Watch scoring bridge — processes watch events when HoleScoringScreen is not mounted
  const watchHoles = useMemo(
    () => holes.map(h => ({ number: h.holeNumber, par: h.par, strokes: h.strokes, holeId: h.id })),
    [holes],
  );
  const handleWatchNavigate = useCallback(
    (holeNumber: number, holeId: string) => {
      if (!round) return;
      navigation.navigate('HoleScoring', { holeId, roundId: round.id });
    },
    [round, navigation],
  );
  useWatchScoringBridge({
    roundId: round?.id,
    courseName: round?.courseName,
    holes: watchHoles,
    onNavigateToHole: handleWatchNavigate,
  });

  // Auto-navigate to the current hole when arriving via deep link (Live Activity tap).
  // The ref prevents re-triggering when navigating back from HoleScoringScreen.
  const autoNavigatedForRound = useRef<string | null>(null);
  useEffect(() => {
    if (!params.roundId || !round || !holes.length) return;
    if (autoNavigatedForRound.current === round.id) return;

    const lastPlayedHole = holes
      .filter(h => h.strokes > 0)
      .sort((a, b) => b.holeNumber - a.holeNumber)[0];

    if (!lastPlayedHole) return; // No holes scored yet — stay on the grid

    autoNavigatedForRound.current = round.id;
    navigation.navigate('HoleScoring', {
      holeId: lastPlayedHole.id,
      roundId: round.id,
    });
  }, [params.roundId, round, holes, navigation]);

  const [setupVisible, setSetupVisible] = useState(!params.roundId && !round);
  const [courseName, setCourseName] = useState('');
  const [parModalVisible, setParModalVisible] = useState(false);
  const [selectedHole, setSelectedHole] = useState<Hole | null>(null);
  const [saving, setSaving] = useState(false);

  // Show setup modal if no active round
  useEffect(() => {
    setSetupVisible(!params.roundId && !round);
  }, [params.roundId, round]);
  
  const startRoundAfterConfirmation = async () => {
    setSaving(true);
    try {
      resetCommentaryHistory();
      await createRound({
        courseName: courseName.trim(),
        golferId: selectedGolferId || undefined,
        tournamentId: params.tournamentId,
        tournamentName: params.tournamentName,
      });
      setSetupVisible(false);
      setCourseName('');
    } catch (_err) {
      Alert.alert('Error', 'Failed to start round');
    } finally {
      setSaving(false);
    }
  };

  const handleStartRound = async () => {
    if (!courseName.trim()) {
      Alert.alert('Error', 'Please enter a course name');
      return;
    }

    const golferId = selectedGolferId || activeGolferId;
    if (!golferId) {
      await startRoundAfterConfirmation();
      return;
    }

    // Check if this golfer has an unfinished round with data
    const existing = await getUnfinishedRoundSummary(golferId);
    if (!existing) {
      await startRoundAfterConfirmation();
      return;
    }

    const scoreDiff = existing.totalScore - existing.playedPar;
    const scoreStr = scoreDiff === 0 ? 'E' : scoreDiff > 0 ? `+${scoreDiff}` : `${scoreDiff}`;

    Alert.alert(
      'Round In Progress',
      `There's an active round at ${existing.courseName} with ${existing.holesPlayed} of 18 holes played (${scoreStr}). Finish that round and start a new one?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish & Start New',
          onPress: () => startRoundAfterConfirmation(),
        },
      ],
    );
  };
  
  const handleHolePress = async (hole: Hole) => {
    setSelectedHole(hole);
    
    // If hole not played yet, show par selection first
    if (hole.strokes === 0) {
      setParModalVisible(true);
    } else {
      // Navigate to shot tracking
      navigateToShotTracking(hole);
    }
  };
  
  const handleParSelect = async (par: number) => {
    setParModalVisible(false);

    if (selectedHole && round) {
      try {
        await updateHole(round.id, {
          holeNumber: selectedHole.holeNumber,
          par,
          strokes: 0,
        });
        navigateToShotTracking({ id: selectedHole.id, par });
      } catch {
        Alert.alert('Error', 'Failed to update hole par');
      }
    }
  };
  
  const navigateToShotTracking = (hole: { id: string; par: number }) => {
    navigation.navigate('HoleScoring', {
      holeId: hole.id,
      roundId: round?.id,
    } );
  };
  
  const handleFinishRound = () => {
    if (!round) return;
    const targetId = round.id;
    const holesPlayed = holes.filter((h) => h.strokes > 0).length;

    const message = holesPlayed === 18
      ? `Finish your round at ${round.courseName}?`
      : `Finish round at ${round.courseName}? You've played ${holesPlayed} of 18 holes.`;

    Alert.alert(
      'Finish Round?',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          onPress: async () => {
            try {
              await finishRound(targetId);
              navigation.navigate('RoundSummary', { roundId: targetId });
            } catch (_err) {
              Alert.alert('Error', 'Failed to finish round');
            }
          },
        },
      ],
    );
  };

  const handleDeleteRound = () => {
    if (!round) return;
    const targetId = round.id;
    const holesPlayed = holes.filter((h) => h.strokes > 0).length;

    const scoreInfo = holesPlayed > 0 && playedPar !== undefined
      ? (() => {
          const diff = (liveScore ?? 0) - playedPar;
          const scoreStr = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`;
          return ` You've played ${holesPlayed} hole${holesPlayed === 1 ? '' : 's'} (${scoreStr}).`;
        })()
      : '';

    Alert.alert(
      'Delete Round?',
      `Delete round at ${round.courseName}?${scoreInfo} This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRound(targetId);
              navigation.goBack();
            } catch (_err) {
              Alert.alert('Error', 'Failed to delete round');
            }
          },
        },
      ],
    );
  };
  
  const handleViewSummary = () => {
    if (!round) return;
    
    navigation.navigate('RoundSummary', {
      roundId: round.id,
    } );
  };
  
  // Derive score and par from the reactively observed holes
  // (round.totalScore may be stale due to WatermelonDB's record cache + Zustand ref equality)
  const { playedPar, liveScore } = useMemo(() => {
    const played = holes.filter(h => h.strokes > 0);
    const parSum = played.reduce((s, h) => s + (h.par || 0), 0);
    const scoreSum = played.reduce((s, h) => s + h.strokes, 0);
    return {
      playedPar: parSum > 0 ? parSum : undefined,
      liveScore: scoreSum > 0 ? scoreSum : undefined,
    };
  }, [holes]);

  const roundGolfer = useMemo(() => golfers.find((g) => g.id === round?.golferId), [golfers, round?.golferId]);

  if (loading) {
    return <LoadingScreen message="Loading round..." />;
  }

  if (error) {
    return (
      <ErrorScreen
        error={error}
        onRetry={() => useRoundStore.getState().loadActiveRound()}
      />
    );
  }
  
  // Setup screen for new round
  if (setupVisible || !round) {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScreenHeader title="New Round" leftAction="menu" />
          <View style={styles.setupContainer}>
            <Text style={styles.setupTitle}>New Round Setup</Text>

            {params.tournamentName && (
              <View style={styles.tournamentBadge}>
                <Icon name="emoji-events" size={20} color="#2E7D32" />
                <Text style={styles.tournamentText}>{params.tournamentName}</Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>Golfer</Text>
            <GolferPicker
              golfers={golfers}
              selectedGolferId={selectedGolferId}
              onSelectGolfer={setSelectedGolferId}
              onCreateGolfer={async (name) => { await createGolfer({ name }); }}
              loading={golfersLoading}
            />

            <Text style={[styles.fieldLabel, styles.courseLabel]}>Course</Text>
            <TextInput
              style={styles.input}
              placeholder="Course Name"
              value={courseName}
              onChangeText={setCourseName}
              autoCapitalize="words"
              autoFocus
              accessibilityLabel="Course name"
              returnKeyType="done"
              onSubmitEditing={handleStartRound}
            />

            <Button
              title="Start Round"
              onPress={handleStartRound}
              loading={saving}
              style={styles.startButton}
            />
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    );
  }
  
  // Main round tracking screen
  return (
    <View style={styles.container}>
      {/* Header with score */}
      <RoundHeader
        round={round}
        totalPar={playedPar}
        totalScore={liveScore}
        golferName={roundGolfer?.name}
        golferColor={roundGolfer?.color}
        golferEmoji={roundGolfer?.emoji}
        golferAvatarUri={roundGolfer?.avatarUri}
        onMenuPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
      />
      
      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionButton} onPress={handleViewSummary} accessibilityLabel="View round summary" accessibilityRole="button">
          <Icon name="bar-chart" size={20} color="#2E7D32" />
          <Text style={styles.actionText}>Summary</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleFinishRound} accessibilityLabel="Finish round" accessibilityRole="button">
          <Icon name="check-circle" size={20} color="#2E7D32" />
          <Text style={styles.actionText}>Finish</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleDeleteRound} accessibilityLabel="Delete round" accessibilityRole="button">
          <Icon name="delete" size={20} color="#f44336" />
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
      
      {/* Hole Grid - using .map() instead of HoleGrid/FlatList to avoid nested scrolling */}
      <ScrollView style={styles.content} accessibilityRole="list" accessibilityLabel="Hole scores">
        <View style={styles.holeGrid}>
          {holes.map((hole) => (
            <HoleCard
              key={`hole-${hole.holeNumber}`}
              holeNumber={hole.holeNumber}
              par={hole.par}
              strokes={hole.strokes}
              onPress={() => handleHolePress(hole)}
            />
          ))}
          {/* Invisible spacers to keep last row left-aligned with space-between */}
          {Array.from({ length: (4 - (holes.length % 4)) % 4 }, (_, i) => (
            <View key={`spacer-${i}`} style={styles.holeSpacer} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
          ))}
        </View>
      </ScrollView>
      
      {/* Par Selection Modal */}
      <Modal
        visible={parModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setParModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.parModal} accessibilityViewIsModal>
            <Text style={styles.parModalTitle}>
              Select Par for Hole {selectedHole?.holeNumber}
            </Text>
            
            <View style={styles.parButtons}>
              <TouchableOpacity
                style={styles.parButton}
                onPress={() => handleParSelect(3)}
                accessibilityRole="button"
                accessibilityLabel="Par 3"
              >
                <Text style={styles.parButtonText}>Par 3</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.parButton}
                onPress={() => handleParSelect(4)}
                accessibilityRole="button"
                accessibilityLabel="Par 4"
              >
                <Text style={styles.parButtonText}>Par 4</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.parButton}
                onPress={() => handleParSelect(5)}
                accessibilityRole="button"
                accessibilityLabel="Par 5"
              >
                <Text style={styles.parButtonText}>Par 5</Text>
              </TouchableOpacity>
            </View>
            
            <Button
              title="Cancel"
              onPress={() => setParModalVisible(false)}
              variant="secondary"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  setupContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  setupTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
  },
  tournamentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
    backgroundColor: '#f0f9f0',
    padding: 12,
    borderRadius: 8,
  },
  tournamentText: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase' as const,
    marginBottom: 8,
  },
  courseLabel: {
    marginTop: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  startButton: {
    marginTop: 10,
  },
  actionBar: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  holeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 15,
  },
  holeSpacer: {
    width: '22%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  parModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  parModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
  },
  parButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  parButton: {
    flex: 1,
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  parButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default RoundTrackerScreen;

