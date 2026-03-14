import { renderHook, act } from '@testing-library/react-hooks';
import { useRound } from '../../src/hooks/useRound';
import { useRoundStore } from '../../src/stores/roundStore';
import { database } from '../../src/database/watermelon/database';
import Round from '../../src/database/watermelon/models/Round';

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

    // The hook accesses state directly, so the round should be available
    expect(result.current.round).toBeDefined();
    expect(result.current.round?.courseName).toBe('Test Course');
  });

  it('should set specific round when roundId provided', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useRound(testRound.id));

    // Wait for the setActiveRound call to complete
    try {
      await waitForNextUpdate({ timeout: 2000 });
    } catch {
      // May not update if already resolved
    }

    expect(result.current.round).toBeDefined();
    expect(result.current.round?.id).toBe(testRound.id);
  });

  it('should provide reload function', async () => {
    useRoundStore.setState({ activeRound: testRound });

    const { result } = renderHook(() => useRound());

    expect(result.current.reload).toBeDefined();
    expect(typeof result.current.reload).toBe('function');
  });

  it('should return null round when no active round', () => {
    const { result } = renderHook(() => useRound());

    // No active round set, loadActiveRound finds no unfinished rounds
    expect(result.current.round).toBeNull();
  });
});
