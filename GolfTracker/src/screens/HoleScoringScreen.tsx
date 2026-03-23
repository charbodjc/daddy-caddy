/**
 * HoleScoringScreen.tsx
 *
 * Streamlined hole scoring workflow with icon-only buttons.
 * Flow varies by par:
 *   Par 3: Tee → (miss→chip→on green?) → putt distance → SMS → made/missed → summary SMS
 *   Par 4: Tee (fairway/left/right/on green) → approach or trouble → same as par 3
 *   Par 5: Tee (fairway/left/right) → same as par 4
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as SMS from 'expo-sms';
import { useRoundStore } from '../stores/roundStore';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ErrorScreen } from '../components/common/ErrorScreen';
import { database } from '../database/watermelon/database';
import Hole from '../database/watermelon/models/Hole';
import Round from '../database/watermelon/models/Round';
import Golfer from '../database/watermelon/models/Golfer';
import {
  TrackedShot,
  ShotData,
  SmsContact,
  SHOT_TYPES,
  SHOT_RESULTS,
} from '../types';
import { parseShotData, deriveHoleStats, calculateTotalStrokes, calculateRunningRoundStats } from '../utils/roundStats';
import { getScoreName } from '../utils/scoreColors';
import { formatScoreVsPar } from '../utils/scoreCalculations';
import smsService from '../services/sms';
import { generateHoleCommentary } from '../utils/holeCommentary';
import type { ScoringStackParamList } from '../types/navigation';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';

type NavProp = StackNavigationProp<ScoringStackParamList, 'HoleScoring'>;
type RoutePropT = RouteProp<ScoringStackParamList, 'HoleScoring'>;

// ── Workflow step types ──────────────────────────────────────────

type WorkflowStep =
  | 'tee_par3'        // Par 3: bullseye layout (center green, arrows red)
  | 'tee_par4'        // Par 4: fairway row + on green above
  | 'tee_par5'        // Par 5: fairway row only (no on green)
  | 'trouble'         // After left/right on par 4/5: rough, bunker, lost, OB, hazard
  | 'chip'            // Chip shot: on green or not on green (icons)
  | 'approach_par3'   // Approach shot with par 3 buttons
  | 'approach_lie'    // After approach miss: where did it end up (fairway, rough, bunker, etc.)
  | 'putt_distance'   // Numeric keypad for feet
  | 'sms_preview'     // Show SMS preview before sending
  | 'made_missed'     // Made it / Missed it buttons
  | 'hole_complete';  // Final SMS with hole summary

// Maximum putt distance digits
const MAX_PUTT_DIGITS = 3;

// ── Component ────────────────────────────────────────────────────

const HoleScoringScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropT>();
  const { holeId, roundId } = route.params || {};
  const { updateHole } = useRoundStore();

  const [hole, setHole] = useState<Hole | null>(null);
  const [golfer, setGolfer] = useState<Golfer | null>(null);
  const [roundScoreToPar, setRoundScoreToPar] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);

  // Shot tracking
  const [shots, setShots] = useState<TrackedShot[]>([]);
  const [currentStroke, setCurrentStroke] = useState(1);
  const [saveError, setSaveError] = useState(false);
  const retryTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // BBD (Big Beautiful Drive) toggle for par 4/5 tee shots
  const [bbdChecked, setBbdChecked] = useState(false);

  // Workflow state
  const [step, setStep] = useState<WorkflowStep>('tee_par3');
  const [stepHistory, setStepHistory] = useState<WorkflowStep[]>([]);
  const [puttDistance, setPuttDistance] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [recipients, setRecipients] = useState<SmsContact[]>([]);

  // Clean up retry timer on unmount
  useEffect(() => {
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []);

  // Load hole data
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
          setShots(existing.shots);
          setCurrentStroke(existing.currentStroke || existing.shots.length + 1);
        }

        // Set initial step based on par
        if (h.par === 3) setStep('tee_par3');
        else if (h.par === 4) setStep('tee_par4');
        else setStep('tee_par5');

        // Load golfer info and round score-to-par for played holes
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

        // Load SMS recipients (service handles missing golfer gracefully)
        const contacts = await smsService.getRecipientsForRound(roundId);
        setRecipients(contacts);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [holeId, roundId]);

  // ── Persist shots to DB after each shot ─────────────────────

  // Track the previous strokes for this hole so we can update roundScoreToPar incrementally
  const prevHoleStrokes = React.useRef(0);

  const persistShots = useCallback(async (updatedShots: TrackedShot[], nextStroke: number) => {
    if (!hole || !roundId) return;
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

      setSaveError(false);

      // Update round score-to-par: adjust by the change in this hole's strokes
      const delta = strokes - prevHoleStrokes.current;
      if (delta !== 0) {
        // If the hole was previously unplayed, also account for the par being added
        const parDelta = prevHoleStrokes.current === 0 ? hole.par : 0;
        setRoundScoreToPar(prev => prev + delta - parDelta);
        prevHoleStrokes.current = strokes;
      }
    } catch {
      setSaveError(true);
      // Auto-retry after 2 seconds
      if (retryTimer.current) clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(() => {
        persistShots(updatedShots, nextStroke);
      }, 2000);
    }
  }, [hole, roundId, updateHole]);

  // ── Shot recording helpers ──────────────────────────────────

  const addShot = useCallback((type: string, result: string, extraPenalty = 0) => {
    const newShot: TrackedShot = {
      stroke: currentStroke,
      type,
      results: [result],
      ...(extraPenalty > 0 ? { penaltyStrokes: extraPenalty } : {}),
    };
    const updatedShots = [...shots, newShot];
    const nextStroke = currentStroke + 1;
    setShots(updatedShots);
    setCurrentStroke(nextStroke);
    persistShots(updatedShots, nextStroke);
  }, [currentStroke, shots, persistShots]);

  const addPuttShot = useCallback((distance: string, result: string) => {
    const newShot: TrackedShot = {
      stroke: currentStroke,
      type: SHOT_TYPES.PUTT,
      results: [result],
      puttDistance: `${distance} ft`,
    };
    const updatedShots = [...shots, newShot];
    const nextStroke = currentStroke + 1;
    setShots(updatedShots);
    setCurrentStroke(nextStroke);
    persistShots(updatedShots, nextStroke);
  }, [currentStroke, shots, persistShots]);

  // ── Step transition with history ────────────────────────────

  const goToStep = useCallback((nextStep: WorkflowStep) => {
    setStepHistory(prev => [...prev, step]);
    setStep(nextStep);
  }, [step]);

  // ── Undo last shot ──────────────────────────────────────────

  const undoLastShot = useCallback(() => {
    if (shots.length === 0) return;
    const updatedShots = shots.slice(0, -1);
    const prevStroke = currentStroke - 1;
    setShots(updatedShots);
    setCurrentStroke(prevStroke);
    persistShots(updatedShots, prevStroke);

    // Go back to previous step
    if (stepHistory.length > 0) {
      const prevStep = stepHistory[stepHistory.length - 1];
      setStepHistory(prev => prev.slice(0, -1));
      setStep(prevStep);
    }
  }, [shots, currentStroke, stepHistory, persistShots]);

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

  // ── Back navigation with confirmation ───────────────────────

  const handleBack = useCallback(() => {
    if (shots.length > 0) {
      Alert.alert(
        'Leave Hole?',
        'Your shots have been saved. Go back?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go Back', onPress: () => navigation.goBack() },
        ],
      );
    } else {
      navigation.goBack();
    }
  }, [shots.length, navigation]);

  // ── Computed values ─────────────────────────────────────────

  const totalStrokes = useMemo(() => calculateTotalStrokes(shots), [shots]);

  // ── Tee shot handlers ───────────────────────────────────────

  const handlePar3Tee = useCallback((result: string) => {
    addShot(SHOT_TYPES.TEE_SHOT, result);
    if (result === SHOT_RESULTS.GREEN) {
      goToStep('putt_distance');
    } else {
      goToStep('chip');
    }
  }, [addShot, goToStep]);

  const handlePar4Tee = useCallback((result: string) => {
    if (bbdChecked) {
      // Record BBD as an additional result on the tee shot
      const newShot: TrackedShot = {
        stroke: currentStroke,
        type: SHOT_TYPES.TEE_SHOT,
        results: [result, 'bbd'],
      };
      const updatedShots = [...shots, newShot];
      const nextStroke = currentStroke + 1;
      setShots(updatedShots);
      setCurrentStroke(nextStroke);
      persistShots(updatedShots, nextStroke);
      setBbdChecked(false);
    } else {
      addShot(SHOT_TYPES.TEE_SHOT, result);
    }
    if (result === SHOT_RESULTS.GREEN) {
      goToStep('putt_distance');
    } else if (result === SHOT_RESULTS.CENTER) {
      goToStep('approach_par3');
    } else {
      goToStep('trouble');
    }
  }, [addShot, goToStep, bbdChecked, currentStroke, shots, persistShots]);

  const handlePar5Tee = useCallback((result: string) => {
    if (bbdChecked) {
      const newShot: TrackedShot = {
        stroke: currentStroke,
        type: SHOT_TYPES.TEE_SHOT,
        results: [result, 'bbd'],
      };
      const updatedShots = [...shots, newShot];
      const nextStroke = currentStroke + 1;
      setShots(updatedShots);
      setCurrentStroke(nextStroke);
      persistShots(updatedShots, nextStroke);
      setBbdChecked(false);
    } else {
      addShot(SHOT_TYPES.TEE_SHOT, result);
    }
    if (result === SHOT_RESULTS.CENTER) {
      goToStep('tee_par4');
    } else {
      goToStep('trouble');
    }
  }, [addShot, goToStep, bbdChecked, currentStroke, shots, persistShots]);

  // ── Trouble handlers ────────────────────────────────────────

  const handleTrouble = useCallback((result: string) => {
    if (result === SHOT_RESULTS.LOST || result === SHOT_RESULTS.OB) {
      addShot(SHOT_TYPES.PENALTY, result, 1);
      if (hole?.par === 5) {
        goToStep('tee_par5');
      } else {
        goToStep('tee_par4');
      }
    } else if (result === SHOT_RESULTS.HAZARD) {
      addShot(SHOT_TYPES.PENALTY, result, 1);
      goToStep('approach_par3');
    } else {
      // Rough or bunker
      addShot(SHOT_TYPES.APPROACH, result);
      goToStep('approach_par3');
    }
  }, [addShot, goToStep, hole]);

  // ── Approach (par 3 style) handler ──────────────────────────

  const handleApproach = useCallback((result: string) => {
    addShot(SHOT_TYPES.APPROACH, result);
    if (result === SHOT_RESULTS.GREEN) {
      goToStep('putt_distance');
    } else {
      goToStep('approach_lie');
    }
  }, [addShot, goToStep]);

  const handleApproachLie = useCallback((lie: string) => {
    // Record the lie as an additional result on the last shot
    if (shots.length > 0) {
      const updatedShots = [...shots];
      const lastShot = { ...updatedShots[updatedShots.length - 1] };
      lastShot.results = [...lastShot.results, lie];
      updatedShots[updatedShots.length - 1] = lastShot;
      setShots(updatedShots);
      persistShots(updatedShots, currentStroke);
    }
    goToStep('chip');
  }, [shots, currentStroke, persistShots, goToStep]);

  // ── Chip handlers ───────────────────────────────────────────

  const handleChip = useCallback((onGreen: boolean) => {
    if (onGreen) {
      addShot(SHOT_TYPES.CHIP, SHOT_RESULTS.GREEN);
      goToStep('putt_distance');
    } else {
      addShot(SHOT_TYPES.CHIP, SHOT_RESULTS.MISSED);
      goToStep('chip');
    }
  }, [addShot, goToStep]);

  // ── Putt distance submit ────────────────────────────────────

  const handlePuttDistanceSubmit = useCallback(async () => {
    if (!puttDistance || !hole) return;
    Keyboard.dismiss();

    const strokeCount = totalStrokes + 1; // +1 for the upcoming putt
    const puttScoreVsPar = strokeCount - hole.par;
    const puttScoreName = getScoreName(puttScoreVsPar);

    const shotSummary = buildShotSummary(shots, hole.par);
    const commentary = generateHoleCommentary(hole.holeNumber, hole.par, strokeCount, puttScoreName);

    const message = `${shotSummary}\n\n${commentary}\n\n${puttDistance} feet for ${puttScoreName.toLowerCase()}`;
    setSmsMessage(message);
    setStepHistory(prev => [...prev, step]);
    setStep('sms_preview');
  }, [puttDistance, hole, totalStrokes, shots, step]);

  // ── SMS send ────────────────────────────────────────────────

  const handleSendSMS = useCallback(async () => {
    await openSMS(smsMessage);
    setStepHistory(prev => [...prev, step]);
    setStep('made_missed');
  }, [smsMessage, openSMS, step]);

  const handleSkipSMS = useCallback(() => {
    setStepHistory(prev => [...prev, step]);
    setStep('made_missed');
  }, [step]);

  // ── Made / Missed handlers ──────────────────────────────────

  const handleMade = useCallback(async () => {
    if (!hole || !roundId) return;
    setSaving(true);

    try {
      // Build final shots array with the made putt
      const madeShot: TrackedShot = {
        stroke: currentStroke,
        type: SHOT_TYPES.PUTT,
        results: [SHOT_RESULTS.MADE],
        puttDistance: `${puttDistance} ft`,
      };
      const updatedShots = [...shots, madeShot];
      const nextStroke = currentStroke + 1;

      const shotData: ShotData = { par: hole.par, shots: updatedShots, currentStroke: nextStroke };
      const stats = deriveHoleStats(shotData, hole.par);
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

      // Build summary SMS
      const finalScoreVsPar = strokes - hole.par;
      const finalScoreName = getScoreName(finalScoreVsPar);
      const runningStats = await calculateRunningRoundStats(roundId);
      const holesPlayed = runningStats.totalHolesPlayed;
      const totalScoreVsPar = await calculateTotalScoreVsPar(roundId);

      // Check if tee shot was marked as BBD
      const hasBBD = updatedShots.some(
        s => s.type === SHOT_TYPES.TEE_SHOT && s.results.includes('bbd')
      );

      const summaryMsg = `Hole ${hole.holeNumber} Complete!\n` +
        `Score: ${strokes} (${finalScoreName})\n` +
        `${formatScoreVsPar(finalScoreVsPar)} on the hole\n` +
        (hasBBD ? `Big Beautiful Drive\n` : '') +
        `\nAfter ${holesPlayed} holes: ${formatScoreVsPar(totalScoreVsPar)}`;

      // SMS is best-effort — don't block navigation or show error for SMS failures
      try {
        await openSMS(summaryMsg);
      } catch {
        // SMS send failed silently — hole data was already saved
      }
      navigation.navigate('RoundTracker', { roundId });
    } catch {
      Alert.alert('Error', 'Failed to save hole. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [puttDistance, shots, currentStroke, hole, roundId, updateHole, openSMS, navigation]);

  const handleMissed = useCallback(() => {
    addPuttShot(puttDistance, SHOT_RESULTS.MISSED);
    setPuttDistance('');
    setStepHistory(prev => [...prev, step]);
    setStep('putt_distance');
  }, [puttDistance, addPuttShot, step]);

  // ── Loading / Error ─────────────────────────────────────────

  if (loading) return <LoadingScreen message="Loading hole..." />;
  if (error || !hole) {
    return <ErrorScreen error={error || new Error('Hole not found')} onRetry={() => navigation.goBack()} />;
  }

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
          style={styles.backBtn}
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
        {shots.length > 0 && (
          <TouchableOpacity
            style={styles.undoBtn}
            onPress={undoLastShot}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Undo last shot"
            accessibilityRole="button"
          >
            <Icon name="undo" size={22} color="#fff" />
          </TouchableOpacity>
        )}
        <View style={styles.scoreColumn}>
          <View style={styles.roundScoreBadge} accessibilityLabel={`Round score: ${formatScoreVsPar(roundScoreToPar)}`}>
            <Text style={styles.roundScoreValue}>{formatScoreVsPar(roundScoreToPar)}</Text>
            <Text style={styles.roundScoreLabel}>round</Text>
          </View>
          <View style={styles.strokeBadge} accessibilityLabel={`${totalStrokes} strokes`}>
            <Text style={styles.strokeNum}>{totalStrokes}</Text>
            <Text style={styles.strokeLabel}>strokes</Text>
          </View>
          {golfer && (
            <View style={styles.golferTag} accessibilityLabel={`Golfer: ${golfer.name}`}>
              <View style={[styles.golferDot, { backgroundColor: golfer.color }]} />
              <Text style={styles.golferName} numberOfLines={1}>{golfer.name}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Shot log summary */}
      {shots.length > 0 && (
        <View style={styles.shotLogBar} accessibilityLabel={`Shot log: ${shots.length} shots`}>
          <Text style={styles.shotLogText}>
            {shots.map((s) => shotResultEmoji(s.results[0])).join(' ')}
          </Text>
        </View>
      )}

      {/* Workflow content */}
      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={[styles.bodyContent, { paddingBottom: Math.max(insets.bottom, 20) }]}
        keyboardShouldPersistTaps="handled"
      >
        {step === 'tee_par3' && renderPar3Tee(handlePar3Tee)}
        {step === 'tee_par4' && renderPar4Tee(handlePar4Tee, bbdChecked, setBbdChecked)}
        {step === 'tee_par5' && renderPar5Tee(handlePar5Tee, bbdChecked, setBbdChecked)}
        {step === 'approach_par3' && renderApproachShot(handleApproach)}
        {step === 'approach_lie' && renderApproachLie(handleApproachLie)}
        {step === 'trouble' && renderTrouble(handleTrouble)}
        {step === 'chip' && renderChip(handleChip)}
        {step === 'putt_distance' && renderPuttDistance(puttDistance, setPuttDistance, handlePuttDistanceSubmit)}
        {step === 'sms_preview' && renderSMSPreview(smsMessage, recipients, handleSendSMS, handleSkipSMS)}
        {step === 'made_missed' && renderMadeMissed(puttDistance, handleMade, handleMissed, saving)}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ── Helper functions ───────────────────────────────────────────

