/**
 * HoleSummary — Post-hole review screen showing each shot with
 * editable distance and result columns.
 * Displayed after hole completion, before the SMS send/skip decision.
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SCORING_COLORS } from './colors';
import { SHOT_OUTCOMES, LIE_TYPES } from '../../types';
import type { TrackedShotV2, LieType, ShotOutcome } from '../../types';
import { lieLabel, calculateTotalStrokesV2 } from '../../utils/shotDataV2Helpers';

interface HoleSummaryProps {
  holeNumber: number;
  par: number;
  shots: TrackedShotV2[];
  onSend: (editedShots: TrackedShotV2[]) => void;
  onSkip: (editedShots: TrackedShotV2[]) => void;
}

function formatResult(shot: TrackedShotV2): string {
  if (shot.outcome === SHOT_OUTCOMES.HOLED) return 'Holed';
  if (shot.outcome === SHOT_OUTCOMES.ON_TARGET) {
    if (shot.resultLie) return lieLabel(shot.resultLie);
    return 'On target';
  }
  if (shot.outcome === SHOT_OUTCOMES.PENALTY) {
    return shot.penaltyType?.toUpperCase() ?? 'Penalty';
  }
  if (shot.outcome === SHOT_OUTCOMES.MISSED) {
    if (shot.lie === LIE_TYPES.GREEN) {
      const parts = [shot.puttMissDistance, shot.puttMissBreak, shot.missDirection?.replace('_', ' ')].filter(Boolean);
      return `Missed ${parts.join(' ') || 'putt'}`;
    }
    const dir = shot.missDirection?.replace('_', ' ') ?? '';
    const resultLieName = shot.resultLie ? lieLabel(shot.resultLie) : '';
    return `${dir} ${resultLieName}`.trim() || 'Missed';
  }
  return '—';
}

function formatDistance(shot: TrackedShotV2): string {
  if (shot.distanceToHole === undefined) return '—';
  return `${shot.distanceToHole} ${shot.distanceUnit}`;
}

interface ResultOption {
  label: string;
  outcome: ShotOutcome;
  resultLie?: LieType;
}

function getResultOptions(shot: TrackedShotV2, isLastShot: boolean): ResultOption[] {
  const isOnGreen = shot.lie === LIE_TYPES.GREEN;
  if (isOnGreen) {
    // Last shot must stay holed — only allow editing non-last putts
    if (isLastShot) {
      return [{ label: 'Holed', outcome: SHOT_OUTCOMES.HOLED }];
    }
    return [
      { label: 'Holed', outcome: SHOT_OUTCOMES.HOLED },
      { label: 'Missed', outcome: SHOT_OUTCOMES.MISSED },
    ];
  }
  const options: ResultOption[] = [
    { label: 'Holed', outcome: SHOT_OUTCOMES.HOLED },
    { label: 'Green', outcome: SHOT_OUTCOMES.ON_TARGET, resultLie: LIE_TYPES.GREEN },
    { label: 'Fairway', outcome: SHOT_OUTCOMES.ON_TARGET, resultLie: LIE_TYPES.FAIRWAY },
    { label: 'Rough', outcome: SHOT_OUTCOMES.MISSED, resultLie: LIE_TYPES.ROUGH },
    { label: 'Sand', outcome: SHOT_OUTCOMES.MISSED, resultLie: LIE_TYPES.SAND },
    { label: 'Trouble', outcome: SHOT_OUTCOMES.MISSED, resultLie: LIE_TYPES.TROUBLE },
  ];
  return options;
}

function isOptionActive(opt: ResultOption, shot: TrackedShotV2): boolean {
  if (opt.outcome !== shot.outcome) return false;
  if (opt.outcome === SHOT_OUTCOMES.HOLED) return true;
  return opt.resultLie === shot.resultLie;
}

function ResultPicker({ shot, idx, isLastShot, onPick }: {
  shot: TrackedShotV2;
  idx: number;
  isLastShot: boolean;
  onPick: (idx: number, outcome: ShotOutcome, resultLie?: LieType) => void;
}) {
  const options = getResultOptions(shot, isLastShot);
  return (
    <View style={styles.resultPicker}>
      {options.map(opt => {
        const active = isOptionActive(opt, shot);
        return (
          <TouchableOpacity
            key={opt.label}
            style={[styles.resultOption, active && styles.resultOptionActive]}
            onPress={() => onPick(idx, opt.outcome, opt.resultLie)}
            accessibilityLabel={`Change result to ${opt.label}`}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.resultOptionText, active && styles.resultOptionTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export const HoleSummary = React.memo(function HoleSummary({
  holeNumber,
  par,
  shots,
  onSend,
  onSkip,
}: HoleSummaryProps) {
  const [editedShots, setEditedShots] = useState<TrackedShotV2[]>(() => [...shots]);
  const [editingDistance, setEditingDistance] = useState<number | null>(null);
  const [distanceInput, setDistanceInput] = useState('');
  const savingDistanceRef = useRef(false);
  const [editingResult, setEditingResult] = useState<number | null>(null);

  const totalStrokes = useMemo(() => calculateTotalStrokesV2(editedShots), [editedShots]);
  const scoreVsPar = totalStrokes - par;
  const scoreLabel = scoreVsPar === 0 ? 'E' : scoreVsPar > 0 ? `+${scoreVsPar}` : `${scoreVsPar}`;

  const handleEditDistance = useCallback((idx: number) => {
    const shot = editedShots[idx];
    setDistanceInput(shot.distanceToHole !== undefined ? String(shot.distanceToHole) : '');
    setEditingDistance(idx);
    savingDistanceRef.current = false;
  }, [editedShots]);

  const handleSaveDistance = useCallback((idx: number) => {
    if (savingDistanceRef.current) return;
    savingDistanceRef.current = true;

    const value = distanceInput.trim();
    setEditedShots(prev => {
      const next = [...prev];
      const shot = { ...next[idx] };
      const num = Number(value);
      if (value && !isNaN(num) && num > 0) {
        shot.distanceToHole = num;
      } else {
        shot.distanceToHole = undefined;
      }
      next[idx] = shot;
      return next;
    });
    setEditingDistance(null);
    setDistanceInput('');
  }, [distanceInput]);

  const handleEditResult = useCallback((idx: number) => {
    setEditingResult(idx);
    setEditingDistance(null);
  }, []);

  const handlePickResult = useCallback((idx: number, outcome: ShotOutcome, resultLie?: LieType) => {
    setEditedShots(prev => {
      const next = [...prev];
      const shot = { ...next[idx] };
      shot.outcome = outcome;
      shot.resultLie = outcome === SHOT_OUTCOMES.HOLED ? undefined : resultLie;
      shot.missDirection = undefined;
      shot.puttMissDistance = undefined;
      shot.puttMissBreak = undefined;
      shot.penaltyType = undefined;
      shot.penaltyStrokes = undefined;
      next[idx] = shot;

      // If changed to Holed, truncate all subsequent shots
      if (outcome === SHOT_OUTCOMES.HOLED) {
        return next.slice(0, idx + 1);
      }

      // Cascade resultLie to next shot's lie and distanceUnit
      if (idx + 1 < next.length && resultLie) {
        const nextShot = { ...next[idx + 1] };
        nextShot.lie = resultLie;
        nextShot.distanceUnit = resultLie === LIE_TYPES.GREEN ? 'ft' : 'yds';
        next[idx + 1] = nextShot;
      }

      return next;
    });
    setEditingResult(null);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Hole {holeNumber} Summary
      </Text>
      <Text style={styles.scoreLine}>
        Score: {totalStrokes} ({scoreLabel})
      </Text>

      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, styles.shotCol]}>#</Text>
        <Text style={styles.editSpacer} />
        <Text style={[styles.headerCell, styles.distCol]}>Distance</Text>
        <Text style={styles.editSpacer} />
        <Text style={[styles.headerCell, styles.resultCol]}>Result</Text>
      </View>

      <ScrollView style={styles.shotList} nestedScrollEnabled accessibilityRole="list">
        {editedShots.map((shot, idx) => (
          <View key={shot.stroke}>
            <View
              style={styles.shotRow}
              accessible
              accessibilityLabel={`Shot ${shot.stroke}: ${formatDistance(shot)}, ${formatResult(shot)}`}
            >
              <Text style={[styles.cell, styles.shotCol]}>{shot.stroke}</Text>

              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => editingDistance === idx ? handleSaveDistance(idx) : handleEditDistance(idx)}
                accessibilityLabel={`Edit distance for shot ${shot.stroke}`}
                accessibilityRole="button"
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Icon name={editingDistance === idx ? 'check' : 'edit'} size={18} color="#888" />
              </TouchableOpacity>

              {editingDistance === idx ? (
                <View style={[styles.editContainer, styles.distCol]}>
                  <TextInput
                    style={styles.editInput}
                    value={distanceInput}
                    onChangeText={setDistanceInput}
                    keyboardType="number-pad"
                    autoFocus
                    maxLength={3}
                    onSubmitEditing={() => handleSaveDistance(idx)}
                    accessibilityLabel={`Distance in ${shot.distanceUnit}`}
                  />
                  <Text style={styles.unitLabel}>{shot.distanceUnit}</Text>
                </View>
              ) : (
                <Text style={[styles.cell, styles.distCol]}>{formatDistance(shot)}</Text>
              )}

              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => editingResult === idx ? setEditingResult(null) : handleEditResult(idx)}
                accessibilityLabel={`Edit result for shot ${shot.stroke}`}
                accessibilityRole="button"
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Icon name={editingResult === idx ? 'close' : 'edit'} size={18} color="#888" />
              </TouchableOpacity>

              <Text style={[styles.cell, styles.resultCol]} numberOfLines={1}>
                {formatResult(shot)}
              </Text>
            </View>

            {editingResult === idx && (
              <ResultPicker
                shot={shot}
                idx={idx}
                isLastShot={idx === editedShots.length - 1}
                onPick={handlePickResult}
              />
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.sendBtn]}
          onPress={() => onSend(editedShots)}
          accessibilityLabel="Send score update"
          accessibilityRole="button"
        >
          <Icon name="send" size={22} color={SCORING_COLORS.white} />
          <Text style={styles.actionText}>Send</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.skipBtn]}
          onPress={() => onSkip(editedShots)}
          accessibilityLabel="Skip sending and continue"
          accessibilityRole="button"
        >
          <Icon name="skip-next" size={22} color={SCORING_COLORS.white} />
          <Text style={styles.actionText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  scoreLine: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginBottom: 4,
  },
  headerCell: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  shotCol: {
    width: 28,
    textAlign: 'center',
  },
  distCol: {
    flex: 1,
  },
  resultCol: {
    flex: 1.5,
  },
  editSpacer: {
    width: 44,
  },
  shotList: {
    flex: 1,
    marginBottom: 16,
  },
  shotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8e8e8',
  },
  cell: {
    fontSize: 15,
    color: '#333',
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: SCORING_COLORS.green,
    paddingVertical: 2,
    paddingHorizontal: 4,
    minHeight: 32,
  },
  unitLabel: {
    fontSize: 12,
    color: '#888',
  },
  editBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 28,
    paddingBottom: 12,
  },
  resultOption: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 44,
    justifyContent: 'center' as const,
  },
  resultOptionActive: {
    backgroundColor: SCORING_COLORS.green,
    borderColor: SCORING_COLORS.green,
  },
  resultOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  resultOptionTextActive: {
    color: SCORING_COLORS.white,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    minHeight: 44,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  sendBtn: {
    backgroundColor: SCORING_COLORS.green,
  },
  skipBtn: {
    backgroundColor: SCORING_COLORS.skip,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: SCORING_COLORS.white,
  },
});
