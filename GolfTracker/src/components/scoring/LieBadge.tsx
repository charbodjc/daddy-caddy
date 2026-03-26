/**
 * LieBadge — Tappable lie indicator + swing toggle in the scoring header.
 * Shows current lie with color and icon. Tap to cycle through lies.
 * Swing toggle defaults to "Free"; tap to switch to "Restricted".
 */

import React, { useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LIE_TYPES, SWING_TYPES } from '../../types';
import type { LieType, SwingType } from '../../types';
import { lieLabel, lieColor, lieIcon } from '../../utils/shotDataV2Helpers';

const LIE_CYCLE: LieType[] = [
  LIE_TYPES.TEE, LIE_TYPES.FAIRWAY, LIE_TYPES.ROUGH,
  LIE_TYPES.SAND, LIE_TYPES.GREEN, LIE_TYPES.TROUBLE,
];

interface LieBadgeProps {
  lie: LieType;
  swing: SwingType;
  stroke: number;
  onSetLie: (lie: LieType) => void;
  onToggleSwing: () => void;
  disabled?: boolean;
}

export const LieBadge = React.memo(function LieBadge({
  lie,
  swing,
  stroke,
  onSetLie,
  onToggleSwing,
  disabled = false,
}: LieBadgeProps) {
  const handleLieTap = useCallback(() => {
    const idx = LIE_CYCLE.indexOf(lie);
    const next = LIE_CYCLE[(idx + 1) % LIE_CYCLE.length];
    onSetLie(next);
  }, [lie, onSetLie]);

  const isRestricted = swing === SWING_TYPES.RESTRICTED;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.lieBadge, { backgroundColor: lieColor(lie) }]}
        onPress={handleLieTap}
        disabled={disabled}
        accessibilityLabel={`Shot ${stroke}, lie: ${lieLabel(lie)}. Tap to change.`}
        accessibilityRole="button"
        accessibilityHint="Cycles through lie types: tee, fairway, rough, bunker, green, trouble"
        accessibilityState={{ disabled }}
      >
        <Icon name={lieIcon(lie)} size={18} color="#fff" />
        <Text style={styles.lieText}>Shot {stroke} — {lieLabel(lie)}</Text>
        <Icon name="expand-more" size={16} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.swingToggle, isRestricted && styles.swingRestricted, disabled && styles.disabledToggle]}
        onPress={onToggleSwing}
        disabled={disabled}
        accessibilityLabel={`Swing: ${swing}. Tap to toggle.`}
        accessibilityRole="button"
        accessibilityHint={isRestricted ? 'Switch to free swing' : 'Switch to restricted swing'}
        accessibilityState={{ disabled }}
      >
        <Icon
          name={isRestricted ? 'do-not-disturb' : 'open-in-full'}
          size={16}
          color={isRestricted ? '#fff' : '#555'}
        />
        <Text style={[styles.swingText, isRestricted && styles.swingTextRestricted]}>
          {isRestricted ? 'Restricted' : 'Free'}
        </Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  lieBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    flex: 1,
    minHeight: 44,
  },
  lieText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  swingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    minHeight: 44,
  },
  disabledToggle: {
    opacity: 0.5,
  },
  swingRestricted: {
    backgroundColor: '#E65100',
  },
  swingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  swingTextRestricted: {
    color: '#fff',
  },
});