function shotResultEmoji(result: string): string {
  switch (result) {
    case SHOT_RESULTS.GREEN:
    case SHOT_RESULTS.MADE: return '\u2705';
    case SHOT_RESULTS.CENTER: return '\u26F3';
    case SHOT_RESULTS.LEFT: return '\u2B05\uFE0F';
    case SHOT_RESULTS.RIGHT: return '\u27A1\uFE0F';
    case SHOT_RESULTS.SHORT: return '\u2B07\uFE0F';
    case SHOT_RESULTS.LONG: return '\u2B06\uFE0F';
    case SHOT_RESULTS.ROUGH: return '\u{1F33F}';
    case SHOT_RESULTS.SAND: return '\u{1F3D6}\uFE0F';
    case SHOT_RESULTS.HAZARD: return '\u{1F4A7}';
    case SHOT_RESULTS.OB: return '\u{1F6AB}';
    case SHOT_RESULTS.LOST: return '\u{1F50D}';
    case SHOT_RESULTS.MISSED: return '\u274C';
    default: return '\u26AA';
  }
}

function buildShotSummary(shots: TrackedShot[], par: number): string {
  if (shots.length === 0) return '';
  const lines = shots.map((s, i) => {
    const emoji = shotResultEmoji(s.results[0]);
    const penalty = s.penaltyStrokes ? ` (+${s.penaltyStrokes} penalty)` : '';
    return `${i + 1}. ${s.type} ${emoji}${penalty}`;
  });
  return `Par ${par} - Shots so far:\n${lines.join('\n')}`;
}

