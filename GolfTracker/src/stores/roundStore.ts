import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { database } from '../database/watermelon/database';
import Round from '../database/watermelon/models/Round';
import Hole from '../database/watermelon/models/Hole';
import { Q } from '@nozbe/watermelondb';
import {
  validateCreateRound,
  safeValidateHole,
  type HoleData,
  type CreateRoundData,
} from '../validators/roundValidator';
import { useGolferStore } from './golferStore';

interface RoundState {
  activeRound: Round | null;
  rounds: Round[];
  loading: boolean;
  error: Error | null;

  // Actions
  loadActiveRound: () => Promise<void>;
  createRound: (data: CreateRoundData) => Promise<Round>;
  updateHole: (roundId: string, holeData: HoleData) => Promise<void>;
  finishRound: (roundId: string) => Promise<void>;
  deleteRound: (roundId: string) => Promise<void>;
  clearActiveRound: () => Promise<void>;
  loadAllRounds: (golferId?: string) => Promise<void>;
  setActiveRound: (roundId: string) => Promise<void>;
}

export const useRoundStore = create<RoundState>()(
  devtools(
    (set, get) => ({
      activeRound: null,
      rounds: [],
      loading: false,
      error: null,

      // Load active round by querying WatermelonDB for unfinished rounds, filtered by golfer
      loadActiveRound: async () => {
        set({ loading: true, error: null });

        try {
          const activeGolferId = useGolferStore.getState().getActiveGolferId();
          const clauses = [
            Q.where('is_finished', false),
            // Null guard: if golfer store not yet initialized, fall back to unfiltered
            ...(activeGolferId ? [Q.where('golfer_id', activeGolferId)] : []),
            Q.sortBy('created_at', Q.desc),
            Q.take(1),
          ];

          const unfinished = await database.collections
            .get<Round>('rounds')
            .query(...clauses)
            .fetch();

          set({ activeRound: unfinished[0] ?? null, loading: false });
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          console.error('Failed to load active round:', error);
          set({ error, loading: false, activeRound: null });
        }
      },

      // Create a new round
      createRound: async (data: CreateRoundData) => {
        set({ loading: true, error: null });

        try {
          // Validate input before touching the database
          validateCreateRound(data);

          // Create round and all 18 holes in a single write transaction
          const round = await database.write(async () => {
            const golferId = data.golferId || useGolferStore.getState().getActiveGolferId();
            const newRound = await database.collections.get<Round>('rounds').create((r) => {
              r.courseName = data.courseName;
              r.date = data.date || new Date();
              r.isFinished = false;
              if (golferId) r.golferId = golferId;
              if (data.tournamentId) r.tournamentId = data.tournamentId;
              if (data.tournamentName) r.tournamentName = data.tournamentName;
            });

            const standardPars = [4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5];
            for (let i = 1; i <= 18; i++) {
              await database.collections.get<Hole>('holes').create((h) => {
                h.roundId = newRound.id;
                h.holeNumber = i;
                h.par = standardPars[i - 1];
                h.strokes = 0;
              });
            }

            return newRound;
          });

          // Round is unfinished, so it becomes the active round automatically
          set({ activeRound: round, loading: false });

          return round;
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          set({ error, loading: false });
          throw error;
        }
      },

      // Update a hole (optimistic update + database save)
      updateHole: async (roundId: string, holeData: HoleData) => {
        const { activeRound } = get();

        // Validate hole data before writing
        const validation = safeValidateHole(holeData);
        if (!validation.success) {
          const error = new Error(validation.error || 'Invalid hole data');
          set({ error });
          throw error;
        }

        try {
          // Update hole and round statistics in a single write transaction
          await database.write(async () => {
            const holes = await database.collections
              .get<Hole>('holes')
              .query(
                Q.where('round_id', roundId),
                Q.where('hole_number', holeData.holeNumber)
              )
              .fetch();

            if (holes.length === 0) {
              throw new Error(`Hole ${holeData.holeNumber} not found for round ${roundId}`);
            }

            const hole = holes[0];
            await hole.update((h) => {
              h.par = holeData.par;
              h.strokes = holeData.strokes;
              if (holeData.fairwayHit !== undefined) h.fairwayHit = holeData.fairwayHit;
              if (holeData.greenInRegulation !== undefined) h.greenInRegulation = holeData.greenInRegulation;
              if (holeData.putts !== undefined) h.putts = holeData.putts;
              if (holeData.notes !== undefined) h.notes = holeData.notes;
              if (holeData.shotData !== undefined) h.shotData = holeData.shotData;
            });

            // Recalculate round statistics
            const round = await database.collections.get<Round>('rounds').find(roundId);
            const allHoles: Hole[] = await round.holes.fetch();

            const completedHoles = allHoles.filter((h: Hole) => h.strokes > 0);
            const totalScore = completedHoles.reduce((sum: number, h: Hole) => sum + h.strokes, 0);
            const totalPutts = completedHoles.reduce((sum: number, h: Hole) => sum + (h.putts || 0), 0);
            const fairwaysHit = allHoles.filter((h: Hole) => h.fairwayHit === true).length;
            const greensInRegulation = allHoles.filter((h: Hole) => h.greenInRegulation === true).length;

            await round.update((r) => {
              r.totalScore = totalScore;
              r.totalPutts = totalPutts;
              r.fairwaysHit = fairwaysHit;
              r.greensInRegulation = greensInRegulation;
            });
          });

          // Reload active round if it's the one being updated
          if (activeRound?.id === roundId) {
            await get().loadActiveRound();
          }
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          set({ error });
          throw error;
        }
      },

      // Finish a round
      finishRound: async (roundId: string) => {
        set({ loading: true });

        try {
          await database.write(async () => {
            const round = await database.collections.get<Round>('rounds').find(roundId);
            await round.update((r) => {
              r.isFinished = true;
            });
          });

          // Round is now finished — no longer the active round
          set({ activeRound: null, loading: false });
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          set({ error, loading: false });
          throw error;
        }
      },

      // Delete a round
      deleteRound: async (roundId: string) => {
        set({ loading: true });

        try {
          await database.write(async () => {
            // Delete all holes for the round
            const holes = await database.collections
              .get<Hole>('holes')
              .query(Q.where('round_id', roundId))
              .fetch();

            for (const hole of holes) {
              await hole.markAsDeleted();
            }

            // Delete the round
            const round = await database.collections.get<Round>('rounds').find(roundId);
            await round.markAsDeleted();
          });

          const { activeRound } = get();

          // Clear active round if it was deleted
          if (activeRound?.id === roundId) {
            set({ activeRound: null });
          }

          // Reload all rounds
          await get().loadAllRounds();
          set({ loading: false });
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          set({ error, loading: false });
          throw error;
        }
      },

      // Clear active round from in-memory state only.
      // Does NOT mark the round as finished — the round remains unfinished in the DB.
      // This is critical for golfer switching: hiding a round is not finishing it.
      clearActiveRound: async () => {
        set({ activeRound: null });
      },

      // Load all rounds, optionally filtered by golfer
      loadAllRounds: async (golferId?: string) => {
        set({ loading: true, error: null });

        try {
          const clauses = [
            ...(golferId ? [Q.where('golfer_id', golferId)] : []),
            Q.sortBy('date', Q.desc),
          ];

          const rounds = await database.collections
            .get<Round>('rounds')
            .query(...clauses)
            .fetch();

          set({ rounds, loading: false });
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          set({ error, loading: false });
        }
      },

      // Set active round by ID (for navigating to a specific round)
      setActiveRound: async (roundId: string) => {
        try {
          const round = await database.collections.get<Round>('rounds').find(roundId);
          set({ activeRound: round });
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          set({ error });
          throw error;
        }
      },
    }),
    { name: 'RoundStore' }
  )
);
