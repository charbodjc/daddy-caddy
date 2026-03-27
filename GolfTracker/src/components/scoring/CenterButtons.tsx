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
    width: 110,
    gap: 5,
    alignItems: 'center',
  },
  centerBtn: {
    width: 110,
    minHeight: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  centerSingle: {
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
    fontSize: 13,
    fontWeight: '700',
    color: SCORING_COLORS.white,
    textAlign: 'center',
    marginTop: 2,
  },
  buttonTextSmall: {
    fontSize: 15,
    fontWeight: '700',
    color: SCORING_COLORS.white,
  },
  disabled: {
    opacity: SCORING_COLORS.disabledOpacity,
  },
});
