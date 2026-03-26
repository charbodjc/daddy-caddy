/**
 * CommitDescribeBar — Primary action buttons after selecting a result.
 * Commit (green/primary) records the shot.
 * Describe (outlined/secondary) opens the classification panel.
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SCORING_COLORS } from './colors';

interface CommitDescribeBarProps {
  onCommit: () => void;
  onDescribe?: () => void;
  canCommit: boolean;
  showDescribe?: boolean;
  commitLabel?: string;
  disabled?: boolean;
}

export const CommitDescribeBar = React.memo(function CommitDescribeBar({
  onCommit,
  onDescribe,
  canCommit,
  showDescribe = true,
  commitLabel = 'Commit',
  disabled = false,
}: CommitDescribeBarProps) {
  const commitDisabled = !canCommit || disabled;

  return (
    <View style={styles.bar}>
      <TouchableOpacity
        style={[
          styles.commitBtn,
          commitDisabled && styles.disabled,
        ]}
        onPress={onCommit}
        disabled={commitDisabled}
        accessibilityLabel={commitLabel}
        accessibilityHint="Record this shot and move to the next"
        accessibilityRole="button"
        accessibilityState={{ disabled: commitDisabled }}
      >
        <Icon name="check" size={24} color={SCORING_COLORS.white} />
        <Text style={styles.commitText}>{commitLabel}</Text>
      </TouchableOpacity>

      {showDescribe && onDescribe && (
        <TouchableOpacity
          style={[styles.describeBtn, disabled && styles.disabled]}
          onPress={onDescribe}
          disabled={disabled}
          accessibilityLabel="Describe"
          accessibilityHint="Add details about where the ball ended up"
          accessibilityRole="button"
          accessibilityState={{ disabled }}
        >
          <Icon name="edit-note" size={24} color={SCORING_COLORS.green} />
          <Text style={styles.describeText}>Describe</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 20,
  },
  commitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: SCORING_COLORS.green,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  commitText: {
    fontSize: 16,
    fontWeight: '700',
    color: SCORING_COLORS.white,
  },
  describeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: SCORING_COLORS.green,
    backgroundColor: SCORING_COLORS.white,
  },
  describeText: {
    fontSize: 16,
    fontWeight: '700',
    color: SCORING_COLORS.green,
  },
  disabled: {
    opacity: SCORING_COLORS.disabledOpacity,
  },
});
