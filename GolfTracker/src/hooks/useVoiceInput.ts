/**
 * useVoiceInput.ts
 *
 * Custom hook wrapping expo-speech-recognition for on-device speech recognition.
 * Provides tap-to-start/tap-to-stop recording with live partial transcripts.
 * Works offline using native iOS SFSpeechRecognizer / Android SpeechRecognizer.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

export interface UseVoiceInputReturn {
  isListening: boolean;
  transcript: string;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  isAvailable: boolean;
}

export function useVoiceInput(): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);

  const mountedRef = useRef(true);

  // Check availability on mount
  useEffect(() => {
    mountedRef.current = true;

    const available = ExpoSpeechRecognitionModule.isRecognitionAvailable();
    setIsAvailable(available);

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Listen for results (partial and final)
  useSpeechRecognitionEvent('result', (event) => {
    if (!mountedRef.current) return;
    const text = event.results[0]?.transcript ?? '';
    setTranscript(text);
    if (event.isFinal) {
      setIsListening(false);
    }
  });

  // Listen for errors
  useSpeechRecognitionEvent('error', (event) => {
    if (!mountedRef.current) return;

    if (event.error === 'not-allowed') {
      setIsAvailable(false);
      setError('Microphone permission denied. Enable in Settings.');
    } else if (event.error === 'no-speech' || event.error === 'speech-timeout') {
      setError('No speech detected. Try again.');
    } else {
      setError(event.message || 'Speech recognition error');
    }
    setIsListening(false);
  });

  // Listen for end
  useSpeechRecognitionEvent('end', () => {
    if (!mountedRef.current) return;
    setIsListening(false);
  });

  const startListening = useCallback(async () => {
    if (!isAvailable) {
      setError('Voice input is not available on this device.');
      return;
    }

    setError(null);
    setTranscript('');

    try {
      // Request permissions explicitly (needed on Android)
      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) {
        setIsAvailable(false);
        setError('Microphone permission denied. Enable in Settings.');
        return;
      }

      ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true });
      setIsListening(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start voice input';
      setError(msg);
    }
  }, [isAvailable]);

  const stopListening = useCallback(async () => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // Ignore stop errors — may already be stopped
    }
    setIsListening(false);
  }, []);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    isAvailable,
  };
}
