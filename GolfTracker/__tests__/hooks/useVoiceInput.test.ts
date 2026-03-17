import { renderHook, act } from '@testing-library/react-native';

// Capture event handlers registered via useSpeechRecognitionEvent
const eventHandlers: Record<string, (event: any) => void> = {};

const mockStart = jest.fn();
const mockStop = jest.fn();
const mockIsRecognitionAvailable = jest.fn().mockReturnValue(true);
const mockRequestPermissions = jest.fn().mockResolvedValue({ granted: true });

jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    start: (...args: any[]) => mockStart(...args),
    stop: (...args: any[]) => mockStop(...args),
    isRecognitionAvailable: () => mockIsRecognitionAvailable(),
    requestPermissionsAsync: () => mockRequestPermissions(),
  },
  useSpeechRecognitionEvent: (event: string, handler: (e: any) => void) => {
    eventHandlers[event] = handler;
  },
}));

import { useVoiceInput } from '../../src/hooks/useVoiceInput';

describe('useVoiceInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(eventHandlers).forEach(k => delete eventHandlers[k]);
    mockIsRecognitionAvailable.mockReturnValue(true);
    mockRequestPermissions.mockResolvedValue({ granted: true });
  });

  it('initializes with idle state', () => {
    const { result } = renderHook(() => useVoiceInput());

    expect(result.current.isListening).toBe(false);
    expect(result.current.transcript).toBe('');
    expect(result.current.error).toBeNull();
    expect(result.current.isAvailable).toBe(true);
  });

  it('starts listening when startListening is called', async () => {
    const { result } = renderHook(() => useVoiceInput());

    await act(async () => {
      await result.current.startListening();
    });

    expect(mockRequestPermissions).toHaveBeenCalled();
    expect(mockStart).toHaveBeenCalledWith({ lang: 'en-US', interimResults: true });
    expect(result.current.isListening).toBe(true);
  });

  it('stops listening when stopListening is called', async () => {
    const { result } = renderHook(() => useVoiceInput());

    await act(async () => {
      await result.current.startListening();
    });

    await act(async () => {
      await result.current.stopListening();
    });

    expect(mockStop).toHaveBeenCalled();
    expect(result.current.isListening).toBe(false);
  });

  it('updates transcript on partial results', async () => {
    const { result } = renderHook(() => useVoiceInput());

    await act(async () => {
      await result.current.startListening();
    });

    act(() => {
      eventHandlers['result']?.({
        isFinal: false,
        results: [{ transcript: 'fair' }],
      });
    });

    expect(result.current.transcript).toBe('fair');
  });

  it('updates transcript and stops on final results', async () => {
    const { result } = renderHook(() => useVoiceInput());

    await act(async () => {
      await result.current.startListening();
    });

    act(() => {
      eventHandlers['result']?.({
        isFinal: true,
        results: [{ transcript: 'on the green' }],
      });
    });

    expect(result.current.transcript).toBe('on the green');
    expect(result.current.isListening).toBe(false);
  });

  it('handles speech error', async () => {
    const { result } = renderHook(() => useVoiceInput());

    await act(async () => {
      await result.current.startListening();
    });

    act(() => {
      eventHandlers['error']?.({ error: 'network', message: 'Network error' });
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.isListening).toBe(false);
  });

  it('marks unavailable on permission denied', async () => {
    const { result } = renderHook(() => useVoiceInput());

    await act(async () => {
      await result.current.startListening();
    });

    act(() => {
      eventHandlers['error']?.({ error: 'not-allowed', message: 'Permission denied' });
    });

    expect(result.current.isAvailable).toBe(false);
    expect(result.current.isListening).toBe(false);
  });

  it('sets isAvailable false when recognition not supported', () => {
    mockIsRecognitionAvailable.mockReturnValue(false);
    const { result } = renderHook(() => useVoiceInput());

    expect(result.current.isAvailable).toBe(false);
  });

  it('handles permission denied on start', async () => {
    mockRequestPermissions.mockResolvedValue({ granted: false });
    const { result } = renderHook(() => useVoiceInput());

    await act(async () => {
      await result.current.startListening();
    });

    expect(result.current.isAvailable).toBe(false);
    expect(result.current.error).toBe('Microphone permission denied. Enable in Settings.');
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('handles no-speech timeout', async () => {
    const { result } = renderHook(() => useVoiceInput());

    await act(async () => {
      await result.current.startListening();
    });

    act(() => {
      eventHandlers['error']?.({ error: 'no-speech', message: '' });
    });

    expect(result.current.error).toBe('No speech detected. Try again.');
  });
});
