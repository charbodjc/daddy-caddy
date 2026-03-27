/**
 * PuttResult — Putt outcome selector for on-green shots.
 * Made (center) + 4-button miss grid (Long-High, Long-Low, Short-High, Short-Low).
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SCORING_COLORS } from './colors';
import type { PuttMissDistance, PuttMissBreak } from '../../types';

interface PuttResultProps {
  onMade: () => void;
  onMiss: (distance: PuttMissDistance, breakDir: PuttMissBreak) => void;
  disabled?: boolean;
}

export const PuttResult = React.memo(function PuttResult({
  onMade,
  onMiss,
  disabled = false,
}: PuttResultProps) {
  return (
    <View style={styles.container}>
      {/* Made button — prominent center */}
      <TouchableOpacity
        style={[styles.madeButton, disabled && styles.disabled]}
        onPress={onMade}
        disabled={disabled}
        accessibilityLabel="Putt made"
        accessibilityHint="Records a made putt"
        accessibilityRole="button"
        accessibilityState={{ disabled }}
      >
        <Icon name="sports-golf" size={28} color="#fff" />
        <Text style={styles.madeText}>Made</Text>
      </TouchableOpacity>

      {/* Miss grid: 2x2 */}
      <Text style={styles.missLabel}>Missed:</Text>
      <View style={styles.missGrid}>
        <TouchableOpacity
          style={[styles.missButton, styles.missLongHigh, disabled && styles.disabled]}
          onPress={() => onMiss('long', 'high')}
          disabled={disabled}
          accessibilityLabel="Missed long and high"
          accessibilityHint="Records a missed putt that went past the hole on the high side"
          accessibilityRole="button"
          accessibilityState={{ disabled }}
        >
          <Text style={styles.missText} adjustsFontSizeToFit numberOfLines={2}>Long{'\n'}High</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.missButton, styles.missLongLow, disabled && styles.disabled]}
          onPress={() => onMiss('long', 'low')}
          disabled={disabled}
          accessibilityLabel="Missed long and low"
          accessibilityHint="Records a missed putt that went past the hole on the low side"
          accessibilityRole="button"
          accessibilityState={{ disabled }}
        >
          <Text style={styles.missText} adjustsFontSizeToFit numberOfLines={2}>Long{'\n'}Low</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.missButton, styles.missShortHigh, disabled && styles.disabled]}
          onPress={() => onMiss('short', 'high')}
          disabled={disabled}
          accessibilityLabel="Missed short and high"
          accessibilityHint="Records a missed putt that came up short on the high side"
          accessibilityRole="button"
          accessibilityState={{ disabled }}
        >
          <Text style={styles.missText} adjustsFontSizeToFit numberOfLines={2}>Short{'\n'}High</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.missButton, styles.missShortLow, disabled && styles.disabled]}
          onPress={() => onMiss('short', 'low')}
          disabled={disabled}
          accessibilityLabel="Missed short and low"
          accessibilityHint="Records a missed putt that came up short on the low side"
          accessibilityRole="button"
          accessibilityState={{ disabled }}
        >
          <Text style={styles.missText} adjustsFontSizeToFit numberOfLines={2}>Short{'\n'}Low</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
  },
  madeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: SCORING_COLORS.green,
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 16,
    minWidth: 200,
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  madeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  missLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  missGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    maxWidth: 260,
  },
  missButton: {
    width: 120,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  missLongHigh: { backgroundColor: SCORING_COLORS.puttMissLongHigh },
  missLongLow: { backgroundColor: SCORING_COLORS.puttMissLongLow },
  missShortHigh: { backgroundColor: SCORING_COLORS.puttMissShortHigh },
  missShortLow: { backgroundColor: SCORING_COLORS.puttMissShortLow },
  missText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 17,
  },
  disabled: {
    opacity: SCORING_COLORS.disabledOpacity,
  },
});