async function calculateTotalScoreVsPar(roundId: string): Promise<number> {
  try {
    const round = await database.get<Round>('rounds').find(roundId);
    const holes: Hole[] = await round.holes.fetch();
    let totalStrokes = 0;
    let totalPar = 0;
    for (const h of holes) {
      if (h.strokes > 0) {
        totalStrokes += h.strokes;
        totalPar += h.par;
      }
    }
    return totalStrokes - totalPar;
  } catch {
    return 0;
  }
}

// ── Par 3 Tee / Approach buttons (5-button cross) ─────────────

function renderPar3Tee(onSelect: (result: string) => void) {
  return (
    <View style={styles.buttonContainer}>
      <Text style={styles.stepLabel}>Where did it go?</Text>
      <View style={styles.crossLayout}>
        {/* Top: Long */}
        <View style={styles.crossRow}>
          <View style={styles.crossSpacer} />
          <TouchableOpacity
            style={[styles.dirButton, styles.badButton]}
            onPress={() => onSelect(SHOT_RESULTS.LONG)}
            accessibilityLabel="Long"
            accessibilityRole="button"
          >
            <Icon name="arrow-upward" size={36} color="#fff" />
          </TouchableOpacity>
          <View style={styles.crossSpacer} />
        </View>
        {/* Middle: Left, Center (green), Right */}
        <View style={styles.crossRow}>
          <TouchableOpacity
            style={[styles.dirButton, styles.badButton]}
            onPress={() => onSelect(SHOT_RESULTS.LEFT)}
            accessibilityLabel="Missed left"
            accessibilityRole="button"
          >
            <Icon name="arrow-back" size={36} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dirButton, styles.goodButton]}
            onPress={() => onSelect(SHOT_RESULTS.GREEN)}
            accessibilityLabel="On green"
            accessibilityRole="button"
          >
            <Icon name="adjust" size={36} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dirButton, styles.badButton]}
            onPress={() => onSelect(SHOT_RESULTS.RIGHT)}
            accessibilityLabel="Missed right"
            accessibilityRole="button"
          >
            <Icon name="arrow-forward" size={36} color="#fff" />
          </TouchableOpacity>
        </View>
        {/* Bottom: Short */}
        <View style={styles.crossRow}>
          <View style={styles.crossSpacer} />
          <TouchableOpacity
            style={[styles.dirButton, styles.badButton]}
            onPress={() => onSelect(SHOT_RESULTS.SHORT)}
            accessibilityLabel="Short"
            accessibilityRole="button"
          >
            <Icon name="arrow-downward" size={36} color="#fff" />
          </TouchableOpacity>
          <View style={styles.crossSpacer} />
        </View>
      </View>
    </View>
  );
}

