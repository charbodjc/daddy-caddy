import { useTournamentStore } from '../../src/stores/tournamentStore';
import { database } from '../../src/database/watermelon/database';
import Tournament from '../../src/database/watermelon/models/Tournament';
import Round from '../../src/database/watermelon/models/Round';
import Hole from '../../src/database/watermelon/models/Hole';
import { act } from '@testing-library/react-hooks';

describe('tournamentStore', () => {
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
  
  describe('createTournament', () => {
    it('should create a new tournament', async () => {
      const { createTournament } = useTournamentStore.getState();
      
      let tournament;
      await act(async () => {
        tournament = await createTournament({
          name: 'Test Tournament',
          courseName: 'Test Course',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-03'),
        });
      });
      
      expect(tournament).toBeDefined();
      expect(tournament.name).toBe('Test Tournament');
      expect(tournament.courseName).toBe('Test Course');
    });
    
    it('should reload tournaments after creation', async () => {
      const { createTournament, loadTournaments } = useTournamentStore.getState();
      
      await act(async () => {
        await createTournament({
          name: 'Test Tournament',
          courseName: 'Test Course',
          startDate: new Date(),
          endDate: new Date(),
        });
      });
      
      await act(async () => {
        await loadTournaments();
      });
      
      const state = useTournamentStore.getState();
      expect(state.tournaments.length).toBe(1);
      expect(state.tournaments[0].name).toBe('Test Tournament');
    });
  });
  
  describe('loadTournaments', () => {
    it('should load all tournaments sorted by start date', async () => {
      // Create multiple tournaments
      await database.write(async () => {
        await database.collections.get<Tournament>('tournaments').create((t) => {
          t.name = 'Tournament 1';
          t.courseName = 'Course 1';
          t.startDate = new Date('2025-01-01');
          t.endDate = new Date('2025-01-03');
        });
        
        await database.collections.get<Tournament>('tournaments').create((t) => {
          t.name = 'Tournament 2';
          t.courseName = 'Course 2';
          t.startDate = new Date('2025-02-01');
          t.endDate = new Date('2025-02-03');
        });
        
        await database.collections.get<Tournament>('tournaments').create((t) => {
          t.name = 'Tournament 3';
          t.courseName = 'Course 3';
          t.startDate = new Date('2025-01-15');
          t.endDate = new Date('2025-01-17');
        });
      });
      
      const { loadTournaments } = useTournamentStore.getState();
      
      await act(async () => {
        await loadTournaments();
      });
      
      const state = useTournamentStore.getState();
      expect(state.tournaments.length).toBe(3);
      
      // Should be sorted by date descending (newest first)
      expect(state.tournaments[0].name).toBe('Tournament 2');
      expect(state.tournaments[1].name).toBe('Tournament 3');
      expect(state.tournaments[2].name).toBe('Tournament 1');
    });
  });
  
  describe('deleteTournament', () => {
    it('should delete tournament and all associated rounds', async () => {
      let tournamentId: string;
      let roundId: string;
      
      // Create tournament with rounds
      await database.write(async () => {
        const tournament = await database.collections.get<Tournament>('tournaments').create((t) => {
          t.name = 'Test Tournament';
          t.courseName = 'Test Course';
          t.startDate = new Date();
          t.endDate = new Date();
        });
        tournamentId = tournament.id;
        
        // Create round for tournament
        const round = await database.collections.get<Round>('rounds').create((r) => {
          r.courseName = 'Test Course';
          r.date = new Date();
          r.isFinished = false;
          r.tournamentId = tournament.id;
          r.tournamentName = tournament.name;
        });
        roundId = round.id;
        
        // Create holes for the round
        for (let i = 1; i <= 18; i++) {
          await database.collections.get<Hole>('holes').create((h) => {
            h.roundId = round.id;
            h.holeNumber = i;
            h.par = 4;
            h.strokes = 0;
          });
        }
      });
      
      const { deleteTournament } = useTournamentStore.getState();
      
      await act(async () => {
        await deleteTournament(tournamentId);
      });
      
      // Verify tournament is deleted
      await expect(
        database.collections.get('tournaments').find(tournamentId)
      ).rejects.toThrow();
      
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
    
    it('should clear selected tournament if deleted', async () => {
      let tournamentId: string;
      
      await database.write(async () => {
        const tournament = await database.collections.get<Tournament>('tournaments').create((t) => {
          t.name = 'Test Tournament';
          t.courseName = 'Test Course';
          t.startDate = new Date();
          t.endDate = new Date();
        });
        tournamentId = tournament.id;
      });
      
      const { selectTournament, deleteTournament } = useTournamentStore.getState();
      
      // Select tournament
      await act(async () => {
        await selectTournament(tournamentId);
      });
      
      expect(useTournamentStore.getState().selectedTournament?.id).toBe(tournamentId);
      
      // Delete selected tournament
      await act(async () => {
        await deleteTournament(tournamentId);
      });
      
      expect(useTournamentStore.getState().selectedTournament).toBeNull();
    });
  });
  
  describe('getTournamentRounds', () => {
    it('should get all rounds for a tournament', async () => {
      let tournamentId: string;
      
      await database.write(async () => {
        const tournament = await database.collections.get<Tournament>('tournaments').create((t) => {
          t.name = 'Test Tournament';
          t.courseName = 'Test Course';
          t.startDate = new Date();
          t.endDate = new Date();
        });
        tournamentId = tournament.id;
        
        // Create rounds for tournament
        await database.collections.get<Round>('rounds').create((r) => {
          r.courseName = 'Course 1';
          r.date = new Date('2025-01-01');
          r.isFinished = false;
          r.tournamentId = tournament.id;
        });
        
        await database.collections.get<Round>('rounds').create((r) => {
          r.courseName = 'Course 2';
          r.date = new Date('2025-01-02');
          r.isFinished = false;
          r.tournamentId = tournament.id;
        });
        
        // Create round NOT in tournament
        await database.collections.get<Round>('rounds').create((r) => {
          r.courseName = 'Other Course';
          r.date = new Date();
          r.isFinished = false;
        });
      });
      
      const { getTournamentRounds } = useTournamentStore.getState();
      
      let rounds;
      await act(async () => {
        rounds = await getTournamentRounds(tournamentId);
      });
      
      expect(rounds.length).toBe(2);
      expect(rounds[0].courseName).toBe('Course 2'); // Sorted by date desc
      expect(rounds[1].courseName).toBe('Course 1');
    });
  });
  
  describe('selectTournament', () => {
    it('should set selected tournament', async () => {
      let tournamentId: string;
      
      await database.write(async () => {
        const tournament = await database.collections.get<Tournament>('tournaments').create((t) => {
          t.name = 'Test Tournament';
          t.courseName = 'Test Course';
          t.startDate = new Date();
          t.endDate = new Date();
        });
        tournamentId = tournament.id;
      });
      
      const { selectTournament } = useTournamentStore.getState();
      
      await act(async () => {
        await selectTournament(tournamentId);
      });
      
      const state = useTournamentStore.getState();
      expect(state.selectedTournament).toBeDefined();
      expect(state.selectedTournament?.id).toBe(tournamentId);
      expect(state.selectedTournament?.name).toBe('Test Tournament');
    });
  });
});

