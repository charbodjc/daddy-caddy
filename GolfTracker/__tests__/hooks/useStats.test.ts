import { renderHook, act, waitFor } from '@testing-library/react-hooks';
import { useStats } from '../../src/hooks/useStats';
import { useStatsStore } from '../../src/stores/statsStore';
import { database } from '../../src/database/watermelon/database';
import Round from '../../src/database/watermelon/models/Round';
import Hole from '../../src/database/watermelon/models/Hole';

describe('useStats', () => {
  beforeEach(async () => {
    // Reset store
    useStatsStore.setState({
      stats: null,
      loading: false,
      error: null,
    });
    
    // Reset database
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });
  });
  
  const createTestRound = async (score: number, putts: number) => {
    return await database.write(async () => {
      const round = await database.collections.get<Round>('rounds').create((r) => {
        r.courseName = 'Test Course';
        r.date = new Date();
        r.isFinished = true;
        r.totalScore = score;
        r.totalPutts = putts;
        r.fairwaysHit = 10;
        r.greensInRegulation = 12;
      });
      
      // Create 18 holes
      for (let i = 1; i <= 18; i++) {
        await database.collections.get<Hole>('holes').create((h) => {
          h.roundId = round.id;
          h.holeNumber = i;
          h.par = 4;
          h.strokes = Math.floor(score / 18);
        });
      }
      
      return round;
    });
  };
  
  it('should automatically load stats on mount', async () => {
    // Create test data
    await createTestRound(85, 32);
    
    const { result } = renderHook(() => useStats());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.stats).toBeDefined();
    expect(result.current.stats?.totalRounds).toBe(1);
  });
  
  it('should not auto-load when autoLoad is false', async () => {
    await createTestRound(85, 32);
    
    const { result } = renderHook(() => useStats(false));
    
    // Should not have loaded stats
    expect(result.current.stats).toBeNull();
    expect(result.current.loading).toBe(false);
  });
  
  it('should provide refresh function', async () => {
    const { result } = renderHook(() => useStats(false));
    
    expect(result.current.refresh).toBeDefined();
    expect(typeof result.current.refresh).toBe('function');
    
    // Create test data
    await createTestRound(85, 32);
    
    // Manually refresh
    await act(async () => {
      await result.current.refresh();
    });
    
    await waitFor(() => {
      expect(result.current.stats).toBeDefined();
    });
    
    expect(result.current.stats?.totalRounds).toBe(1);
  });
  
  it('should handle loading state', async () => {
    const { result } = renderHook(() => useStats());
    
    // Should start loading
    expect(result.current.loading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
  
  it('should calculate statistics correctly', async () => {
    await createTestRound(85, 32);
    await createTestRound(90, 35);
    await createTestRound(80, 30);
    
    const { result } = renderHook(() => useStats());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.stats).toBeDefined();
    });
    
    const { stats } = result.current;
    
    expect(stats?.totalRounds).toBe(3);
    expect(stats?.averageScore).toBeCloseTo(85, 0);
    expect(stats?.bestScore).toBe(80);
    expect(stats?.worstScore).toBe(90);
  });
  
  it('should handle empty data', async () => {
    const { result } = renderHook(() => useStats());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.stats).toBeDefined();
    expect(result.current.stats?.totalRounds).toBe(0);
  });
  
  it('should handle errors', async () => {
    // Force an error by corrupting the database
    jest.spyOn(database.collections, 'get').mockImplementationOnce(() => {
      throw new Error('Database error');
    });
    
    const { result } = renderHook(() => useStats());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.error).toBeDefined();
  });
});