// ── Approach shot buttons (8-arrow compass + center green) ──────

function renderApproachShot(onSelect: (result: string) => void) {
  return (
    <View style={styles.buttonContainer}>
      <Text style={styles.stepLabel}>Where did it go?</Text>
      <View style={styles.crossLayout}>
        {/* Row 1: Long-Left, Long, Long-Right */}
        <View style={styles.crossRow}>
          <TouchableOpacity
            style={[styles.diagButton, styles.badButton]}
            onPress={() => onSelect(SHOT_RESULTS.LONG_LEFT)}
            accessibilityLabel="Long left"
            accessibilityRole="button"
          >
            <Icon name="north-west" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dirButton, styles.badButton]}
            onPress={() => onSelect(SHOT_RESULTS.LONG)}
            accessibilityLabel="Long"
            accessibilityRole="button"
          >
            <Icon name="arrow-upward" size={36} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.diagButton, styles.badButton]}
            onPress={() => onSelect(SHOT_RESULTS.LONG_RIGHT)}
            accessibilityLabel="Long right"
            accessibilityRole="button"
          >
            <Icon name="north-east" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
        {/* Row 2: Left, Center (green), Right */}
        <View style={styles.crossRow}>
          <TouchableOpacity
            style={[styles.dirButton, styles.badButton]}
            onPress={() => onSelect(SHOT_RESULTS.LEFT)}
            accessibilityLabel="Missed left"
            accessibilityRole="button"
          >
            <Icon name="arrow-back" size={36} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dirButton, styles.goodButton]}
            onPress={() => onSelect(SHOT_RESULTS.GREEN)}
            accessibilityLabel="On green"
            accessibilityRole="button"
          >
            <Icon name="adjust" size={36} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dirButton, styles.badButton]}
            onPress={() => onSelect(SHOT_RESULTS.RIGHT)}
            accessibilityLabel="Missed right"
            accessibilityRole="button"
          >
            <Icon name="arrow-forward" size={36} color="#fff" />
          </TouchableOpacity>
        </View>
        {/* Row 3: Short-Left, Short, Short-Right */}
        <View style={styles.crossRow}>
          <TouchableOpacity
            style={[styles.diagButton, styles.badButton]}
            onPress={() => onSelect(SHOT_RESULTS.SHORT_LEFT)}
            accessibilityLabel="Short left"
            accessibilityRole="button"
          >
            <Icon name="south-west" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dirButton, styles.badButton]}
            onPress={() => onSelect(SHOT_RESULTS.SHORT)}
            accessibilityLabel="Short"
            accessibilityRole="button"
          >
            <Icon name="arrow-downward" size={36} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.diagButton, styles.badButton]}
            onPress={() => onSelect(SHOT_RESULTS.SHORT_RIGHT)}
            accessibilityLabel="Short right"
            accessibilityRole="button"
          >
            <Icon name="south-east" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Approach lie buttons (after missing the green) ──────────────

