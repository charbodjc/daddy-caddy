/**
 * ShotCompass — 8-direction compass with configurable center buttons.
 * Always visible on the scoring screen. Center adapts based on isOnGreen.
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SHOT_RESULTS } from '../../types';
import type { ShotResult } from '../../types';
import { SCORING_COLORS } from './colors';
import { CenterButtons } from './CenterButtons';
import type { CenterResult } from '../../hooks/useScoringReducer';

interface ShotCompassProps {
  isOnGreen: boolean;
  onDirection: (direction: ShotResult) => void;
  onCenter: (result: CenterResult) => void;
  disabled?: boolean;
}

const DIRECTIONS = [
  // Row 1: Long-Left, Long, Long-Right
  [
    { result: SHOT_RESULTS.LONG_LEFT, icon: 'north-west', label: 'Long left' },
    { result: SHOT_RESULTS.LONG, icon: 'arrow-upward', label: 'Long' },
    { result: SHOT_RESULTS.LONG_RIGHT, icon: 'north-east', label: 'Long right' },
  ],
  // Row 2: Left, [CENTER], Right
  [
    { result: SHOT_RESULTS.LEFT, icon: 'arrow-back', label: 'Left' },
    null, // center slot — rendered separately
    { result: SHOT_RESULTS.RIGHT, icon: 'arrow-forward', label: 'Right' },
  ],
  // Row 3: Short-Left, Short, Short-Right
  [
    { result: SHOT_RESULTS.SHORT_LEFT, icon: 'south-west', label: 'Short left' },
    { result: SHOT_RESULTS.SHORT, icon: 'arrow-downward', label: 'Short' },
    { result: SHOT_RESULTS.SHORT_RIGHT, icon: 'south-east', label: 'Short right' },
  ],
] as const;

export const ShotCompass = React.memo(function ShotCompass({
  isOnGreen,
  onDirection,
  onCenter,
  disabled = false,
}: ShotCompassProps) {
  return (
    <View style={styles.compass} accessibilityRole="toolbar" accessibilityLabel="Shot direction compass">
      {DIRECTIONS.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.row}>
          {row.map((btn) => {
            if (btn === null) {
              return (
                <CenterButtons
                  key="center"
                  isOnGreen={isOnGreen}
                  onPress={onCenter}
                  disabled={disabled}
                />
              );
            }
            return (
              <TouchableOpacity
                key={btn.result}
                style={[
                  styles.dirButton,
                  styles.missButton,
                  disabled && styles.disabledButton,
                ]}
                onPress={() => onDirection(btn.result)}
                disabled={disabled}
                accessibilityLabel={btn.label}
                accessibilityHint={`Record shot going ${btn.label.toLowerCase()}`}
                accessibilityRole="button"
                accessibilityState={{ disabled }}
              >
                <Icon
                  name={btn.icon}
                  size={36}
                  color={SCORING_COLORS.white}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  compass: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
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
  missButton: {
    backgroundColor: SCORING_COLORS.red,
  },
  disabledButton: {
    opacity: SCORING_COLORS.disabledOpacity,
  },
});
