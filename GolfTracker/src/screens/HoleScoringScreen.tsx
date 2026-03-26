/**
 * HoleScoringScreen.tsx
 *
 * Unified scoring screen — one screen for every shot, tee through putt.
 * The compass is always the starting point. Progressive disclosure
 * shows classification only when needed.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as SMS from 'expo-sms';
import { useRoundStore } from '../stores/roundStore';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ErrorScreen } from '../components/common/ErrorScreen';
import { database } from '../database/watermelon/database';
import Hole from '../database/watermelon/models/Hole';
import Round from '../database/watermelon/models/Round';
import Golfer from '../database/watermelon/models/Golfer';
import {
  SHOT_TYPES,
} from '../types';
import type { TrackedShot, ShotData, SmsContact, ShotType, ShotResult } from '../types';
import { parseShotData, deriveHoleStats, calculateTotalStrokes, calculateRunningRoundStats } from '../utils/roundStats';
import { getScoreName } from '../utils/scoreColors';
import { formatScoreVsPar } from '../utils/scoreCalculations';
import smsService from '../services/sms';
import MediaService from '../services/media';
import { generateHoleCommentary } from '../utils/holeCommentary';
import type { ScoringStackParamList } from '../types/navigation';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';

import { useScoringReducer } from '../hooks/useScoringReducer';
import type { CenterResult, Classification } from '../hooks/useScoringReducer';
import { ShotCompass } from '../components/scoring/ShotCompass';
import { ClassificationPanel } from '../components/scoring/ClassificationPanel';
import { CommitDescribeBar } from '../components/scoring/CommitDescribeBar';
import { DistanceKeypad } from '../components/scoring/DistanceKeypad';
import { ShotLogBar, buildShotSummary } from '../components/scoring/ShotLogBar';
import { SMSBottomSheet } from '../components/scoring/SMSBottomSheet';
import { SCORING_COLORS } from '../components/scoring/colors';

type NavProp = StackNavigationProp<ScoringStackParamList, 'HoleScoring'>;
type RoutePropT = RouteProp<ScoringStackParamList, 'HoleScoring'>;

const SHOT_TYPE_CYCLE: ShotType[] = [SHOT_TYPES.TEE_SHOT, SHOT_TYPES.APPROACH, SHOT_TYPES.PUTT];

// ── Component ────────────────────────────────────────────────────

const HoleScoringScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropT>();
  const { holeId, roundId } = route.params || {};
  const { updateHole } = useRoundStore();

  // Data loading
  const [hole, setHole] = useState<Hole | null>(null);
  const [golfer, setGolfer] = useState<Golfer | null>(null);
  const [roundScoreToPar, setRoundScoreToPar] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  // SMS state
  const [recipients, setRecipients] = useState<SmsContact[]>([]);
  const [smsVisible, setSmsVisible] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');
  const [smsCallback, setSmsCallback] = useState<(() => void) | null>(null);

  // Media
  const [isCapturing, setIsCapturing] = useState(false);
  const capturingRef = useRef(false);

  // Retry
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);
  const persistGeneration = useRef(0);
  const MAX_RETRIES = 3;
  const prevHoleStrokes = useRef(0);
  const completingRef = useRef(false);

  // The reducer — all scoring state lives here
  const {
    state: scoringState,
    dispatch,
    activeShotType,
    statusLabel,
    canCommit,
    canUndo,
    restore,
  } = useScoringReducer(hole?.par ?? 4);

  // Stable dispatch callbacks — dispatch identity never changes (React guarantee)
  const handleDirection = useCallback(
    (d: ShotResult) => dispatch({ type: 'TAP_DIRECTION', direction: d }),
    [dispatch],
  );
  const handleCenter = useCallback(
    (r: CenterResult) => dispatch({ type: 'TAP_CENTER', result: r }),
    [dispatch],
  );
  const handleClassify = useCallback(
    (c: Classification) => dispatch({ type: 'TAP_CLASSIFICATION', classification: c }),
    [dispatch],
  );
  const handleDescribe = useCallback(
    () => dispatch({ type: 'DESCRIBE' }),
    [dispatch],
  );
  const handleCommitClassification = useCallback(
    () => dispatch({ type: 'COMMIT' }),
    [dispatch],
  );

  // Clean up retry timer on unmount
  useEffect(() => {
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []);

  // ── Load hole data ──────────────────────────────────────────

  useEffect(() => {
    const loadData = async () => {
      if (!holeId || !roundId) {
        setError(new Error('Missing hole or round ID'));
        setLoading(false);
        return;
      }
      try {
        const h = await database.collections.get<Hole>('holes').find(holeId);
        setHole(h);

        // Restore existing shot data
        const existing = parseShotData(h.shotData);
        if (existing && existing.shots.length > 0) {
          restore(existing.shots, existing.currentStroke || existing.shots.length + 1, h.par);
        } else {
          // Ensure reducer has correct par even with no shots to restore
          restore([], 1, h.par);
        }

        // Load golfer + round score
        const r = await database.collections.get<Round>('rounds').find(roundId);
        if (r.golferId) {
          try {
            const g = await database.collections.get<Golfer>('golfers').find(r.golferId);
            setGolfer(g);
          } catch {
            // Golfer may have been deleted
          }
        }
        const allHoles = await r.holes.fetch();
        const playedHoles = allHoles.filter(rh => rh.strokes > 0);
        const totalScore = playedHoles.reduce((sum, rh) => sum + rh.strokes, 0);
        const playedPar = playedHoles.reduce((sum, rh) => sum + rh.par, 0);
        setRoundScoreToPar(totalScore - playedPar);
        prevHoleStrokes.current = h.strokes;

        // Load SMS recipients
        const contacts = await smsService.getRecipientsForRound(roundId);
        setRecipients(contacts);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [holeId, roundId, restore]);

  // ── Persistence ─────────────────────────────────────────────

  const persistShots = useCallback(async (updatedShots: TrackedShot[], nextStroke: number) => {
    if (!hole || !roundId) return;

    // Bump generation so any in-flight retries from prior calls bail out
    const gen = ++persistGeneration.current;

    try {
      const shotData: ShotData = { par: hole.par, shots: updatedShots, currentStroke: nextStroke };
      const stats = updatedShots.length > 0 ? deriveHoleStats(shotData, hole.par) : null;
      const strokes = calculateTotalStrokes(updatedShots);

      await updateHole(roundId, {
        holeNumber: hole.holeNumber,
        par: hole.par,
        strokes,
        fairwayHit: stats?.fairwayHit,
        greenInRegulation: stats?.greenInRegulation,
        putts: stats?.puttsCount,
        shotData: JSON.stringify(shotData),
      });

      // Only update state if this is still the latest persist
      if (gen !== persistGeneration.current) return;
      setSaveError(false);
      retryCount.current = 0;
      prevHoleStrokes.current = strokes;
    } catch {
      // Only retry if this is still the latest persist
      if (gen !== persistGeneration.current) return;
      setSaveError(true);
      if (retryCount.current < MAX_RETRIES) {
        retryCount.current += 1;
        if (retryTimer.current) clearTimeout(retryTimer.current);
        retryTimer.current = setTimeout(() => {
          if (gen !== persistGeneration.current) return;
          persistShots(updatedShots, nextStroke);
        }, 2000);
      }
    }
  }, [hole, roundId, updateHole]);

  // Persist whenever shots change (after commits/undos, including undo-to-zero)
  const prevShotsRef = useRef<TrackedShot[]>([]);
  const hasEverPersistedRef = useRef(false);
  useEffect(() => {
    // Skip if hole-complete — that phase has its own persist in the completion effect
    if (scoringState.phase === 'hole_complete') return;
    if (scoringState.shots !== prevShotsRef.current) {
      // Skip initial mount (no shots yet, nothing to persist)
      if (!hasEverPersistedRef.current && scoringState.shots.length === 0) return;
      prevShotsRef.current = scoringState.shots;
      hasEverPersistedRef.current = true;
      persistShots(scoringState.shots, scoringState.currentStroke);
    }
  }, [scoringState.phase, scoringState.shots, scoringState.currentStroke, persistShots]);

  // ── SMS helpers ─────────────────────────────────────────────

  const openSMS = useCallback(async (message: string) => {
    const phoneNumbers = recipients.map(c => c.phoneNumber).filter(Boolean);
    if (phoneNumbers.length === 0) {
      Alert.alert('No Recipients', 'Configure SMS recipients in Manage Golfers.');
      return;
    }
    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      await SMS.sendSMSAsync(phoneNumbers, message);
    } else {
      Alert.alert('SMS Unavailable', 'SMS is not available on this device.');
    }
  }, [recipients]);

  const showSmsSheet = useCallback((message: string, onDone?: () => void) => {
    setSmsMessage(message);
    setSmsCallback(() => onDone ?? null);
    setSmsVisible(true);
  }, []);

  const handleSmsSend = useCallback(async () => {
    setSmsVisible(false);
    try {
      await openSMS(smsMessage);
    } catch {
      // SMS send failed — don't block the flow
    } finally {
      smsCallback?.();
    }
  }, [smsMessage, openSMS, smsCallback]);

  const handleSmsSkip = useCallback(() => {
    setSmsVisible(false);
    smsCallback?.();
  }, [smsCallback]);

  // ── "Update" button — status SMS at any time ────────────────

  const handleUpdate = useCallback(() => {
    if (!hole) return;
    const summary = buildShotSummary(scoringState.shots, hole.par);
    const strokes = calculateTotalStrokes(scoringState.shots);
    const scoreVsPar = strokes - hole.par;
    const scoreName = getScoreName(scoreVsPar);
    const commentary = generateHoleCommentary(hole.holeNumber, hole.par, strokes, scoreName);
    const message = `Hole ${hole.holeNumber} Update\n${summary}\n\n${commentary}`;
    showSmsSheet(message);
  }, [hole, scoringState.shots, showSmsSheet]);

  // ── Hole complete flow ──────────────────────────────────────

  useEffect(() => {
    if (scoringState.phase !== 'hole_complete' || !hole || !roundId) return;
    if (completingRef.current) return;
    completingRef.current = true;

    const completeHole = async () => {
      setSaving(true);
      try {
        const shotData: ShotData = { par: hole.par, shots: scoringState.shots, currentStroke: scoringState.currentStroke };
        const stats = deriveHoleStats(shotData, hole.par);
        const strokes = calculateTotalStrokes(scoringState.shots);

        await updateHole(roundId, {
          holeNumber: hole.holeNumber,
          par: hole.par,
          strokes,
          fairwayHit: stats?.fairwayHit,
          greenInRegulation: stats?.greenInRegulation,
          putts: stats?.puttsCount,
          shotData: JSON.stringify(shotData),
        });

        // Update round score
        const prior = prevHoleStrokes.current;
        const parDelta = prior === 0 ? hole.par : 0;
        setRoundScoreToPar(prev => prev + (strokes - prior) - parDelta);

        // Build summary SMS
        const finalScoreVsPar = strokes - hole.par;
        const finalScoreName = getScoreName(finalScoreVsPar);
        const runningStats = await calculateRunningRoundStats(roundId);
        const holesPlayed = runningStats.totalHolesPlayed;
        const totalScoreVsPar = await calculateTotalScoreVsPar(roundId);

        const summaryMsg = `Hole ${hole.holeNumber} Complete!\n` +
          `Score: ${strokes} (${finalScoreName})\n` +
          `${formatScoreVsPar(finalScoreVsPar)} on the hole\n` +
          `\nAfter ${holesPlayed} holes: ${formatScoreVsPar(totalScoreVsPar)}`;

        showSmsSheet(summaryMsg, () => {
          navigation.navigate('RoundTracker', { roundId });
        });
      } catch {
        completingRef.current = false;
        Alert.alert('Error', 'Failed to save hole. Please try again.');
      } finally {
        setSaving(false);
      }
    };

    completeHole();
  }, [scoringState.phase, scoringState.shots, scoringState.currentStroke, hole, roundId, updateHole, navigation, showSmsSheet]);

  // ── "In The Hole" confirmation ──────────────────────────────

  const handleCommitOrConfirm = useCallback(() => {
    if (scoringState.pendingCenterResult === 'hole') {
      const strokes = calculateTotalStrokes(scoringState.shots) + 1;
      Alert.alert(
        'Finish Hole?',
        `End hole with score ${strokes}?`,
        [
          { text: 'Cancel', onPress: () => dispatch({ type: 'CANCEL_HOLE_COMPLETE' }) },
          { text: 'Yes', onPress: () => dispatch({ type: 'CONFIRM_HOLE_COMPLETE' }) },
        ],
      );
    } else {
      dispatch({ type: 'COMMIT' });
    }
  }, [scoringState.pendingCenterResult, scoringState.shots, dispatch]);

  // ── Shot type cycle ─────────────────────────────────────────

  const handleShotTypeCycle = useCallback(() => {
    const current = activeShotType;
    const idx = SHOT_TYPE_CYCLE.indexOf(current);
    const next = SHOT_TYPE_CYCLE[(idx + 1) % SHOT_TYPE_CYCLE.length];
    dispatch({ type: 'OVERRIDE_SHOT_TYPE', shotType: next });
  }, [activeShotType, dispatch]);

  // ── Back navigation ─────────────────────────────────────────

  const allowLeaveRef = useRef(false);

  const handleBack = useCallback(() => {
    if (scoringState.shots.length > 0) {
      Alert.alert(
        'Leave Hole?',
        'Your shots are saved. You can come back to continue.',
        [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'Leave',
            onPress: () => {
              allowLeaveRef.current = true;
              navigation.goBack();
            },
          },
        ],
      );
    } else {
      allowLeaveRef.current = true;
      navigation.goBack();
    }
  }, [scoringState.shots.length, navigation]);

  // Wire Android back button
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (allowLeaveRef.current) return; // allow navigation through
      if (scoringState.shots.length === 0) return;
      e.preventDefault();
      handleBack();
    });
    return unsubscribe;
  }, [navigation, scoringState.shots.length, handleBack]);

  // ── Media ───────────────────────────────────────────────────

  const handleMediaFromLibrary = useCallback(async () => {
    if (capturingRef.current || !hole || !roundId) return;
    capturingRef.current = true;
    setIsCapturing(true);
    try {
      const media = await MediaService.selectFromLibrary('mixed');
      if (media) {
        await MediaService.saveMedia(media, roundId, hole.holeNumber);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to select media from library';
      Alert.alert('Error', message);
    } finally {
      capturingRef.current = false;
      setIsCapturing(false);
    }
  }, [hole, roundId]);

  // ── Loading / Error ─────────────────────────────────────────

  if (loading) return <LoadingScreen message="Loading hole..." />;
  if (error || !hole) {
    return <ErrorScreen error={error || new Error('Hole not found')} onRetry={() => navigation.goBack()} />;
  }

  const totalStrokes = calculateTotalStrokes(scoringState.shots);

  // ── Render ──────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Save error banner */}
      {saveError && (
        <View style={styles.saveErrorBanner} accessibilityRole="alert">
          <Icon name="warning" size={16} color="#fff" />
          <Text style={styles.saveErrorText}>Save failed — retrying...</Text>
        </View>
      )}

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Hole {hole.holeNumber}</Text>
          <Text style={styles.headerSub}>Par {hole.par}</Text>
        </View>

        <TouchableOpacity
          style={[styles.headerBtn, !canUndo && styles.hiddenBtn]}
          onPress={() => dispatch({ type: 'UNDO' })}
          disabled={!canUndo}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Undo last action"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canUndo }}
          accessibilityElementsHidden={!canUndo}
          importantForAccessibility={canUndo ? 'auto' : 'no-hide-descendants'}
        >
          <Icon name="undo" size={22} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleMediaFromLibrary}
          disabled={isCapturing}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Select media from library"
          accessibilityRole="button"
          accessibilityState={{ disabled: isCapturing }}
        >
          <Ionicons name="images" size={22} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleUpdate}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Send status update"
          accessibilityHint="Send an SMS with the current hole status"
          accessibilityRole="button"
        >
          <Icon name="textsms" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.scoreColumn}>
          <View style={styles.roundScoreBadge} accessibilityLabel={`Round score: ${formatScoreVsPar(roundScoreToPar)}`}>
            <Text style={styles.roundScoreValue}>{formatScoreVsPar(roundScoreToPar)}</Text>
            <Text style={styles.roundScoreLabel}>round</Text>
          </View>
          {golfer && (
            <View style={styles.golferTag} accessibilityLabel={`Golfer: ${golfer.name}`}>
              <View style={[styles.golferDot, { backgroundColor: golfer.color }]} />
              <Text style={styles.golferName} numberOfLines={1}>{golfer.name}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Shot log */}
      <ShotLogBar shots={scoringState.shots} />

      {/* Main content */}
      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={[styles.bodyContent, { paddingBottom: Math.max(insets.bottom, 20) }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Status label + shot type */}
        <View style={styles.statusRow}>
          <TouchableOpacity
            onPress={handleShotTypeCycle}
            accessibilityLabel={`Shot type: ${activeShotType}. Tap to change.`}
            accessibilityHint="Cycle through Tee Shot, Approach, and Putt"
            accessibilityRole="button"
          >
            <Text style={styles.shotTypeLabel}>
              {activeShotType} <Icon name="expand-more" size={14} color="#555" />
            </Text>
          </TouchableOpacity>
          <Text style={styles.statusLabel} accessibilityLiveRegion="polite">{statusLabel}</Text>
          {totalStrokes > 0 && (
            <Text style={styles.strokeCount}>Strokes: {totalStrokes}</Text>
          )}
        </View>

        {/* Phase-dependent content */}
        {scoringState.phase === 'awaiting_direction' && (
          <ShotCompass
            isOnGreen={scoringState.isOnGreen}
            onDirection={handleDirection}
            onCenter={handleCenter}
          />
        )}

        {scoringState.phase === 'awaiting_action' && (
          <View style={styles.actionPhase}>
            <ShotCompass
              isOnGreen={scoringState.isOnGreen}
              onDirection={handleDirection}
              onCenter={handleCenter}
              disabled
            />
            <CommitDescribeBar
              onCommit={handleCommitOrConfirm}
              onDescribe={handleDescribe}
              canCommit={canCommit}
              showDescribe={scoringState.pendingCenterResult !== 'hole'}
            />
          </View>
        )}

        {scoringState.phase === 'awaiting_classification' && (
          <View style={styles.classificationPhase}>
            <ShotCompass
              isOnGreen={scoringState.isOnGreen}
              onDirection={handleDirection}
              onCenter={handleCenter}
              disabled
            />
            <ClassificationPanel
              isOnGreen={scoringState.isOnGreen}
              selected={scoringState.pendingClassification}
              onClassify={handleClassify}
            />
            <CommitDescribeBar
              onCommit={handleCommitClassification}
              canCommit={canCommit}
              showDescribe={false}
              commitLabel="Commit"
            />
          </View>
        )}

        {scoringState.phase === 'awaiting_putt_distance' && (
          <DistanceKeypad
            unit="ft"
            contextLabel="On the Green"
            onSubmit={(v) => dispatch({ type: 'SUBMIT_DISTANCE', value: v })}
            onSkip={() => dispatch({ type: 'SKIP_DISTANCE' })}
          />
        )}

        {scoringState.phase === 'hole_complete' && saving && (
          <View style={styles.savingContainer} accessibilityRole="alert" accessibilityLiveRegion="assertive">
            <ActivityIndicator size="large" color="#2E7D32" />
            <Text style={styles.savingText}>Saving hole...</Text>
          </View>
        )}
      </ScrollView>

      {/* SMS Bottom Sheet */}
      <SMSBottomSheet
        visible={smsVisible}
        message={smsMessage}
        recipients={recipients}
        onSend={handleSmsSend}
        onSkip={handleSmsSkip}
      />
    </KeyboardAvoidingView>
  );
};

