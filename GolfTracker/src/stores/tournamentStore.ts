import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { database } from '../database/watermelon/database';
import Tournament from '../database/watermelon/models/Tournament';
import Round from '../database/watermelon/models/Round';
import Golfer from '../database/watermelon/models/Golfer';
import { Q } from '@nozbe/watermelondb';
import {
  parseTournamentGolferIds,
  serializeTournamentGolferIds,
} from '../utils/tournamentGolfers';

interface CreateTournamentData {
  name: string;
  courseName: string;
  startDate: Date;
  endDate: Date;
  golferIds: string[];
  leaderboardUrl?: string;
}

interface TournamentState {
  tournaments: Tournament[];
  selectedTournament: Tournament | null;
  loading: boolean;
  error: Error | null;

  // Actions
  loadTournaments: () => Promise<void>;
  createTournament: (data: CreateTournamentData) => Promise<Tournament>;
  updateTournament: (id: string, data: Partial<CreateTournamentData>) => Promise<void>;
  deleteTournament: (id: string) => Promise<void>;
  selectTournament: (id: string) => Promise<void>;
  getTournamentRounds: (tournamentId: string) => Promise<Round[]>;
  getTournamentGolfers: (tournamentId: string) => Promise<Golfer[]>;
  updateTournamentGolfers: (tournamentId: string, golferIds: string[]) => Promise<void>;
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
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          set({ error, loading: false });
        }
      },
      
      // Create a new tournament
      createTournament: async (data: CreateTournamentData) => {
        set({ error: null });
        
        try {
          const tournament = await database.write(async () => {
            return await database.collections.get<Tournament>('tournaments').create((t) => {
              t.name = data.name;
              t.courseName = data.courseName;
              t.startDate = data.startDate;
              t.endDate = data.endDate;
              t.golferIdsRaw = serializeTournamentGolferIds(data.golferIds);
              if (data.leaderboardUrl) t.leaderboardUrl = data.leaderboardUrl;
            });
          });
          
          // Reload tournaments (also sets loading: false)
          await get().loadTournaments();

          return tournament;
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          set({ error, loading: false });
          throw error;
        }
      },
      
      // Update a tournament's details
      updateTournament: async (id: string, data: Partial<CreateTournamentData>) => {
        try {
          await database.write(async () => {
            const tournament = await database.collections
              .get<Tournament>('tournaments')
              .find(id);
            await tournament.update((t) => {
              if (data.name !== undefined) t.name = data.name;
              if (data.courseName !== undefined) t.courseName = data.courseName;
              if (data.startDate !== undefined) t.startDate = data.startDate;
              if (data.endDate !== undefined) t.endDate = data.endDate;
              if (data.golferIds !== undefined) t.golferIdsRaw = serializeTournamentGolferIds(data.golferIds);
              if (data.leaderboardUrl !== undefined) t.leaderboardUrl = data.leaderboardUrl || undefined;
            });
          });
          await get().loadTournaments();
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          set({ error });
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

            // Collect all holes across all rounds for batch deletion
            const holeOps = (
              await Promise.all(rounds.map((round) => round.holes.fetch()))
            )
              .flat()
              .map((hole) => hole.prepareMarkAsDeleted());

            const roundOps = rounds.map((round) => round.prepareMarkAsDeleted());

            // Delete the tournament
            const tournament = await database.collections
              .get<Tournament>('tournaments')
              .find(id);

            await database.batch(
              ...holeOps,
              ...roundOps,
              tournament.prepareMarkAsDeleted(),
            );
          });
          
          // Reload tournaments
          await get().loadTournaments();
          
          const { selectedTournament } = get();
          if (selectedTournament?.id === id) {
            set({ selectedTournament: null });
          }
          
          set({ loading: false });
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          set({ error, loading: false });
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
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          set({ error });
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
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          set({ error });
          throw error;
        }
      },

      // Get golfers associated with a tournament (handles deleted golfers gracefully)
      getTournamentGolfers: async (tournamentId: string) => {
        try {
          const tournament = await database.collections
            .get<Tournament>('tournaments')
            .find(tournamentId);
          const golferIds = parseTournamentGolferIds(tournament.golferIdsRaw);
          if (golferIds.length === 0) return [];

          return await database.collections
            .get<Golfer>('golfers')
            .query(Q.where('id', Q.oneOf(golferIds)))
            .fetch();
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          set({ error });
          throw error;
        }
      },

      // Update the golfer list for a tournament
      updateTournamentGolfers: async (tournamentId: string, golferIds: string[]) => {
        try {
          await database.write(async () => {
            const tournament = await database.collections
              .get<Tournament>('tournaments')
              .find(tournamentId);
            await tournament.update((t) => {
              t.golferIdsRaw = serializeTournamentGolferIds(golferIds);
            });
          });
          await get().loadTournaments();
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          set({ error });
          throw error;
        }
      },
    }),
    { name: 'TournamentStore' }
  )
);

