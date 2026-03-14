/**
 * ShotTrackingScreen.tsx
 *
 * Shot-by-shot tracking for a hole using Zustand + WatermelonDB.
 * Replaces legacy ShotTrackingScreen with clean architecture.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRoundStore } from '../stores/roundStore';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ErrorScreen } from '../components/common/ErrorScreen';
import { Button } from '../components/common/Button';
import { database } from '../database/watermelon/database';
import Hole from '../database/watermelon/models/Hole';
import {
  TrackedShot,
  ShotData,
  SHOT_TYPES,
  SHOT_RESULTS,
} from '../types';
import { parseShotData, deriveHoleStats, calculateTotalStrokes } from '../utils/roundStats';
import { getResultLabel } from '../utils/shotLabels';
import { formatScoreVsPar } from '../utils/scoreCalculations';
import type { ScoringStackParamList } from '../types/navigation';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';

type NavProp = StackNavigationProp<ScoringStackParamList, 'ShotTracking'>;
type RoutePropT = RouteProp<ScoringStackParamList, 'ShotTracking'>;

// Result options per shot type
const RESULT_OPTIONS: Record<string, { label: string; value: string }[]> = {
  [SHOT_TYPES.TEE_SHOT]: [
    { label: 'Left', value: SHOT_RESULTS.LEFT },
    { label: 'Right', value: SHOT_RESULTS.RIGHT },
    { label: 'Fairway', value: SHOT_RESULTS.CENTER },
    { label: 'Rough', value: SHOT_RESULTS.ROUGH },
    { label: 'Sand', value: SHOT_RESULTS.SAND },
    { label: 'OB', value: SHOT_RESULTS.OB },
  ],
  [SHOT_TYPES.APPROACH]: [
    { label: 'On Green', value: SHOT_RESULTS.GREEN },
    { label: 'Left', value: SHOT_RESULTS.LEFT },
    { label: 'Right', value: SHOT_RESULTS.RIGHT },
    { label: 'Rough', value: SHOT_RESULTS.ROUGH },
    { label: 'Sand', value: SHOT_RESULTS.SAND },
    { label: 'Hazard', value: SHOT_RESULTS.HAZARD },
  ],
  [SHOT_TYPES.PUTT]: [
    { label: 'Made', value: SHOT_RESULTS.MADE },
    { label: 'Missed', value: SHOT_RESULTS.MISSED },
  ],
  [SHOT_TYPES.PENALTY]: [
    { label: 'OB', value: SHOT_RESULTS.OB },
    { label: 'Hazard', value: SHOT_RESULTS.HAZARD },
    { label: 'Lost Ball', value: SHOT_RESULTS.OB },
  ],
};

const SHOT_TYPE_LIST = [
  SHOT_TYPES.TEE_SHOT,
  SHOT_TYPES.APPROACH,
  SHOT_TYPES.PUTT,
  SHOT_TYPES.PENALTY,
];

const ShotTrackingScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropT>();
  const { holeId, roundId, preselectedShotType } = route.params || {};
  const { updateHole } = useRoundStore();

  const [hole, setHole] = useState<Hole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);

  // Shot tracking state
  const [shots, setShots] = useState<TrackedShot[]>([]);
  const [currentStroke, setCurrentStroke] = useState(1);
  const [selectedType, setSelectedType] = useState<string>(SHOT_TYPES.TEE_SHOT);
  const [puttDistance, setPuttDistance] = useState('');

  // Penalty stroke selector (1 or 2) — only shown when Penalty type is selected
  const [penaltyCount, setPenaltyCount] = useState<1 | 2>(1);

  // Derived stats — computed directly from shots, no extra render cycle

  // Load hole data
  useEffect(() => {
    const loadHole = async () => {
      if (!holeId) {
        setError(new Error('No hole ID provided'));
        setLoading(false);
        return;
      }
      try {
        const h = await database.collections.get<Hole>('holes').find(holeId);
        setHole(h);

        // Restore existing shot data if present
        const existing = parseShotData(h.shotData);
        if (existing && existing.shots.length > 0) {
          setShots(existing.shots);
          setCurrentStroke(existing.currentStroke || existing.shots.length + 1);
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    loadHole();
  }, [holeId]);

  // Apply preselected shot type
  useEffect(() => {
    if (preselectedShotType && hole) {
      if (Object.values(SHOT_TYPES).includes(preselectedShotType as typeof SHOT_TYPES[keyof typeof SHOT_TYPES])) {
        setSelectedType(preselectedShotType);
      }
    }
  }, [preselectedShotType, hole]);

  const derivedStats = useMemo(() => {
    if (hole && shots.length > 0) {
      const shotData: ShotData = { par: hole.par, shots, currentStroke };
      return deriveHoleStats(shotData, hole.par);
    }
    return null;
  }, [shots, currentStroke, hole]);

  const addShot = useCallback(
    (result: string) => {
      const isPenalty = selectedType === SHOT_TYPES.PENALTY;
      const newShot: TrackedShot = {
        stroke: currentStroke,
        type: selectedType,
        results: [result],
        ...(selectedType === SHOT_TYPES.PUTT && puttDistance
          ? { puttDistance: `${puttDistance} ft` }
          : {}),
        ...(isPenalty ? { penaltyStrokes: penaltyCount } : {}),
      };

      const updated = [...shots, newShot];
      setShots(updated);
      // Penalty adds 1 (for the entry) + penaltyCount extra strokes to the total,
      // but currentStroke tracks the *next shot number* which always increments by 1.
      setCurrentStroke(currentStroke + 1);
      setPuttDistance('');

      // Auto-advance shot type
      if (selectedType === SHOT_TYPES.TEE_SHOT) {
        if (result === SHOT_RESULTS.GREEN) {
          setSelectedType(SHOT_TYPES.PUTT);
        } else {
          setSelectedType(SHOT_TYPES.APPROACH);
        }
      } else if (selectedType === SHOT_TYPES.APPROACH) {
        if (result === SHOT_RESULTS.GREEN) {
          setSelectedType(SHOT_TYPES.PUTT);
        }
        // Stay on approach if not on green
      } else if (selectedType === SHOT_TYPES.PENALTY) {
        // After penalty, go back to approach
        setSelectedType(SHOT_TYPES.APPROACH);
      }
      // Putt stays on putt
    },
    [currentStroke, selectedType, shots, puttDistance, penaltyCount],
  );

  const undoLastShot = useCallback(() => {
    if (shots.length === 0) return;
    const updated = shots.slice(0, -1);
    setShots(updated);
    setCurrentStroke(currentStroke - 1);
  }, [shots, currentStroke]);

  const handleSave = useCallback(async () => {
    if (!hole || !roundId) return;
    setSaving(true);

    try {
      const shotData: ShotData = { par: hole.par, shots, currentStroke };
      const stats = shots.length > 0 ? deriveHoleStats(shotData, hole.par) : null;
      const totalStrokes = calculateTotalStrokes(shots);

      await updateHole(roundId, {
        holeNumber: hole.holeNumber,
        par: hole.par,
        strokes: totalStrokes,
        fairwayHit: stats?.fairwayHit,
        greenInRegulation: stats?.greenInRegulation,
        putts: stats?.puttsCount,
        shotData: JSON.stringify(shotData),
      });

      navigation.navigate('HoleSummary', { holeId, roundId });
    } catch (err) {
      Alert.alert('Error', 'Failed to save hole data');
    } finally {
      setSaving(false);
    }
  }, [hole, roundId, shots, currentStroke, holeId, navigation, updateHole]);

  if (loading) {
    return <LoadingScreen message="Loading hole data..." />;
  }
  if (error || !hole) {
    return (
      <ErrorScreen
        error={error || new Error('Hole not found')}
        onRetry={() => navigation.goBack()}
      />
    );
  }

  const totalStrokes = calculateTotalStrokes(shots);
  const scoreVsPar = totalStrokes - hole.par;
  const scoreLabel = formatScoreVsPar(scoreVsPar);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
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
        <View style={styles.strokeBadge}>
          <Text style={styles.strokeNum}>{totalStrokes}</Text>
          <Text style={styles.strokeLabel}>{scoreLabel}</Text>
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {/* Shot type selector */}
        <View style={styles.typeRow}>
          {SHOT_TYPE_LIST.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeBtn, selectedType === t && styles.typeBtnActive]}
              onPress={() => setSelectedType(t)}
              accessibilityRole="button"
              accessibilityLabel={`${t}${selectedType === t ? ', selected' : ''}`}
              accessibilityState={{ selected: selectedType === t }}
            >
              <Text
                style={[styles.typeBtnText, selectedType === t && styles.typeBtnTextActive]}
              >
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Putt distance input */}
        {selectedType === SHOT_TYPES.PUTT && (
          <View style={styles.puttRow}>
            <Text style={styles.puttLabel}>Distance (ft):</Text>
            <TextInput
              style={styles.puttInput}
              value={puttDistance}
              onChangeText={setPuttDistance}
              keyboardType="numeric"
              returnKeyType="done"
              placeholder="e.g. 25"
              placeholderTextColor="#999"
              accessibilityLabel="Putt distance in feet"
            />
          </View>
        )}

        {/* Penalty stroke selector */}
        {selectedType === SHOT_TYPES.PENALTY && (
          <View style={styles.penaltyRow}>
            <Text style={styles.puttLabel}>Penalty strokes:</Text>
            <TouchableOpacity
              style={[styles.penaltyBtn, penaltyCount === 1 && styles.penaltyBtnActive]}
              onPress={() => setPenaltyCount(1)}
              accessibilityRole="button"
              accessibilityLabel={`1 stroke penalty${penaltyCount === 1 ? ', selected' : ''}`}
              accessibilityState={{ selected: penaltyCount === 1 }}
            >
              <Text style={[styles.penaltyBtnText, penaltyCount === 1 && styles.penaltyBtnTextActive]}>
                1 stroke
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.penaltyBtn, penaltyCount === 2 && styles.penaltyBtnActive]}
              onPress={() => setPenaltyCount(2)}
              accessibilityRole="button"
              accessibilityLabel={`2 stroke penalty${penaltyCount === 2 ? ', selected' : ''}`}
              accessibilityState={{ selected: penaltyCount === 2 }}
            >
              <Text style={[styles.penaltyBtnText, penaltyCount === 2 && styles.penaltyBtnTextActive]}>
                2 strokes
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Result buttons */}
        <Text style={styles.sectionTitle}>Shot {currentStroke} Result</Text>
        <View style={styles.resultGrid}>
          {(RESULT_OPTIONS[selectedType] || []).map((opt) => (
            <TouchableOpacity
              key={opt.value + opt.label}
              style={styles.resultBtn}
              onPress={() => addShot(opt.value)}
              accessibilityRole="button"
              accessibilityLabel={`${opt.label} result for ${selectedType}`}
            >
              <Text style={styles.resultBtnText}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Shot log */}
        {shots.length > 0 && (
          <View style={styles.logSection}>
            <View style={styles.logHeader}>
              <Text style={styles.sectionTitle}>Shot Log</Text>
              <TouchableOpacity
                onPress={undoLastShot}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Undo last shot"
                accessibilityRole="button"
              >
                <Icon name="undo" size={22} color="#F44336" />
              </TouchableOpacity>
            </View>
            {shots.map((s, i) => (
              <View key={i} style={styles.logItem}>
                <View style={styles.logBullet}>
                  <Text style={styles.logBulletText}>{s.stroke}</Text>
                </View>
                <Text style={styles.logType}>{s.type}</Text>
                <Text style={styles.logResult}>
                  {s.results.map(getResultLabel).join(', ')}
                  {s.puttDistance ? ` (${s.puttDistance})` : ''}
                  {s.penaltyStrokes ? ` +${s.penaltyStrokes}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Derived stats */}
        {derivedStats && (
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>Derived Stats</Text>
            <Text style={styles.statLine}>Putts: {derivedStats.puttsCount}</Text>
            {derivedStats.fairwayHit !== undefined && (
              <Text style={styles.statLine}>
                Fairway: {derivedStats.fairwayHit ? 'Hit' : 'Missed'}
              </Text>
            )}
            <Text style={styles.statLine}>
              GIR: {derivedStats.greenInRegulation ? 'Yes' : 'No'}
            </Text>
            {derivedStats.firstPuttDistanceFeet !== undefined && (
              <Text style={styles.statLine}>
                1st Putt Dist: {derivedStats.firstPuttDistanceFeet} ft
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer actions */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button
          title="Done"
          onPress={handleSave}
          loading={saving}
          disabled={shots.length === 0}
          style={styles.doneBtn}
        />
      </View>
    </View>
  );
};

const S = { green: '#4CAF50', white: '#fff', bg: '#f5f5f5', border: '#e0e0e0' } as const;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: S.bg },
  header: { backgroundColor: S.green, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  backBtn: { padding: 4, marginRight: 12 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: S.white },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  strokeBadge: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6, alignItems: 'center' },
  strokeNum: { fontSize: 22, fontWeight: 'bold', color: S.white },
  strokeLabel: { fontSize: 12, color: 'rgba(255,255,255,0.9)' },
  body: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 32 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#e8e8e8', alignItems: 'center', minHeight: 44 },
  typeBtnActive: { backgroundColor: S.green },
  typeBtnText: { fontSize: 12, fontWeight: '600', color: '#555' },
  typeBtnTextActive: { color: S.white },
  puttRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  penaltyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  penaltyBtn: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#e8e8e8', minHeight: 44 },
  penaltyBtnActive: { backgroundColor: '#F44336' },
  penaltyBtnText: { fontSize: 13, fontWeight: '600', color: '#555' },
  penaltyBtnTextActive: { color: '#fff' },
  puttLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
  puttInput: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, backgroundColor: S.white, color: '#333' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  resultGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  resultBtn: { paddingVertical: 14, paddingHorizontal: 18, backgroundColor: S.green, borderRadius: 10, minWidth: '30%', alignItems: 'center' },
  resultBtnText: { fontSize: 15, fontWeight: '600', color: S.white },
  logSection: { backgroundColor: S.white, borderRadius: 12, padding: 14, marginBottom: 16 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  logItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 },
  logBullet: { width: 26, height: 26, borderRadius: 13, backgroundColor: S.green, alignItems: 'center', justifyContent: 'center' },
  logBulletText: { color: S.white, fontWeight: 'bold', fontSize: 13 },
  logType: { fontSize: 14, fontWeight: '600', color: '#555', width: 80 },
  logResult: { fontSize: 14, color: '#333', flex: 1 },
  statsCard: { backgroundColor: S.white, borderRadius: 12, padding: 14, marginBottom: 16 },
  statLine: { fontSize: 14, color: '#555', marginBottom: 4 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: S.border, backgroundColor: S.white },
  doneBtn: { borderRadius: 10 },
});

export default ShotTrackingScreen;
