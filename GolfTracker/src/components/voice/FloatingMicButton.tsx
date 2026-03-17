/**
 * FloatingMicButton.tsx
 *
 * Floating action button for voice shot input.
 * Tap to start listening, tap again to stop.
 * Shows live transcript while listening.
 * Hidden when voice input is unavailable (permission denied / not supported).
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { parseGolfVoice } from '../../utils/golfVoiceParser';
import type { TrackedShot } from '../../types';
import type { ShotContext } from '../../utils/shotStateMachine';

const MIN_TRANSCRIPT_LENGTH = 2;

interface FloatingMicButtonProps {
  onShotRecorded: (shot: TrackedShot) => void;
  shotContext: ShotContext;
  disabled?: boolean;
  onError?: (message: string) => void;
}

const FloatingMicButtonInner: React.FC<FloatingMicButtonProps> = ({
  onShotRecorded,
  shotContext,
  disabled = false,
  onError,
}) => {
  const {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    isAvailable,
  } = useVoiceInput();

  // Pulsing animation for recording state
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isListening) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      );
      animRef.current = anim;
      anim.start();
    } else {
      animRef.current?.stop();
      animRef.current = null;
      pulseAnim.setValue(1);
    }

    return () => {
      animRef.current?.stop();
    };
  }, [isListening, pulseAnim]);

  // Parse transcript when listening stops
  const wasListeningRef = useRef(false);

  useEffect(() => {
    if (wasListeningRef.current && !isListening && transcript.length >= MIN_TRANSCRIPT_LENGTH) {
      const parseResult = parseGolfVoice(transcript, shotContext);

      if (parseResult) {
        const shot: TrackedShot = {
          stroke: shotContext.shotNumber,
          type: parseResult.shotType,
          results: [parseResult.result],
          ...(parseResult.puttDistance ? { puttDistance: parseResult.puttDistance } : {}),
          ...(parseResult.penaltyStrokes ? { penaltyStrokes: parseResult.penaltyStrokes } : {}),
        };
        onShotRecorded(shot);
      } else {
        onError?.(`Couldn't parse: "${transcript}". Try tapping a button instead.`);
      }
    }
    wasListeningRef.current = isListening;
  }, [isListening, transcript, shotContext, onShotRecorded, onError]);

  // Surface voice errors
  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  const handlePress = useCallback(async () => {
    if (isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Don't render if voice is unavailable
  if (!isAvailable) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Live transcript bubble */}
      {isListening && transcript.length > 0 && (
        <View style={styles.transcriptBubble} accessibilityLiveRegion="polite">
          <Text style={styles.transcriptText} numberOfLines={2}>
            {transcript}
          </Text>
        </View>
      )}

      {/* Listening indicator */}
      {isListening && !transcript && (
        <View style={styles.transcriptBubble} accessibilityLiveRegion="polite">
          <Text style={styles.transcriptHint}>Listening...</Text>
        </View>
      )}

      {/* FAB */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={[
            styles.fab,
            isListening && styles.fabRecording,
            disabled && styles.fabDisabled,
          ]}
          onPress={handlePress}
          disabled={disabled}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={isListening ? 'Stop voice input' : 'Start voice input'}
          accessibilityHint="Double tap to start or stop voice shot entry"
          accessibilityState={{ disabled }}
        >
          <Icon
            name={isListening ? 'stop' : 'mic'}
            size={28}
            color="#fff"
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export const FloatingMicButton = React.memo(FloatingMicButtonInner);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    alignItems: 'flex-end',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
  fabRecording: {
    backgroundColor: '#F44336',
  },
  fabDisabled: {
    opacity: 0.5,
  },
  transcriptBubble: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 8,
    maxWidth: 220,
  },
  transcriptText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  transcriptHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontStyle: 'italic',
  },
});
