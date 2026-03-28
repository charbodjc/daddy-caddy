/**
 * HoleScoringScreen.tsx
 *
 * Telephone-style scoring screen — two steps per shot:
 *   1. Distance (with presets + skip) + lie badge + swing toggle
 *   2. Result (compass off-green, putt result on-green)
 * Progressive disclosure shows classification only for off-green misses.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
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
  isShotDataV2, LIE_TYPES, PENALTY_TYPES,
} from '../types';
import type { TrackedShotV2, ShotDataV2, SmsContact, LieType, MissDirection, PenaltyType } from '../types';
import { parseShotData, deriveHoleStatsV2, calculateRunningRoundStats } from '../utils/roundStats';
import { calculateTotalStrokesV2 } from '../utils/shotDataV2Helpers';
import { getScoreName } from '../utils/scoreColors';
import { formatScoreVsPar } from '../utils/scoreCalculations';
import smsService from '../services/sms';
import MediaService from '../services/media';
import type { ScoringStackParamList } from '../types/navigation';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';

import { useScoringReducerV2 } from '../hooks/useScoringReducerV2';
import { ShotCompass } from '../components/scoring/ShotCompass';
import { ClassificationPanel } from '../components/scoring/ClassificationPanel';
import { DistanceKeypad } from '../components/scoring/DistanceKeypad';
import { ShotLogBarV2 } from '../components/scoring/ShotLogBar';
import { SMSBottomSheet } from '../components/scoring/SMSBottomSheet';
import { HoleSummary } from '../components/scoring/HoleSummary';
import { LieBadge } from '../components/scoring/LieBadge';
import { PuttResult } from '../components/scoring/PuttResult';
import { SCORING_COLORS } from '../components/scoring/colors';

type NavProp = StackNavigationProp<ScoringStackParamList, 'HoleScoring'>;
type RoutePropT = RouteProp<ScoringStackParamList, 'HoleScoring'>;

// Map V1 Classification type to V2 LieType for the classification panel callback
const CLASSIFICATION_TO_LIE: Record<string, LieType> = {
  fairway: LIE_TYPES.FAIRWAY,
  rough: LIE_TYPES.ROUGH,
  bunker: LIE_TYPES.SAND,
  trouble: LIE_TYPES.TROUBLE,
};
const CLASSIFICATION_TO_PENALTY: Record<string, PenaltyType> = {
  hazard: PENALTY_TYPES.HAZARD,
  ob: PENALTY_TYPES.OB,
  lost: PENALTY_TYPES.LOST,
};

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

  // Hole summary review
  const [showSummary, setShowSummary] = useState(false);

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

  // The V2 reducer — all scoring state lives here
  const {
    state: s,
    submitDistance,
    skipDistance,
    toggleSwing,
    tapCenterResult,
    tapDirection,
    tapResultLie,
    tapPenaltyLie,
    tapPuttMade,
    tapPuttMiss,
    undo,
    restore,
  } = useScoringReducerV2(hole?.par ?? 4);

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

        // Restore existing shot data — only V2 data restores into the V2 reducer.
        // V1 data is preserved in the DB (not overwritten) until the user takes a new shot.
        const existing = parseShotData(h.shotData);
        const hasV1Data = existing && !isShotDataV2(existing) && existing.shots.length > 0;
        if (existing && isShotDataV2(existing) && existing.shots.length > 0) {
          restore(existing.shots as TrackedShotV2[], existing.currentStroke || existing.shots.length + 1, h.par);
        } else {
          restore([], 1, h.par);
        }
        // If this hole has V1 data, don't overwrite until user actually records shots
        if (hasV1Data) {
          hasEverPersistedRef.current = false;
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

  // ── Persistence (V2 format) ───────────────────────────────────

  const persistShots = useCallback(async (updatedShots: TrackedShotV2[], nextStroke: number) => {
    if (!hole || !roundId) return;

    const gen = ++persistGeneration.current;

    try {
      const shotData: ShotDataV2 = { version: 2, par: hole.par, shots: updatedShots, currentStroke: nextStroke };
      const stats = updatedShots.length > 0 ? deriveHoleStatsV2(shotData, hole.par) : null;
      const strokes = calculateTotalStrokesV2(updatedShots);

      await updateHole(roundId, {
        holeNumber: hole.holeNumber,
        par: hole.par,
        strokes,
        fairwayHit: stats?.fairwayHit,
        greenInRegulation: stats?.greenInRegulation,
        putts: stats?.puttsCount,
        shotData: JSON.stringify(shotData),
      });

      if (gen !== persistGeneration.current) return;
      setSaveError(false);
      retryCount.current = 0;
      prevHoleStrokes.current = strokes;
    } catch {
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

  // Persist whenever shots change (including hole_complete to capture the final shot)
  const prevShotsRef = useRef<TrackedShotV2[]>([]);
  const hasEverPersistedRef = useRef(false);
  useEffect(() => {
    if (s.shots !== prevShotsRef.current) {
      if (!hasEverPersistedRef.current && s.shots.length === 0) return;
      prevShotsRef.current = s.shots;
      hasEverPersistedRef.current = true;
      persistShots(s.shots, s.currentStroke);
    }
  }, [s.phase, s.shots, s.currentStroke, persistShots]);

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

  // ── "Report" button — status SMS from the green ─────────────

  const handleReport = useCallback(() => {
    if (!hole) return;
    // Include the pending putt in the stroke count for an accurate score
    const currentStrokes = calculateTotalStrokesV2(s.shots);
    const prospectiveStrokes = currentStrokes + 1;
    const scoreVsPar = prospectiveStrokes - hole.par;
    const scoreName = getScoreName(scoreVsPar);
    const distanceText = s.pendingDistance != null
      ? `${s.pendingDistance} feet`
      : 'a putt';
    const golferName = golfer?.name ?? 'Golfer';
    const message = `Hole ${hole.holeNumber} Update\n${golferName} has ${distanceText} for ${scoreName.toLowerCase()}`;
    showSmsSheet(message);
  }, [hole, s.shots, s.pendingDistance, golfer, showSmsSheet]);

  // ── Hole complete flow ──────────────────────────────────────

  // Reset completingRef and summary when phase leaves hole_complete (e.g., undo)
  useEffect(() => {
    if (s.phase !== 'hole_complete') {
      completingRef.current = false;
      setShowSummary(false);
    }
  }, [s.phase]);

  useEffect(() => {
    if (s.phase !== 'hole_complete' || !hole || !roundId) return;
    if (completingRef.current) return;
    completingRef.current = true;

    // If the hole was already saved (re-entry), skip the DB write and show summary directly
    const strokes = calculateTotalStrokesV2(s.shots);
    if (prevHoleStrokes.current > 0 && prevHoleStrokes.current === strokes) {
      setShowSummary(true);
      return;
    }

    const completeHole = async () => {
      setSaving(true);
      try {
        const shotData: ShotDataV2 = { version: 2, par: hole.par, shots: s.shots, currentStroke: s.currentStroke };
        const stats = deriveHoleStatsV2(shotData, hole.par);

        await updateHole(roundId, {
          holeNumber: hole.holeNumber,
          par: hole.par,
          strokes,
          fairwayHit: stats?.fairwayHit,
          greenInRegulation: stats?.greenInRegulation,
          putts: stats?.puttsCount,
          shotData: JSON.stringify(shotData),
        });

        const prior = prevHoleStrokes.current;
        const parDelta = prior === 0 ? hole.par : 0;
        setRoundScoreToPar(prev => prev + (strokes - prior) - parDelta);

        setShowSummary(true);
      } catch {
        completingRef.current = false;
        Alert.alert('Error', 'Failed to save hole. Please try again.');
      } finally {
        setSaving(false);
      }
    };

    completeHole();
  }, [s.phase, s.shots, s.currentStroke, hole, roundId, updateHole]);

  // ── Hole summary send/skip handlers ──────────────────────────

  const summaryBusyRef = useRef(false);

  const persistEditedShots = useCallback(async (editedShots: TrackedShotV2[]) => {
    if (!hole || !roundId) return 0;
    const shotData: ShotDataV2 = { version: 2, par: hole.par, shots: editedShots, currentStroke: s.currentStroke };
    const stats = deriveHoleStatsV2(shotData, hole.par);
    const strokes = calculateTotalStrokesV2(editedShots);

    await updateHole(roundId, {
      holeNumber: hole.holeNumber,
      par: hole.par,
      strokes,
      fairwayHit: stats?.fairwayHit,
      greenInRegulation: stats?.greenInRegulation,
      putts: stats?.puttsCount,
      shotData: JSON.stringify(shotData),
    });
    return strokes;
  }, [hole, roundId, s.currentStroke, updateHole]);

  const handleSummarySend = useCallback(async (editedShots: TrackedShotV2[]) => {
    if (!hole || !roundId || summaryBusyRef.current) return;
    summaryBusyRef.current = true;
    setSaving(true);

    try {
      const strokes = await persistEditedShots(editedShots);

      const finalScoreVsPar = strokes - hole.par;
      const finalScoreName = getScoreName(finalScoreVsPar);
      const runningStats = await calculateRunningRoundStats(roundId);
      const holesPlayed = runningStats.totalHolesPlayed;
      const totalScoreVsPar = await calculateTotalScoreVsPar(roundId);

      const summaryMsg = `Hole ${hole.holeNumber} Complete!\n` +
        `Score: ${strokes} (${finalScoreName})\n` +
        `${formatScoreVsPar(finalScoreVsPar)} on the hole\n` +
        `\nAfter ${holesPlayed} holes: ${formatScoreVsPar(totalScoreVsPar)}`;

      setShowSummary(false);
      showSmsSheet(summaryMsg, () => {
        navigation.navigate('RoundTracker', { roundId });
      });
    } catch {
      Alert.alert('Error', 'Failed to save edits. Please try again.');
    } finally {
      summaryBusyRef.current = false;
      setSaving(false);
    }
  }, [hole, roundId, persistEditedShots, navigation, showSmsSheet]);

  const handleSummarySkip = useCallback(async (editedShots: TrackedShotV2[]) => {
    if (!hole || !roundId || summaryBusyRef.current) return;
    summaryBusyRef.current = true;
    setSaving(true);

    try {
      await persistEditedShots(editedShots);
      navigation.navigate('RoundTracker', { roundId });
    } catch {
      Alert.alert('Error', 'Failed to save edits. Please try again.');
    } finally {
      summaryBusyRef.current = false;
      setSaving(false);
    }
  }, [hole, roundId, persistEditedShots, navigation]);

  // ── Classification panel callback (bridges V1 Classification → V2) ──

  const handleClassify = useCallback((c: string) => {
    const penaltyType = CLASSIFICATION_TO_PENALTY[c];
    if (penaltyType) {
      // Penalty lies get a confirmation alert
      Alert.alert(
        `Confirm ${c.toUpperCase()}`,
        'This adds a penalty stroke. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes', onPress: () => tapPenaltyLie(penaltyType) },
        ],
      );
    } else {
      const lie = CLASSIFICATION_TO_LIE[c];
      if (lie) tapResultLie(lie);
    }
  }, [tapResultLie, tapPenaltyLie]);

  // ── "Hole" center button confirmation ──────────────────────

  const handleCenterResult = useCallback((result: 'fairway' | 'green' | 'hole') => {
    if (result === 'hole') {
      const strokes = calculateTotalStrokesV2(s.shots) + 1;
      Alert.alert(
        'Finish Hole?',
        `End hole with score ${strokes}?`,
        [
          { text: 'Cancel' },
          { text: 'Yes', onPress: () => tapCenterResult('hole') },
        ],
      );
    } else {
      tapCenterResult(result);
    }
  }, [s.shots, tapCenterResult]);

  // ── Back navigation ─────────────────────────────────────────

  const allowLeaveRef = useRef(false);

  const handleBack = useCallback(() => {
    if (s.shots.length > 0) {
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
  }, [s.shots.length, navigation]);

  // Wire Android back button — phase-aware undo
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (allowLeaveRef.current) return;
      // Hole is saved and summary is showing — allow navigation (Send/Skip)
      if (s.phase === 'hole_complete' && showSummary && !saving) return;
      // If in a sub-phase, undo instead of leaving
      if (s.phase === 'awaiting_result' || s.phase === 'awaiting_result_lie') {
        e.preventDefault();
        undo();
        return;
      }
      if (s.shots.length === 0) return;
      e.preventDefault();
      handleBack();
    });
    return unsubscribe;
  }, [navigation, s.phase, s.shots.length, showSummary, saving, handleBack, undo]);

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

  const totalStrokes = useMemo(() => calculateTotalStrokesV2(s.shots), [s.shots]);

  // ── Loading / Error ─────────────────────────────────────────

  if (loading) return <LoadingScreen message="Loading hole..." />;
  if (error || !hole) {
    return <ErrorScreen error={error || new Error('Hole not found')} onRetry={() => navigation.goBack()} />;
  }

  const canUndo = s.phase !== 'awaiting_distance' || s.shots.length > 0;

  // ── Render ──────────────────────────────────────────────────

  return (
    <View style={styles.container}>
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
          onPress={undo}
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

      {/* Lie badge + swing toggle */}
      <LieBadge
        lie={s.currentLie}
        swing={s.pendingSwing}
        stroke={s.currentStroke}
        onToggleSwing={toggleSwing}
        disabled={s.phase !== 'awaiting_distance'}
      />

      {/* Shot log */}
      <ShotLogBarV2 shots={s.shots} />

      {/* Main content */}
      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={[styles.bodyContent, { paddingBottom: Math.max(insets.bottom, 20) }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Phase: Distance entry */}
        {s.phase === 'awaiting_distance' && (
          <DistanceKeypad
            unit={s.pendingDistanceUnit}
            onSubmit={(v) => submitDistance(Number(v))}
            onSkip={skipDistance}
            contextLabel={s.isOnGreen
              ? `How far from the pin for stroke ${s.currentStroke}?`
              : `How far to the hole for stroke ${s.currentStroke}?`}
          />
        )}

        {/* Phase: Result (off-green) */}
        {s.phase === 'awaiting_result' && !s.isOnGreen && (
          <View style={styles.compassPhase}>
            <Text style={styles.phasePrompt}>Where did stroke #{s.currentStroke} go?</Text>
            <ShotCompass
              isOnGreen={false}
              onDirection={(d) => tapDirection(d as MissDirection)}
              onCenter={(c) => handleCenterResult(c as 'fairway' | 'green' | 'hole')}
            />
          </View>
        )}

        {/* Phase: Result (on-green / putts) */}
        {s.phase === 'awaiting_result' && s.isOnGreen && (
          <>
            <Text style={styles.puttStatusText}>
              {s.pendingDistance != null
                ? `${s.pendingDistance} feet for ${getScoreName((totalStrokes + 1) - hole.par)}`
                : `Putting for ${getScoreName((totalStrokes + 1) - hole.par)}`}
            </Text>
            <PuttResult
              onMade={tapPuttMade}
              onMiss={tapPuttMiss}
            />
            <TouchableOpacity
              style={styles.reportButton}
              onPress={handleReport}
              accessibilityLabel="Send status report"
              accessibilityHint="Send an SMS with current hole status"
              accessibilityRole="button"
            >
              <Icon name="textsms" size={20} color="#fff" />
              <Text style={styles.reportText}>Report</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Phase: Result lie (off-green miss) */}
        {s.phase === 'awaiting_result_lie' && (
          <View style={styles.classificationPhase}>
            <Text style={styles.classificationPrompt}>Where did it end up?</Text>
            <ClassificationPanel
              isOnGreen={false}
              selected={null}
              onClassify={handleClassify}
            />
          </View>
        )}

        {/* Phase: Hole complete — saving */}
        {s.phase === 'hole_complete' && saving && (
          <View style={styles.savingContainer} accessibilityRole="alert" accessibilityLiveRegion="assertive">
            <ActivityIndicator size="large" color="#2E7D32" />
            <Text style={styles.savingText}>Saving hole...</Text>
          </View>
        )}

        {/* Phase: Hole complete — summary review */}
        {s.phase === 'hole_complete' && showSummary && !saving && hole && (
          <HoleSummary
            holeNumber={hole.holeNumber}
            par={hole.par}
            shots={s.shots}
            totalStrokes={totalStrokes}
            onSend={handleSummarySend}
            onSkip={handleSummarySkip}
          />
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
    </View>
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

  // Phase wrappers
  compassPhase: { alignItems: 'center' },
  phasePrompt: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  puttStatusText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#546E7A',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    minWidth: 160,
    minHeight: 48,
    alignSelf: 'center',
    marginTop: 12,
  },
  reportText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  classificationPhase: { alignItems: 'center' },
  classificationPrompt: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },

  // Saving
  savingContainer: { alignItems: 'center', paddingVertical: 40 },
  savingText: { fontSize: 18, color: '#666' },
});

export default HoleScoringScreen;