function renderApproachLie(onSelect: (lie: string) => void) {
  return (
    <View style={styles.buttonContainer}>
      <Text style={styles.stepLabel}>Where did it end up?</Text>
      {/* Row 1: Fairway, Rough, Bunker */}
      <View style={styles.troubleRow}>
        <TouchableOpacity
          style={[styles.troubleButton, styles.troubleFairway]}
          onPress={() => onSelect(SHOT_RESULTS.FAIRWAY)}
          accessibilityLabel="Fairway"
          accessibilityRole="button"
        >
          <Icon name="landscape" size={28} color="#fff" />
          <Text style={styles.troubleButtonText}>Fairway</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.troubleButton, styles.troubleRough]}
          onPress={() => onSelect(SHOT_RESULTS.ROUGH)}
          accessibilityLabel="Rough"
          accessibilityRole="button"
        >
          <Icon name="grass" size={28} color="#fff" />
          <Text style={styles.troubleButtonText}>Rough</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.troubleButton, styles.troubleBunker]}
          onPress={() => onSelect(SHOT_RESULTS.SAND)}
          accessibilityLabel="Bunker"
          accessibilityRole="button"
        >
          <Icon name="beach-access" size={28} color="#fff" />
          <Text style={styles.troubleButtonText}>Bunker</Text>
        </TouchableOpacity>
      </View>
      {/* Row 2: Water, Hazard, OB */}
      <View style={styles.troubleRow}>
        <TouchableOpacity
          style={[styles.troubleButton, styles.troubleWater]}
          onPress={() => onSelect(SHOT_RESULTS.WATER)}
          accessibilityLabel="Water"
          accessibilityRole="button"
        >
          <Icon name="water-drop" size={28} color="#fff" />
          <Text style={styles.troubleButtonText}>Water</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.troubleButton, styles.troubleHazard]}
          onPress={() => onSelect(SHOT_RESULTS.HAZARD)}
          accessibilityLabel="Hazard"
          accessibilityRole="button"
        >
          <Icon name="warning" size={28} color="#fff" />
          <Text style={styles.troubleButtonText}>Hazard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.troubleButton, styles.troubleOB]}
          onPress={() => onSelect(SHOT_RESULTS.OB)}
          accessibilityLabel="Out of bounds"
          accessibilityRole="button"
        >
          <Icon name="block" size={28} color="#fff" />
          <Text style={styles.troubleButtonText}>OB</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Par 4 Tee buttons (Fairway row + On Green above) ──────────

