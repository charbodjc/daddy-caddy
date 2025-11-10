import { useRoundStore } from '../../src/stores/roundStore';
import { database } from '../../src/database/watermelon/database';
import { act } from '@testing-library/react-hooks';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('roundStore', () => {
  beforeEach(async () => {
    // Reset store state
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
    
    // Clear mocks
    jest.clearAllMocks();
  });
  
  describe('createRound', () => {
    it('should create a new round with 18 holes', async () => {
      const { createRound } = useRoundStore.getState();
      
      let round;
      await act(async () => {
        round = await createRound({
          courseName: 'Test Course',
          date: new Date('2025-01-01'),
        });
      });
      
      expect(round).toBeDefined();
      expect(round.courseName).toBe('Test Course');
      expect(round.isFinished).toBe(false);
      
      // Verify holes were created
      const holes = await round.holes.fetch();
      expect(holes.length).toBe(18);
      expect(holes[0].holeNumber).toBe(1);
      expect(holes[17].holeNumber).toBe(18);
    });
    
    it('should set round as active and save to AsyncStorage', async () => {
      const { createRound } = useRoundStore.getState();
      
      let round;
      await act(async () => {
        round = await createRound({
          courseName: 'Test Course',
        });
      });
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('active_round_id', round.id);
      
      const state = useRoundStore.getState();
      expect(state.activeRound?.id).toBe(round.id);
    });
    
    it('should include tournament information', async () => {
      const { createRound } = useRoundStore.getState();
      
      let round;
      await act(async () => {
        round = await createRound({
          courseName: 'Test Course',
          tournamentId: 'tournament_123',
          tournamentName: 'Test Tournament',
        });
      });
      
      expect(round.tournamentId).toBe('tournament_123');
      expect(round.tournamentName).toBe('Test Tournament');
    });
  });
  
  describe('updateHole', () => {
    it('should update hole data', async () => {
      const { createRound, updateHole } = useRoundStore.getState();
      
      // Create a round
      let round;
      await act(async () => {
        round = await createRound({
          courseName: 'Test Course',
        });
      });
      
      // Update a hole
      await act(async () => {
        await updateHole(round.id, {
          holeNumber: 1,
          par: 4,
          strokes: 5,
          fairwayHit: true,
          greenInRegulation: false,
          putts: 2,
        });
      });
      
      // Verify hole was updated
      const holes = await round.holes.fetch();
      const updatedHole = holes.find(h => h.holeNumber === 1);
      
      expect(updatedHole?.strokes).toBe(5);
      expect(updatedHole?.fairwayHit).toBe(true);
      expect(updatedHole?.greenInRegulation).toBe(false);
      expect(updatedHole?.putts).toBe(2);
    });
    
    it('should update round statistics', async () => {
      const { createRound, updateHole } = useRoundStore.getState();
      
      // Create a round
      let round;
      await act(async () => {
        round = await createRound({
          courseName: 'Test Course',
        });
      });
      
      // Update multiple holes
      await act(async () => {
        await updateHole(round.id, {
          holeNumber: 1,
          par: 4,
          strokes: 4,
          putts: 2,
          fairwayHit: true,
          greenInRegulation: true,
        });
        
        await updateHole(round.id, {
          holeNumber: 2,
          par: 4,
          strokes: 5,
          putts: 3,
          fairwayHit: false,
          greenInRegulation: false,
        });
      });
      
      // Reload round to get updated stats
      const updatedRound = await database.collections.get('rounds').find(round.id);
      
      expect(updatedRound.totalScore).toBe(9); // 4 + 5
      expect(updatedRound.totalPutts).toBe(5); // 2 + 3
      expect(updatedRound.fairwaysHit).toBe(1);
      expect(updatedRound.greensInRegulation).toBe(1);
    });
  });
  
  describe('finishRound', () => {
    it('should mark round as finished', async () => {
      const { createRound, finishRound } = useRoundStore.getState();
      
      // Create a round
      let round;
      await act(async () => {
        round = await createRound({
          courseName: 'Test Course',
        });
      });
      
      // Finish the round
      await act(async () => {
        await finishRound(round.id);
      });
      
      // Verify round is marked as finished
      const finishedRound = await database.collections.get('rounds').find(round.id);
      expect(finishedRound.isFinished).toBe(true);
      
      // Verify active round is cleared
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('active_round_id');
      expect(useRoundStore.getState().activeRound).toBeNull();
    });
  });
  
  describe('deleteRound', () => {
    it('should delete round and all holes', async () => {
      const { createRound, deleteRound } = useRoundStore.getState();
      
      // Create a round
      let round;
      await act(async () => {
        round = await createRound({
          courseName: 'Test Course',
        });
      });
      
      const roundId = round.id;
      
      // Delete the round
      await act(async () => {
        await deleteRound(roundId);
      });
      
      // Verify round is deleted
      await expect(
        database.collections.get('rounds').find(roundId)
      ).rejects.toThrow();
      
      // Verify holes are deleted
      const holes = await database.collections
        .get('holes')
        .query()
        .fetch();
      
      expect(holes.length).toBe(0);
    });
    
    it('should clear active round if deleted', async () => {
      const { createRound, deleteRound } = useRoundStore.getState();
      
      // Create and set as active
      let round;
      await act(async () => {
        round = await createRound({
          courseName: 'Test Course',
        });
      });
      
      // Delete the active round
      await act(async () => {
        await deleteRound(round.id);
      });
      
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('active_round_id');
      expect(useRoundStore.getState().activeRound).toBeNull();
    });
  });
  
  describe('loadAllRounds', () => {
    it('should load all rounds sorted by date', async () => {
      const { createRound, loadAllRounds } = useRoundStore.getState();
      
      // Create multiple rounds
      await act(async () => {
        await createRound({
          courseName: 'Course 1',
          date: new Date('2025-01-01'),
        });
        
        await createRound({
          courseName: 'Course 2',
          date: new Date('2025-01-15'),
        });
        
        await createRound({
          courseName: 'Course 3',
          date: new Date('2025-01-10'),
        });
      });
      
      // Load all rounds
      await act(async () => {
        await loadAllRounds();
      });
      
      const state = useRoundStore.getState();
      expect(state.rounds.length).toBe(3);
      
      // Should be sorted by date descending
      expect(state.rounds[0].courseName).toBe('Course 2'); // Latest
      expect(state.rounds[1].courseName).toBe('Course 3');
      expect(state.rounds[2].courseName).toBe('Course 1'); // Oldest
    });
  });
});

