/**
 * Integration Test: Complete Round Flow
 * 
 * Tests the entire user journey of creating and completing a golf round.
 */

import { database } from '../../src/database/watermelon/database';
import { useRoundStore } from '../../src/stores/roundStore';
import { act } from '@testing-library/react-hooks';
import Round from '../../src/database/watermelon/models/Round';
import Hole from '../../src/database/watermelon/models/Hole';

describe('Round Flow Integration Test', () => {
  beforeEach(async () => {
    // Reset everything
    useRoundStore.setState({
      activeRound: null,
      rounds: [],
      loading: false,
      error: null,
    });
    
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });
  });
  
  it('should complete full round lifecycle', async () => {
    const {
      createRound,
      updateHole,
      finishRound,
      loadAllRounds,
    } = useRoundStore.getState();
    
    // Step 1: Create a new round
    let round: Round;
    await act(async () => {
      round = await createRound({
        courseName: 'Pebble Beach',
        date: new Date('2025-01-15'),
      });
    });
    
    expect(round).toBeDefined();
    expect(round.courseName).toBe('Pebble Beach');
    expect(round.isFinished).toBe(false);
    
    // Verify 18 holes were created
    const initialHoles = await round.holes.fetch();
    expect(initialHoles.length).toBe(18);
    
    // Step 2: Play first 9 holes
    for (let i = 1; i <= 9; i++) {
      await act(async () => {
        await updateHole(round.id, {
          holeNumber: i,
          par: 4,
          strokes: 4 + (i % 3 === 0 ? -1 : i % 2 === 0 ? 1 : 0), // Mix of scores
          fairwayHit: i % 2 === 0,
          greenInRegulation: i % 3 === 0,
          putts: 2,
        });
      });
    }
    
    // Verify holes were updated
    const updatedRound = await database.collections.get<Round>('rounds').find(round.id);
    const holes = await updatedRound.holes.fetch();
    
    const playedHoles = holes.filter(h => h.strokes > 0);
    expect(playedHoles.length).toBe(9);
    
    // Verify statistics were calculated
    expect(updatedRound.totalScore).toBeGreaterThan(0);
    expect(updatedRound.totalPutts).toBe(18); // 9 holes * 2 putts
    expect(updatedRound.fairwaysHit).toBeGreaterThan(0);
    expect(updatedRound.greensInRegulation).toBeGreaterThan(0);
    
    // Step 3: Play remaining 9 holes
    for (let i = 10; i <= 18; i++) {
      await act(async () => {
        await updateHole(round.id, {
          holeNumber: i,
          par: i % 5 === 0 ? 5 : i % 3 === 0 ? 3 : 4,
          strokes: 4,
          fairwayHit: i % 2 === 1,
          greenInRegulation: i % 2 === 0,
          putts: 2,
        });
      });
    }
    
    // Verify all 18 holes played
    const finalRound = await database.collections.get<Round>('rounds').find(round.id);
    const allHoles = await finalRound.holes.fetch();
    
    const allPlayedHoles = allHoles.filter(h => h.strokes > 0);
    expect(allPlayedHoles.length).toBe(18);
    
    // Step 4: Finish the round
    await act(async () => {
      await finishRound(round.id);
    });
    
    // Verify round is marked as finished
    const finishedRound = await database.collections.get<Round>('rounds').find(round.id);
    expect(finishedRound.isFinished).toBe(true);
    
    // Verify active round was cleared
    const state = useRoundStore.getState();
    expect(state.activeRound).toBeNull();
    
    // Step 5: Load all rounds and verify it's in the list
    await act(async () => {
      await loadAllRounds();
    });
    
    const finalState = useRoundStore.getState();
    expect(finalState.rounds.length).toBe(1);
    expect(finalState.rounds[0].id).toBe(round.id);
    expect(finalState.rounds[0].isFinished).toBe(true);
  });
  
  it('should handle partial round (quit mid-round)', async () => {
    const { createRound, updateHole, deleteRound } = useRoundStore.getState();
    
    // Create round
    let round: Round;
    await act(async () => {
      round = await createRound({
        courseName: 'Test Course',
      });
    });
    
    // Play only 5 holes
    for (let i = 1; i <= 5; i++) {
      await act(async () => {
        await updateHole(round.id, {
          holeNumber: i,
          par: 4,
          strokes: 4,
        });
      });
    }
    
    // Verify partial round
    const partialRound = await database.collections.get<Round>('rounds').find(round.id);
    const holes = await partialRound.holes.fetch();
    
    const playedHoles = holes.filter(h => h.strokes > 0);
    expect(playedHoles.length).toBe(5);
    expect(partialRound.isFinished).toBe(false);
    
    // Delete the partial round
    await act(async () => {
      await deleteRound(round.id);
    });
    
    // Verify deletion
    await expect(
      database.collections.get('rounds').find(round.id)
    ).rejects.toThrow();
  });
  
  it('should handle multiple rounds simultaneously', async () => {
    const { createRound, updateHole, loadAllRounds } = useRoundStore.getState();
    
    // Create multiple rounds
    const round1 = await act(async () => {
      return await createRound({ courseName: 'Course 1', date: new Date('2025-01-01') });
    });
    
    const round2 = await act(async () => {
      return await createRound({ courseName: 'Course 2', date: new Date('2025-01-02') });
    });
    
    const round3 = await act(async () => {
      return await createRound({ courseName: 'Course 3', date: new Date('2025-01-03') });
    });
    
    // Update holes in different rounds
    await act(async () => {
      await updateHole(round1.id, { holeNumber: 1, par: 4, strokes: 4 });
      await updateHole(round2.id, { holeNumber: 1, par: 4, strokes: 5 });
      await updateHole(round3.id, { holeNumber: 1, par: 4, strokes: 3 });
    });
    
    // Load all rounds
    await act(async () => {
      await loadAllRounds();
    });
    
    const state = useRoundStore.getState();
    expect(state.rounds.length).toBe(3);
    
    // Verify correct ordering (by date desc)
    expect(state.rounds[0].courseName).toBe('Course 3');
    expect(state.rounds[1].courseName).toBe('Course 2');
    expect(state.rounds[2].courseName).toBe('Course 1');
  });
  
  it('should maintain data integrity across operations', async () => {
    const { createRound, updateHole, finishRound } = useRoundStore.getState();
    
    // Create and fully play a round
    const round = await act(async () => {
      return await createRound({ courseName: 'Integrity Test' });
    });
    
    // Play all 18 holes with specific scores
    const expectedScores = [4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4];
    
    for (let i = 0; i < 18; i++) {
      await act(async () => {
        await updateHole(round.id, {
          holeNumber: i + 1,
          par: expectedScores[i] - (i % 3 === 0 ? 1 : 0), // Vary pars
          strokes: expectedScores[i],
          putts: 2,
        });
      });
    }
    
    // Finish round
    await act(async () => {
      await finishRound(round.id);
    });
    
    // Verify data integrity
    const finishedRound = await database.collections.get<Round>('rounds').find(round.id);
    const holes = await finishedRound.holes.fetch();
    
    // All holes should be present
    expect(holes.length).toBe(18);
    
    // All holes should have data
    holes.forEach((hole, index) => {
      expect(hole.holeNumber).toBe(index + 1);
      expect(hole.strokes).toBe(expectedScores[index]);
      expect(hole.putts).toBe(2);
    });
    
    // Round statistics should match
    const totalStrokes = expectedScores.reduce((a, b) => a + b, 0);
    expect(finishedRound.totalScore).toBe(totalStrokes);
    expect(finishedRound.totalPutts).toBe(36); // 18 holes * 2 putts
    expect(finishedRound.isFinished).toBe(true);
  });
});

