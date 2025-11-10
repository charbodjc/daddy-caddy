import { renderHook, act, waitFor } from '@testing-library/react-hooks';
import { useTournaments, useTournament } from '../../src/hooks/useTournaments';
import { useTournamentStore } from '../../src/stores/tournamentStore';
import { database } from '../../src/database/watermelon/database';
import Tournament from '../../src/database/watermelon/models/Tournament';

describe('useTournaments', () => {
  beforeEach(async () => {
    // Reset store
    useTournamentStore.setState({
      tournaments: [],
      selectedTournament: null,
      loading: false,
      error: null,
    });
    
    // Reset database
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });
  });
  
  it('should load tournaments on mount', async () => {
    // Create test tournaments
    await database.write(async () => {
      await database.collections.get<Tournament>('tournaments').create((t) => {
        t.name = 'Tournament 1';
        t.courseName = 'Course 1';
        t.startDate = new Date();
        t.endDate = new Date();
      });
    });
    
    const { result } = renderHook(() => useTournaments());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.tournaments).toBeDefined();
    expect(result.current.tournaments.length).toBe(1);
  });
  
  it('should provide reload function', async () => {
    const { result } = renderHook(() => useTournaments());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.reload).toBeDefined();
    expect(typeof result.current.reload).toBe('function');
  });
  
  it('should handle loading state', async () => {
    const { result } = renderHook(() => useTournaments());
    
    expect(result.current.loading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
  
  it('should handle empty tournaments', async () => {
    const { result } = renderHook(() => useTournaments());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.tournaments).toEqual([]);
  });
  
  it('should handle errors gracefully', async () => {
    // Force an error
    jest.spyOn(database.collections, 'get').mockImplementationOnce(() => {
      throw new Error('Database error');
    });
    
    const { result } = renderHook(() => useTournaments());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.error).toBeDefined();
  });
});

describe('useTournament', () => {
  let testTournament: Tournament;
  
  beforeEach(async () => {
    // Reset
    useTournamentStore.setState({
      tournaments: [],
      selectedTournament: null,
      loading: false,
      error: null,
    });
    
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });
    
    // Create test tournament
    testTournament = await database.write(async () => {
      return await database.collections.get<Tournament>('tournaments').create((t) => {
        t.name = 'Test Tournament';
        t.courseName = 'Test Course';
        t.startDate = new Date();
        t.endDate = new Date();
      });
    });
  });
  
  it('should select tournament by ID', async () => {
    const { result } = renderHook(() => useTournament(testTournament.id));
    
    await waitFor(() => {
      expect(result.current.tournament).toBeDefined();
    });
    
    expect(result.current.tournament?.id).toBe(testTournament.id);
    expect(result.current.tournament?.name).toBe('Test Tournament');
  });
  
  it('should provide getRounds function', async () => {
    const { result } = renderHook(() => useTournament(testTournament.id));
    
    await waitFor(() => {
      expect(result.current.tournament).toBeDefined();
    });
    
    expect(result.current.getRounds).toBeDefined();
    expect(typeof result.current.getRounds).toBe('function');
  });
});