function renderPar4Tee(
  onSelect: (result: string) => void,
  bbdChecked: boolean,
  setBbdChecked: (val: boolean) => void,
) {
  return (
    <View style={styles.buttonContainer}>
      <Text style={styles.stepLabel}>Tee Shot</Text>
      {/* On Green button above */}
      <View style={styles.onGreenRow}>
        <TouchableOpacity
          style={[styles.wideButton, styles.goodButton]}
          onPress={() => onSelect(SHOT_RESULTS.GREEN)}
          accessibilityLabel="On green"
          accessibilityRole="button"
        >
          <Icon name="flag" size={28} color="#fff" />
          <Text style={styles.wideButtonText}>On Green!</Text>
        </TouchableOpacity>
      </View>
      {/* Left / Fairway / Right row */}
      <View style={styles.fairwayRow}>
        <TouchableOpacity
          style={[styles.dirButton, styles.badButton]}
          onPress={() => onSelect(SHOT_RESULTS.LEFT)}
          accessibilityLabel="Missed left"
          accessibilityRole="button"
        >
          <Icon name="arrow-back" size={36} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fairwayButton, styles.fairwayColor]}
          onPress={() => onSelect(SHOT_RESULTS.CENTER)}
          accessibilityLabel="Fairway"
          accessibilityRole="button"
        >
          <Icon name="landscape" size={28} color="#fff" />
          <Text style={styles.fairwayButtonText}>Fairway</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dirButton, styles.badButton]}
          onPress={() => onSelect(SHOT_RESULTS.RIGHT)}
          accessibilityLabel="Missed right"
          accessibilityRole="button"
        >
          <Icon name="arrow-forward" size={36} color="#fff" />
        </TouchableOpacity>
      </View>
      {/* BBD checkbox */}
      <TouchableOpacity
        style={styles.bbdRow}
        onPress={() => setBbdChecked(!bbdChecked)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: bbdChecked }}
        accessibilityLabel="Big Beautiful Drive"
      >
        <Icon
          name={bbdChecked ? 'check-box' : 'check-box-outline-blank'}
          size={24}
          color={bbdChecked ? '#2E7D32' : '#999'}
        />
        <Text style={[styles.bbdLabel, bbdChecked && styles.bbdLabelChecked]}>BBD</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Par 5 Tee buttons (same as par 4 without On Green) ────────

function renderPar5Tee(
  onSelect: (result: string) => void,
  bbdChecked: boolean,
  setBbdChecked: (val: boolean) => void,
) {
  return (
    <View style={styles.buttonContainer}>
      <Text style={styles.stepLabel}>Tee Shot</Text>
      {/* Left / Fairway / Right row */}
      <View style={styles.fairwayRow}>
        <TouchableOpacity
          style={[styles.dirButton, styles.badButton]}
          onPress={() => onSelect(SHOT_RESULTS.LEFT)}
          accessibilityLabel="Missed left"
          accessibilityRole="button"
        >
          <Icon name="arrow-back" size={36} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fairwayButton, styles.fairwayColor]}
          onPress={() => onSelect(SHOT_RESULTS.CENTER)}
          accessibilityLabel="Fairway"
          accessibilityRole="button"
        >
          <Icon name="landscape" size={28} color="#fff" />
          <Text style={styles.fairwayButtonText}>Fairway</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dirButton, styles.badButton]}
          onPress={() => onSelect(SHOT_RESULTS.RIGHT)}
          accessibilityLabel="Missed right"
          accessibilityRole="button"
        >
          <Icon name="arrow-forward" size={36} color="#fff" />
        </TouchableOpacity>
      </View>
      {/* BBD checkbox */}
      <TouchableOpacity
        style={styles.bbdRow}
        onPress={() => setBbdChecked(!bbdChecked)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: bbdChecked }}
        accessibilityLabel="Big Beautiful Drive"
      >
        <Icon
          name={bbdChecked ? 'check-box' : 'check-box-outline-blank'}
          size={24}
          color={bbdChecked ? '#2E7D32' : '#999'}
        />
        <Text style={[styles.bbdLabel, bbdChecked && styles.bbdLabelChecked]}>BBD</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Trouble buttons (after left/right on par 4/5) ─────────────

