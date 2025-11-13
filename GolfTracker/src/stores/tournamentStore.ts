import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { database } from '../database/watermelon/database';
import Tournament from '../database/watermelon/models/Tournament';
import Round from '../database/watermelon/models/Round';
import { Q } from '@nozbe/watermelondb';

interface CreateTournamentData {
  name: string;
  courseName: string;
  startDate: Date;
  endDate: Date;
}

interface TournamentState {
  tournaments: Tournament[];
  selectedTournament: Tournament | null;
  loading: boolean;
  error: Error | null;
  
  // Actions
  loadTournaments: () => Promise<void>;
  getTournament: (id: string) => Promise<Tournament>;
  createTournament: (data: CreateTournamentData) => Promise<Tournament>;
  deleteTournament: (id: string) => Promise<void>;
  selectTournament: (id: string) => Promise<void>;
  getTournamentRounds: (tournamentId: string) => Promise<Round[]>;
}

export const useTournamentStore = create<TournamentState>()(
  devtools(
    (set, get) => ({
      tournaments: [],
      selectedTournament: null,
      loading: false,
      error: null,
      
      // Load all tournaments
      loadTournaments: async () => {
        set({ loading: true, error: null });
        
        try {
          const tournaments = await database.collections
            .get<Tournament>('tournaments')
            .query(Q.sortBy('start_date', Q.desc))
            .fetch();
          
          set({ tournaments, loading: false });
        } catch (error) {
          set({ error: error as Error, loading: false });
        }
      },
      
      // Get a single tournament by ID
      getTournament: async (id: string) => {
        try {
          const tournament = await database.collections
            .get<Tournament>('tournaments')
            .find(id);
          return tournament;
        } catch (error) {
          throw error;
        }
      },
      
      // Create a new tournament
      createTournament: async (data: CreateTournamentData) => {
        set({ loading: true, error: null });
        
        try {
          const tournament = await database.write(async () => {
            return await database.collections.get<Tournament>('tournaments').create((t) => {
              t.name = data.name;
              t.courseName = data.courseName;
              t.startDate = data.startDate;
              t.endDate = data.endDate;
            });
          });
          
          // Reload tournaments
          await get().loadTournaments();
          set({ loading: false });
          
          return tournament;
        } catch (error) {
          set({ error: error as Error, loading: false });
          throw error;
        }
      },
      
      // Delete a tournament and all its rounds
      deleteTournament: async (id: string) => {
        set({ loading: true });
        
        try {
          await database.write(async () => {
            // Find all rounds for this tournament
            const rounds = await database.collections
              .get<Round>('rounds')
              .query(Q.where('tournament_id', id))
              .fetch();
            
            // Delete all rounds
            for (const round of rounds) {
              // Delete holes for each round
              const holes = await round.holes.fetch();
              for (const hole of holes) {
                await hole.markAsDeleted();
              }
              await round.markAsDeleted();
            }
            
            // Delete the tournament
            const tournament = await database.collections
              .get<Tournament>('tournaments')
              .find(id);
            await tournament.markAsDeleted();
          });
          
          // Reload tournaments
          await get().loadTournaments();
          
          const { selectedTournament } = get();
          if (selectedTournament?.id === id) {
            set({ selectedTournament: null });
          }
          
          set({ loading: false });
        } catch (error) {
          set({ error: error as Error, loading: false });
          throw error;
        }
      },
      
      // Select a tournament
      selectTournament: async (id: string) => {
        try {
          const tournament = await database.collections
            .get<Tournament>('tournaments')
            .find(id);
          set({ selectedTournament: tournament });
        } catch (error) {
          set({ error: error as Error });
          throw error;
        }
      },
      
      // Get all rounds for a tournament
      getTournamentRounds: async (tournamentId: string) => {
        try {
          const rounds = await database.collections
            .get<Round>('rounds')
            .query(
              Q.where('tournament_id', tournamentId),
              Q.sortBy('date', Q.desc)
            )
            .fetch();
          
          return rounds;
        } catch (error) {
          set({ error: error as Error });
          throw error;
        }
      },
    }),
    { name: 'TournamentStore' }
  )
);

