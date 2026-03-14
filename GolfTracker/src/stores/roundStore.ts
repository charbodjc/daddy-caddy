import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { database } from '../database/watermelon/database';
import Round from '../database/watermelon/models/Round';
import Hole from '../database/watermelon/models/Hole';
import { Q } from '@nozbe/watermelondb';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HoleData, CreateRoundData } from '../validators/roundValidator';

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
  loadAllRounds: () => Promise<void>;
  setActiveRound: (roundId: string) => Promise<void>;
}

export const useRoundStore = create<RoundState>()(
  devtools(
    (set, get) => ({
      activeRound: null,
      rounds: [],
      loading: false,
      error: null,
      
      // Load active round from storage
      loadActiveRound: async () => {
        set({ loading: true, error: null });
        
        try {
          const activeRoundId = await AsyncStorage.getItem('active_round_id');
          
          if (!activeRoundId) {
            set({ activeRound: null, loading: false });
            return;
          }
          
          const round = await database.collections
            .get<Round>('rounds')
            .find(activeRoundId);
          
          set({ activeRound: round, loading: false });
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
          // Create round and all 18 holes in a single write transaction
          const round = await database.write(async () => {
            const newRound = await database.collections.get<Round>('rounds').create((r) => {
              r.courseName = data.courseName;
              r.date = data.date || new Date();
              r.isFinished = false;
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
          
          // Set as active round
          await AsyncStorage.setItem('active_round_id', round.id);
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

            if (holes.length > 0) {
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
            }

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
          
          // Clear active round
          await AsyncStorage.removeItem('active_round_id');
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
            await AsyncStorage.removeItem('active_round_id');
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

      // Clear active round
      clearActiveRound: async () => {
        await AsyncStorage.removeItem('active_round_id');
        set({ activeRound: null });
      },
      
      // Load all rounds
      loadAllRounds: async () => {
        set({ loading: true, error: null });
        
        try {
          const rounds = await database.collections
            .get<Round>('rounds')
            .query(Q.sortBy('date', Q.desc))
            .fetch();
          
          set({ rounds, loading: false });
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          set({ error, loading: false });
        }
      },
      
      // Set active round
      setActiveRound: async (roundId: string) => {
        try {
          const round = await database.collections.get<Round>('rounds').find(roundId);
          await AsyncStorage.setItem('active_round_id', roundId);
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