function renderTrouble(onSelect: (result: string) => void) {
  return (
    <View style={styles.buttonContainer}>
      <Text style={styles.stepLabel}>Where is it?</Text>
      {/* Row 1: Rough, Bunker */}
      <View style={styles.troubleRow}>
        <TouchableOpacity
          style={[styles.troubleButton, styles.troubleRough]}
          onPress={() => onSelect(SHOT_RESULTS.ROUGH)}
          accessibilityLabel="Rough"
          accessibilityRole="button"
        >
          <Icon name="grass" size={28} color="#fff" />
          <Text style={styles.troubleButtonText}>Rough</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.troubleButton, styles.troubleBunker]}
          onPress={() => onSelect(SHOT_RESULTS.SAND)}
          accessibilityLabel="Bunker"
          accessibilityRole="button"
        >
          <Icon name="beach-access" size={28} color="#fff" />
          <Text style={styles.troubleButtonText}>Bunker</Text>
        </TouchableOpacity>
      </View>
      {/* Row 2: Lost, OB, Hazard */}
      <View style={styles.troubleRow}>
        <TouchableOpacity
          style={[styles.troubleButton, styles.troubleLost]}
          onPress={() => onSelect(SHOT_RESULTS.LOST)}
          accessibilityLabel="Lost ball, 1 stroke penalty"
          accessibilityRole="button"
        >
          <Icon name="search-off" size={28} color="#fff" />
          <Text style={styles.troubleButtonText}>Lost</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.troubleButton, styles.troubleOB]}
          onPress={() => onSelect(SHOT_RESULTS.OB)}
          accessibilityLabel="Out of bounds, 1 stroke penalty"
          accessibilityRole="button"
        >
          <Icon name="block" size={28} color="#fff" />
          <Text style={styles.troubleButtonText}>OB</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.troubleButton, styles.troubleHazard]}
          onPress={() => onSelect(SHOT_RESULTS.HAZARD)}
          accessibilityLabel="Water hazard, 1 stroke penalty"
          accessibilityRole="button"
        >
          <Icon name="water" size={28} color="#fff" />
          <Text style={styles.troubleButtonText}>Hazard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Chip shot buttons (2 icons: on green / not on green) ──────

function renderChip(onSelect: (onGreen: boolean) => void) {
  return (
    <View style={styles.buttonContainer}>
      <Text style={styles.stepLabel}>Chip Shot</Text>
      <View style={styles.chipRow}>
        <TouchableOpacity
          style={[styles.chipButton, styles.goodButton]}
          onPress={() => onSelect(true)}
          accessibilityLabel="On green"
          accessibilityRole="button"
        >
          <Icon name="flag" size={40} color="#fff" />
          <Icon name="check-circle" size={20} color="#fff" style={styles.chipBadge} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chipButton, styles.badButton]}
          onPress={() => onSelect(false)}
          accessibilityLabel="Not on green"
          accessibilityRole="button"
        >
          <Icon name="flag" size={40} color="#fff" />
          <Icon name="cancel" size={20} color="#fff" style={styles.chipBadge} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Putt distance keypad ──────────────────────────────────────