// ── Helpers ─────────────────────────────────────────────────────

async function calculateTotalScoreVsPar(roundId: string): Promise<number> {
  try {
    const round = await database.collections.get<Round>('rounds').find(roundId);
    const holes: Hole[] = await round.holes.fetch();
    const played = holes.filter(h => h.strokes > 0);
    const totalStrokes = played.reduce((sum, h) => sum + h.strokes, 0);
    const totalPar = played.reduce((sum, h) => sum + h.par, 0);
    return totalStrokes - totalPar;
  } catch {
    return 0;
  }
}

// ── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SCORING_COLORS.bg },

  saveErrorBanner: {
    backgroundColor: '#d32f2f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  saveErrorText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Header
  header: {
    backgroundColor: SCORING_COLORS.green,
    paddingBottom: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtn: {
    padding: 8,
    marginRight: 4,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hiddenBtn: { opacity: 0 },
  headerCenter: { flex: 1, marginLeft: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: SCORING_COLORS.white },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 1 },
  scoreColumn: { alignItems: 'center', gap: 4 },
  roundScoreBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'center',
  },
  roundScoreValue: { fontSize: 18, fontWeight: 'bold', color: SCORING_COLORS.white },
  roundScoreLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)' },
  golferTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  golferDot: { width: 8, height: 8, borderRadius: 4 },
  golferName: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    maxWidth: 70,
  },

  // Body
  scrollBody: { flex: 1 },
  bodyContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },

  // Status
  statusRow: { alignItems: 'center', marginBottom: 20 },
  shotTypeLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
  },
  statusLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  strokeCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },

  // Phase wrappers
  actionPhase: { alignItems: 'center' },
  classificationPhase: { alignItems: 'center' },

  // Saving
  savingContainer: { alignItems: 'center', paddingVertical: 40 },
  savingText: { fontSize: 18, color: '#666' },
});

export default HoleScoringScreen;
