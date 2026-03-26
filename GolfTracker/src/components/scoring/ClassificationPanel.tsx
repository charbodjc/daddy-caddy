/**
 * ClassificationPanel — Lie classification after a miss direction.
 * Off-green: Fairway | Rough | Bunker | Trouble | Hazard | Lost
 * Returns null when on green (no classification needed for putts).
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SCORING_COLORS } from './colors';
import { classificationIsPenalty } from '../../hooks/useScoringReducer';
import type { Classification } from '../../hooks/useScoringReducer';

interface ClassificationPanelProps {
  isOnGreen: boolean;
  selected: Classification | null;
  onClassify: (c: Classification) => void;
  disabled?: boolean;
}

interface ClassificationDef {
  key: Classification;
  label: string;
  icon: string;
  color: string;
}

const CLASSIFICATIONS: ClassificationDef[][] = [
  [
    { key: 'fairway', label: 'Fairway', icon: 'landscape', color: SCORING_COLORS.green },
    { key: 'rough', label: 'Rough', icon: 'grass', color: SCORING_COLORS.rough },
    { key: 'bunker', label: 'Bunker', icon: 'beach-access', color: SCORING_COLORS.bunker },
  ],
  [
    { key: 'trouble', label: 'Trouble', icon: 'warning-amber', color: SCORING_COLORS.trouble },
    { key: 'hazard', label: 'Hazard', icon: 'water-drop', color: SCORING_COLORS.hazard },
    { key: 'ob', label: 'OB', icon: 'block', color: SCORING_COLORS.red },
    { key: 'lost', label: 'Lost', icon: 'search-off', color: SCORING_COLORS.lost },
  ],
];

export const ClassificationPanel = React.memo(function ClassificationPanel({
  isOnGreen,
  selected,
  onClassify,
  disabled = false,
}: ClassificationPanelProps) {
  if (isOnGreen) return null;

  return (
    <View style={styles.panel}>
      {CLASSIFICATIONS.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.row}>
          {row.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[
                styles.classButton,
                { backgroundColor: c.color },
                selected === c.key && styles.selected,
                disabled && styles.disabled,
              ]}
              onPress={() => onClassify(c.key)}
              disabled={disabled}
              accessibilityLabel={c.label}
              accessibilityHint={
                c.key === 'hazard' || c.key === 'lost' || c.key === 'ob'
                  ? 'Adds 1 penalty stroke'
                  : `Classify lie as ${c.label.toLowerCase()}`
              }
              accessibilityRole="button"
              accessibilityState={{ disabled, selected: selected === c.key }}
            >
              <Icon name={c.icon} size={24} color={SCORING_COLORS.white} />
              <Text style={styles.classText} adjustsFontSizeToFit numberOfLines={1}>{c.label}</Text>
              {classificationIsPenalty(c.key) && (
                <Text style={styles.penaltyBadge}>+1</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      ))}

    </View>
  );
});

const styles = StyleSheet.create({
  panel: {
    gap: 10,
    marginTop: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  classButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
    minWidth: 95,
    minHeight: 56,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  selected: {
    borderWidth: 3,
    borderColor: SCORING_COLORS.white,
  },
  classText: {
    fontSize: 12,
    fontWeight: '600',
    color: SCORING_COLORS.white,
  },
  penaltyBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  disabled: {
    opacity: SCORING_COLORS.disabledOpacity,
  },
});
