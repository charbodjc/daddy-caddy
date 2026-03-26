/**
 * CenterButtons — The center slot of the compass.
 * Off-green: Fairway | Green | In The Hole (stacked vertically to fit compass center)
 * On-green: In The Hole only
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SCORING_COLORS } from './colors';
import type { CenterResult } from '../../hooks/useScoringReducer';

interface CenterButtonsProps {
  isOnGreen: boolean;
  onPress: (result: CenterResult) => void;
  disabled?: boolean;
}

export const CenterButtons = React.memo(function CenterButtons({
  isOnGreen,
  onPress,
  disabled = false,
}: CenterButtonsProps) {
  if (isOnGreen) {
    return (
      <TouchableOpacity
        style={[styles.centerSingle, styles.holeButton, disabled && styles.disabled]}
        onPress={() => onPress('hole')}
        disabled={disabled}
        accessibilityLabel="In the hole"
        accessibilityHint="Record the ball going in the hole to complete this hole"
        accessibilityRole="button"
        accessibilityState={{ disabled }}
      >
        <Icon name="flag" size={24} color={SCORING_COLORS.white} />
        <Text style={styles.buttonText} adjustsFontSizeToFit numberOfLines={2}>In The{'\n'}Hole</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.centerStack}>
      <TouchableOpacity
        style={[styles.centerBtn, styles.fairwayBtn, disabled && styles.disabled]}
        onPress={() => onPress('fairway')}
        disabled={disabled}
        hitSlop={{ top: 6, bottom: 2, left: 4, right: 4 }}
        accessibilityLabel="Fairway"
        accessibilityHint="Record shot landing in the fairway"
        accessibilityRole="button"
        accessibilityState={{ disabled }}
      >
        <Text style={styles.buttonTextSmall} adjustsFontSizeToFit numberOfLines={1}>Fairway</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.centerBtn, styles.greenBtn, disabled && styles.disabled]}
        onPress={() => onPress('green')}
        disabled={disabled}
        hitSlop={{ top: 2, bottom: 2, left: 4, right: 4 }}
        accessibilityLabel="Green"
        accessibilityHint="Record shot landing on the green"
        accessibilityRole="button"
        accessibilityState={{ disabled }}
      >
        <Text style={styles.buttonTextSmall} adjustsFontSizeToFit numberOfLines={1}>Green</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.centerBtn, styles.holeSmallBtn, disabled && styles.disabled]}
        onPress={() => onPress('hole')}
        disabled={disabled}
        hitSlop={{ top: 2, bottom: 6, left: 4, right: 4 }}
        accessibilityLabel="In the hole"
        accessibilityHint="Record the ball going in the hole"
        accessibilityRole="button"
        accessibilityState={{ disabled }}
      >
        <Text style={styles.buttonTextSmall} adjustsFontSizeToFit numberOfLines={1}>Hole!</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  centerStack: {
    width: 90,
    gap: 2,
    alignItems: 'center',
  },
  centerBtn: {
    width: 90,
    minHeight: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  centerSingle: {
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
  fairwayBtn: {
    backgroundColor: SCORING_COLORS.fairway,
  },
  greenBtn: {
    backgroundColor: SCORING_COLORS.greenBtn,
  },
  holeSmallBtn: {
    backgroundColor: SCORING_COLORS.hole,
  },
  holeButton: {
    backgroundColor: SCORING_COLORS.hole,
  },
  buttonText: {
    fontSize: 11,
    fontWeight: '700',
    color: SCORING_COLORS.white,
    textAlign: 'center',
    marginTop: 2,
  },
  buttonTextSmall: {
    fontSize: 11,
    fontWeight: '700',
    color: SCORING_COLORS.white,
  },
  disabled: {
    opacity: SCORING_COLORS.disabledOpacity,
  },
});
