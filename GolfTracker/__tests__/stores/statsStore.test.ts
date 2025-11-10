import { useStatsStore } from '../../src/stores/statsStore';
import { database } from '../../src/database/watermelon/database';
import Round from '../../src/database/watermelon/models/Round';
import Hole from '../../src/database/watermelon/models/Hole';
import { act } from '@testing-library/react-hooks';

describe('statsStore', () => {
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
  
  const createTestRound = async (totalScore: number, totalPutts: number) => {
    return await database.write(async () => {
      const round = await database.collections.get<Round>('rounds').create((r) => {
        r.courseName = 'Test Course';
        r.date = new Date();
        r.isFinished = true;
        r.totalScore = totalScore;
        r.totalPutts = totalPutts;
        r.fairwaysHit = 10;
        r.greensInRegulation = 12;
      });
      
      // Create 18 holes
      for (let i = 1; i <= 18; i++) {
        await database.collections.get<Hole>('holes').create((h) => {
          h.roundId = round.id;
          h.holeNumber = i;
          h.par = 4;
          h.strokes = Math.floor(totalScore / 18);
        });
      }
      
      return round;
    });
  };
  
  it('should calculate stats from finished rounds', async () => {
    // Create finished rounds
    await createTestRound(85, 32);
    await createTestRound(90, 35);
    await createTestRound(80, 30);
    
    const { calculateStats } = useStatsStore.getState();
    
    await act(async () => {
      await calculateStats();
    });
    
    const { stats } = useStatsStore.getState();
    
    expect(stats).toBeDefined();
    expect(stats!.totalRounds).toBe(3);
    expect(stats!.averageScore).toBeCloseTo(85, 0); // (85 + 90 + 80) / 3
    expect(stats!.bestScore).toBe(80);
    expect(stats!.worstScore).toBe(90);
    expect(stats!.averagePutts).toBeCloseTo(32.33, 1);
  });
  
  it('should only include finished rounds', async () => {
    // Create finished round
    await createTestRound(85, 32);
    
    // Create unfinished round
    await database.write(async () => {
      await database.collections.get<Round>('rounds').create((r) => {
        r.courseName = 'Unfinished';
        r.date = new Date();
        r.isFinished = false;
        r.totalScore = 100;
      });
    });
    
    const { calculateStats } = useStatsStore.getState();
    
    await act(async () => {
      await calculateStats();
    });
    
    const { stats } = useStatsStore.getState();
    
    // Should only count the finished round
    expect(stats!.totalRounds).toBe(1);
    expect(stats!.averageScore).toBe(85);
  });
  
  it('should calculate hole-by-hole statistics', async () => {
    await database.write(async () => {
      const round = await database.collections.get<Round>('rounds').create((r) => {
        r.courseName = 'Test Course';
        r.date = new Date();
        r.isFinished = true;
        r.totalScore = 72;
      });
      
      // Create holes with various scores
      await database.collections.get<Hole>('holes').create((h) => {
        h.roundId = round.id;
        h.holeNumber = 1;
        h.par = 5;
        h.strokes = 3; // Eagle (-2)
      });
      
      await database.collections.get<Hole>('holes').create((h) => {
        h.roundId = round.id;
        h.holeNumber = 2;
        h.par = 4;
        h.strokes = 3; // Birdie (-1)
      });
      
      await database.collections.get<Hole>('holes').create((h) => {
        h.roundId = round.id;
        h.holeNumber = 3;
        h.par = 4;
        h.strokes = 4; // Par (0)
      });
      
      await database.collections.get<Hole>('holes').create((h) => {
        h.roundId = round.id;
        h.holeNumber = 4;
        h.par = 4;
        h.strokes = 5; // Bogey (+1)
      });
      
      await database.collections.get<Hole>('holes').create((h) => {
        h.roundId = round.id;
        h.holeNumber = 5;
        h.par = 4;
        h.strokes = 6; // Double Bogey (+2)
      });
    });
    
    const { calculateStats } = useStatsStore.getState();
    
    await act(async () => {
      await calculateStats();
    });
    
    const { stats } = useStatsStore.getState();
    
    expect(stats!.eaglesOrBetter).toBe(1);
    expect(stats!.birdies).toBe(1);
    expect(stats!.pars).toBe(1);
    expect(stats!.bogeys).toBe(1);
    expect(stats!.doubleBogeyOrWorse).toBe(1);
  });
  
  it('should handle empty rounds', async () => {
    const { calculateStats } = useStatsStore.getState();
    
    await act(async () => {
      await calculateStats();
    });
    
    const { stats } = useStatsStore.getState();
    
    expect(stats).toBeDefined();
    expect(stats!.totalRounds).toBe(0);
    expect(stats!.averageScore).toBe(0);
    expect(stats!.bestScore).toBe(0);
    expect(stats!.worstScore).toBe(0);
  });
  
  it('should calculate fairway accuracy', async () => {
    await createTestRound(85, 32);
    await createTestRound(90, 35);
    
    const { calculateStats } = useStatsStore.getState();
    
    await act(async () => {
      await calculateStats();
    });
    
    const { stats } = useStatsStore.getState();
    
    // Each round has fairwaysHit = 10
    // 2 rounds * 14 fairways = 28 total possible
    // 20 hit / 28 total = 71.4%
    expect(stats!.fairwayAccuracy).toBeCloseTo(71.4, 1);
  });
  
  it('should calculate GIR percentage', async () => {
    await createTestRound(85, 32);
    await createTestRound(90, 35);
    
    const { calculateStats } = useStatsStore.getState();
    
    await act(async () => {
      await calculateStats();
    });
    
    const { stats } = useStatsStore.getState();
    
    // Each round has greensInRegulation = 12
    // 2 rounds * 18 holes = 36 total
    // 24 GIR / 36 total = 66.67%
    expect(stats!.girPercentage).toBeCloseTo(66.67, 1);
  });
  
  it('should clear stats', async () => {
    await createTestRound(85, 32);
    
    const { calculateStats, clearStats } = useStatsStore.getState();
    
    await act(async () => {
      await calculateStats();
    });
    
    expect(useStatsStore.getState().stats).toBeDefined();
    
    act(() => {
      clearStats();
    });
    
    expect(useStatsStore.getState().stats).toBeNull();
  });
});

