/**
 * DistanceKeypad — Numeric keypad for entering distance.
 * Supports feet (on green) or yards (off green).
 */

import React, { useState, useCallback, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SCORING_COLORS } from './colors';

const MAX_DIGITS = 3;

interface DistanceKeypadProps {
  unit: 'ft' | 'yds';
  onSubmit: (value: string) => void;
  onSkip: () => void;
  contextLabel?: string;
}

export const DistanceKeypad = React.memo(function DistanceKeypad({
  unit,
  onSubmit,
  onSkip,
  contextLabel,
}: DistanceKeypadProps) {
  const [value, setValue] = useState('');
  const valueRef = useRef('');

  const handleKey = useCallback((key: string) => {
    if (key === 'del') {
      setValue(prev => {
        const next = prev.slice(0, -1);
        valueRef.current = next;
        return next;
      });
    } else if (key === 'OK') {
      if (valueRef.current) onSubmit(valueRef.current);
    } else {
      setValue(prev => {
        const next = prev.length < MAX_DIGITS ? prev + key : prev;
        valueRef.current = next;
        return next;
      });
    }
  }, [onSubmit]);

  return (
    <View style={styles.container}>
      {contextLabel && (
        <Text style={styles.contextLabel}>{contextLabel}</Text>
      )}
      <Text style={styles.prompt}>
        {unit === 'ft' ? 'How far from the pin?' : 'Distance remaining?'}
      </Text>

      <View style={styles.display} accessibilityLabel={`${value || '0'} ${unit === 'ft' ? 'feet' : 'yards'}`} accessibilityLiveRegion="polite">
        <Text style={styles.displayText}>{value || '0'}</Text>
        <Text style={styles.displayUnit}>{unit}</Text>
      </View>

      <View style={styles.keypad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'OK'].map((key) => {
          const isOk = key === 'OK';
          const okDisabled = isOk && !value;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.key,
                isOk && styles.okKey,
                key === 'del' && styles.delKey,
                okDisabled && styles.okDisabled,
              ]}
              onPress={() => handleKey(key)}
              disabled={okDisabled}
              accessibilityLabel={key === 'del' ? 'Delete' : isOk ? 'Submit distance' : key}
              accessibilityRole="button"
              accessibilityState={okDisabled ? { disabled: true } : undefined}
            >
              {key === 'del' ? (
                <Icon name="backspace" size={24} color="#666" />
              ) : isOk ? (
                <Icon name="check" size={28} color="#fff" />
              ) : (
                <Text style={styles.keyText} adjustsFontSizeToFit numberOfLines={1}>{key}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={styles.skipBtn}
        onPress={onSkip}
        accessibilityLabel="Skip distance entry"
        accessibilityRole="button"
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  contextLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
    textAlign: 'center',
  },
  prompt: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  display: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  displayText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
  },
  displayUnit: {
    fontSize: 20,
    color: '#666',
    marginLeft: 8,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    maxWidth: 280,
  },
  key: {
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
  keyText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  okKey: {
    backgroundColor: SCORING_COLORS.green,
  },
  okDisabled: {
    opacity: 0.3,
  },
  delKey: {
    backgroundColor: '#f0f0f0',
  },
  skipBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    minHeight: 44,
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
});