function renderPuttDistance(
  value: string,
  onChange: (v: string) => void,
  onSubmit: () => void,
) {
  const handleKey = (key: string) => {
    if (key === 'del') {
      onChange(value.slice(0, -1));
    } else if (value.length < MAX_PUTT_DIGITS) {
      onChange(value + key);
    }
  };

  return (
    <View style={styles.buttonContainer}>
      <Text style={styles.stepLabel}>Putt Distance (feet)</Text>
      <View style={styles.distanceDisplay} accessibilityLabel={`${value || '0'} feet`}>
        <Text style={styles.distanceText}>{value || '0'}</Text>
        <Text style={styles.distanceUnit}>ft</Text>
      </View>
      <View style={styles.keypad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'OK'].map((key) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.keypadKey,
              key === 'OK' && styles.keypadOK,
              key === 'del' && styles.keypadDel,
            ]}
            onPress={() => {
              if (key === 'OK') {
                if (value) onSubmit();
              } else {
                handleKey(key);
              }
            }}
            accessibilityLabel={key === 'del' ? 'Delete' : key === 'OK' ? 'Submit distance' : key}
            accessibilityRole="button"
          >
            {key === 'del' ? (
              <Icon name="backspace" size={24} color="#666" />
            ) : key === 'OK' ? (
              <Icon name="check" size={28} color="#fff" />
            ) : (
              <Text style={styles.keypadKeyText}>{key}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── SMS Preview ───────────────────────────────────────────────

function renderSMSPreview(
  message: string,
  recipients: SmsContact[],
  onSend: () => void,
  onSkip: () => void,
) {
  return (
    <View style={styles.buttonContainer}>
      <Text style={styles.stepLabel}>Send Update</Text>
      <View style={styles.smsPreview}>
        {/* To field */}
        <View style={styles.smsToRow}>
          <Text style={styles.smsToLabel}>To:</Text>
          <Text style={styles.smsToNames} numberOfLines={2}>
            {recipients.map(c => c.name).join(', ') || 'No recipients configured'}
          </Text>
        </View>
        {/* Message */}
        <ScrollView style={styles.smsMessageBox} nestedScrollEnabled>
          <Text style={styles.smsMessageText}>{message}</Text>
        </ScrollView>
      </View>
      <View style={styles.smsActions}>
        <TouchableOpacity
          style={[styles.smsActionBtn, styles.goodButton]}
          onPress={onSend}
          accessibilityLabel="Send SMS"
          accessibilityRole="button"
        >
          <Icon name="send" size={24} color="#fff" />
          <Text style={styles.smsActionText}>Send</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.smsActionBtn, styles.skipButton]}
          onPress={onSkip}
          accessibilityLabel="Skip sending SMS"
          accessibilityRole="button"
        >
          <Icon name="skip-next" size={24} color="#fff" />
          <Text style={styles.smsActionText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Made / Missed buttons ─────────────────────────────────────

function renderMadeMissed(
  distance: string,
  onMade: () => void,
  onMissed: () => void,
  saving: boolean,
) {
  return (
    <View style={styles.buttonContainer}>
      <Text style={styles.stepLabel}>{distance} ft putt...</Text>
      <View style={styles.madeMissedRow}>
        <TouchableOpacity
          style={[styles.madeMissedBtn, styles.goodButton, saving && styles.disabledButton]}
          onPress={onMade}
          disabled={saving}
          accessibilityLabel="Made it"
          accessibilityRole="button"
        >
          <Icon name="check-circle" size={48} color="#fff" />
          <Text style={styles.madeMissedText}>{saving ? 'Saving...' : 'Made It!'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.madeMissedBtn, styles.badButton, saving && styles.disabledButton]}
          onPress={onMissed}
          disabled={saving}
          accessibilityLabel="Missed it"
          accessibilityRole="button"
        >
          <Icon name="cancel" size={48} color="#fff" />
          <Text style={styles.madeMissedText}>Missed</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────

const S = { green: '#2E7D32', red: '#F44336', white: '#fff', bg: '#f5f5f5' } as const;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: S.bg },
  saveErrorBanner: {
    backgroundColor: '#d32f2f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  saveErrorText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  header: {
    backgroundColor: S.green,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: { padding: 8, marginRight: 8, minWidth: 44, minHeight: 44, justifyContent: 'center' as const },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: S.white },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  undoBtn: {
    padding: 8,
    marginRight: 8,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  scoreColumn: {
    alignItems: 'center',
    gap: 4,
  },
  roundScoreBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 4,
    alignItems: 'center',
  },
  roundScoreValue: { fontSize: 20, fontWeight: 'bold', color: S.white },
  roundScoreLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)' },
  strokeBadge: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 4,
    alignItems: 'center',
  },
  strokeNum: { fontSize: 20, fontWeight: 'bold', color: S.white },
  strokeLabel: { fontSize: 10, color: 'rgba(255,255,255,0.9)' },
  golferTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  golferDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  golferName: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    maxWidth: 70,
  },
  shotLogBar: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  shotLogText: { fontSize: 18, textAlign: 'center', letterSpacing: 4 },
  scrollBody: { flex: 1 },
  bodyContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  buttonContainer: { alignItems: 'center' },
  stepLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },

  // Cross layout (par 3)
  crossLayout: { gap: 8 },
  crossRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  crossSpacer: { width: 80, height: 80 },
  dirButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  diagButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  bbdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 8,
    minHeight: 44,
  },
  bbdLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
  },
  bbdLabelChecked: {
    color: '#2E7D32',
  },
  goodButton: { backgroundColor: S.green },
  badButton: { backgroundColor: S.red },
  disabledButton: { opacity: 0.5 },

  // Fairway layout (par 4/5)
  onGreenRow: { marginBottom: 16, alignItems: 'center' },
  wideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  wideButtonText: { fontSize: 18, fontWeight: 'bold', color: S.white },
  fairwayRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  fairwayButton: {
    paddingVertical: 20,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fairwayColor: { backgroundColor: '#66BB6A' },
  fairwayButtonText: { fontSize: 14, fontWeight: '600', color: S.white },

  // Trouble buttons
  troubleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  troubleButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
    minWidth: 90,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  troubleFairway: { backgroundColor: S.green },
  troubleRough: { backgroundColor: '#8BC34A' },
  troubleBunker: { backgroundColor: '#F4B400' },
  troubleWater: { backgroundColor: '#0288D1' },
  troubleLost: { backgroundColor: '#9E9E9E' },
  troubleOB: { backgroundColor: S.red },
  troubleHazard: { backgroundColor: '#FF9800' },
  troubleButtonText: { fontSize: 13, fontWeight: '600', color: S.white },

  // Chip buttons
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  chipButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  chipBadge: { position: 'absolute', bottom: 14, right: 14 },

  // Putt distance keypad
  distanceDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  distanceText: { fontSize: 48, fontWeight: 'bold', color: '#333' },
  distanceUnit: { fontSize: 20, color: '#666', marginLeft: 8 },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    maxWidth: 280,
  },
  keypadKey: {
    width: 80,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  keypadKeyText: { fontSize: 24, fontWeight: '600', color: '#333' },
  keypadOK: { backgroundColor: S.green },
  keypadDel: { backgroundColor: '#f0f0f0' },

  // SMS Preview
  smsPreview: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxHeight: 400,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  smsToRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 8,
  },
  smsToLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginRight: 8 },
  smsToNames: { fontSize: 14, color: '#333', flex: 1 },
  smsMessageBox: { minHeight: 120, maxHeight: 240 },
  smsMessageText: { fontSize: 15, color: '#333', lineHeight: 22 },
  smsActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  smsActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    elevation: 2,
  },
  smsActionText: { fontSize: 16, fontWeight: '600', color: S.white },
  skipButton: { backgroundColor: '#9E9E9E' },

  // Made / Missed
  madeMissedRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  madeMissedBtn: {
    width: 130,
    height: 130,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  madeMissedText: { fontSize: 16, fontWeight: 'bold', color: S.white, marginTop: 8 },
});

export default HoleScoringScreen;
