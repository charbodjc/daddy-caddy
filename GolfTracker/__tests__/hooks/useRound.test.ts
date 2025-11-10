import { renderHook, act, waitFor } from '@testing-library/react-hooks';
import { useRound } from '../../src/hooks/useRound';
import { useRoundStore } from '../../src/stores/roundStore';
import { database } from '../../src/database/watermelon/database';
import Round from '../../src/database/watermelon/models/Round';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('useRound', () => {
  let testRound: Round;
  
  beforeEach(async () => {
    // Reset store
    useRoundStore.setState({
      activeRound: null,
      rounds: [],
      loading: false,
      error: null,
    });
    
    // Reset database
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });
    
    // Create a test round
    testRound = await database.write(async () => {
      return await database.collections.get<Round>('rounds').create((r) => {
        r.courseName = 'Test Course';
        r.date = new Date();
        r.isFinished = false;
      });
    });
  });
  
  it('should load active round on mount', async () => {
    // Set active round in store
    useRoundStore.setState({ activeRound: testRound });
    
    const { result } = renderHook(() => useRound());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.round).toBeDefined();
    expect(result.current.round?.courseName).toBe('Test Course');
  });
  
  it('should set specific round when roundId provided', async () => {
    const { result } = renderHook(() => useRound(testRound.id));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.round).toBeDefined();
    expect(result.current.round?.id).toBe(testRound.id);
  });
  
  it('should handle loading state', async () => {
    const { result } = renderHook(() => useRound(testRound.id));
    
    // Initially should be loading
    expect(result.current.loading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
  
  it('should provide reload function', async () => {
    const { result } = renderHook(() => useRound(testRound.id));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.reload).toBeDefined();
    expect(typeof result.current.reload).toBe('function');
    
    // Test reload
    await act(async () => {
      await result.current.reload();
    });
    
    expect(result.current.round).toBeDefined();
  });
  
  it('should return null round when no active round', async () => {
    const { result } = renderHook(() => useRound());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.round).toBeNull();
  });
  
  it('should handle errors gracefully', async () => {
    const invalidRoundId = 'invalid-id-that-does-not-exist';
    
    const { result } = renderHook(() => useRound(invalidRoundId));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    // Should have error
    expect(result.current.error).toBeDefined();
  });
});

