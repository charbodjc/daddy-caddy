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
import {
  startRoundActivity,
  updateRoundActivity,
  endRoundActivity,
  getRunningActivityId,
} from '../../modules/live-activity';
import { sendRoundContext } from '../../modules/watch-connectivity';

export interface UnfinishedRoundSummary {
  roundId: string;
  courseName: string;
  holesPlayed: number;
  totalScore: number;
  playedPar: number;
}

/**
 * Check if a golfer has an unfinished round with played holes.
 * Used by UI to warn before silently auto-finishing via createRound().
 */
export async function getUnfinishedRoundSummary(
  golferId: string,
): Promise<UnfinishedRoundSummary | null> {
  const unfinished = await database.collections
    .get<Round>('rounds')
    .query(
      Q.where('is_finished', false),
      Q.where('golfer_id', golferId),
      Q.sortBy('created_at', Q.desc),
      Q.take(1),
    )
    .fetch();

  if (unfinished.length === 0) return null;

  const round = unfinished[0];
  const holes: Hole[] = await round.holes.fetch();
  const played = holes.filter((h) => h.strokes > 0);

  if (played.length === 0) return null; // No data to lose

  const totalScore = played.reduce((sum, h) => sum + h.strokes, 0);
  const playedPar = played.reduce((sum, h) => sum + h.par, 0);

  return {
    roundId: round.id,
    courseName: round.courseName,
    holesPlayed: played.length,
    totalScore,
    playedPar,
  };
}

interface RoundState {
  activeRound: Round | null;
  liveActivityId: string | null;
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
      liveActivityId: null,
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

          const activeRound = unfinished[0] ?? null;

          // Only recover Live Activity if we don't already have one tracked
          // (avoids double-update when called from updateHole)
          const existingActivityId = get().liveActivityId;
          let liveActivityId = existingActivityId;

          if (activeRound && !existingActivityId) {
            // Recover Live Activity ID after app relaunch
            liveActivityId = await getRunningActivityId(activeRound.id);

            // Push an immediate update so the Lock Screen shows current data
            if (liveActivityId) {
              const allHoles: Hole[] = await activeRound.holes.fetch();
              const completedHoles = allHoles.filter((h: Hole) => h.strokes > 0);
              const totalScore = completedHoles.reduce((sum: number, h: Hole) => sum + h.strokes, 0);
              const playedPar = completedHoles.reduce((sum: number, h: Hole) => sum + h.par, 0);
              const maxHole = completedHoles.length > 0
                ? Math.max(...completedHoles.map((h: Hole) => h.holeNumber))
                : 1;
              updateRoundActivity(liveActivityId, {
                currentHole: maxHole,
                totalScore,
                scoreVsPar: totalScore - playedPar,
                holesCompleted: completedHoles.length,
                totalHoles: allHoles.length,
              }).catch((err) => console.warn('Live Activity update failed:', err));
            }
          } else if (!activeRound) {
            liveActivityId = null;
          }

          set({ activeRound, liveActivityId, loading: false });
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          console.error('Failed to load active round:', error);
          set({ error, loading: false, activeRound: null });
        }
      },

      // Create a new round
      createRound: async (data: CreateRoundData) => {
        set({ error: null });

        try {
          // Validate input before touching the database
          validateCreateRound(data);

          // End any existing Live Activity before the write transaction
          // (native calls must be outside database.write to avoid rollback on throw)
          const { liveActivityId: previousActivityId } = get();
          if (previousActivityId) {
            await endRoundActivity(previousActivityId, {
              currentHole: 0, totalScore: 0, scoreVsPar: 0, holesCompleted: 0, totalHoles: 18,
            }).catch((err) => console.warn('Live Activity failed:', err));
            set({ liveActivityId: null });
          }

          // Create round and all 18 holes in a single write transaction
          const round = await database.write(async () => {
            const golferId = data.golferId || useGolferStore.getState().getActiveGolferId();

            // Auto-finish any existing unfinished round for this golfer to prevent orphans
            if (golferId) {
              const existing = await database.collections
                .get<Round>('rounds')
                .query(
                  Q.where('is_finished', false),
                  Q.where('golfer_id', golferId),
                )
                .fetch();
              if (existing.length > 0) {
                await database.batch(
                  ...existing.map((r) => r.prepareUpdate((rec) => { rec.isFinished = true; })),
                );
              }
            }

            const newRound = await database.collections.get<Round>('rounds').create((r) => {
              r.courseName = data.courseName;
              r.date = data.date || new Date();
              r.isFinished = false;
              if (golferId) r.golferId = golferId;
              if (data.tournamentId) r.tournamentId = data.tournamentId;
              if (data.tournamentName) r.tournamentName = data.tournamentName;
            });

            const standardPars = [4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5];
            const holeBatch = standardPars.map((par, idx) =>
              database.collections.get<Hole>('holes').prepareCreate((h) => {
                h.roundId = newRound.id;
                h.holeNumber = idx + 1;
                h.par = par;
                h.strokes = 0;
              }),
            );
            await database.batch(...holeBatch);

            return newRound;
          });

          // Round is unfinished, so it becomes the active round automatically
          set({ activeRound: round });

          // Start Live Activity (fire-and-forget — never block round creation)
          startRoundActivity(data.courseName, round.id, 18).then((id) => {
            if (id) {
              console.info('[LiveActivity] Active — Dynamic Island should be visible');
              set({ liveActivityId: id });
            } else {
              console.warn('[LiveActivity] Not started — Dynamic Island will not show');
            }
          }).catch((err) => console.warn('Live Activity start failed:', err));

          return round;
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          set({ error });
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
          // Returns computed stats for the Live Activity update
          const stats = await database.write(async () => {
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
            const playedPar = completedHoles.reduce((sum: number, h: Hole) => sum + h.par, 0);
            const maxHoleNumber = completedHoles.length > 0
              ? Math.max(...completedHoles.map((h: Hole) => h.holeNumber))
              : 1;

            await round.update((r) => {
              r.totalScore = totalScore;
              r.totalPutts = totalPutts;
              r.fairwaysHit = fairwaysHit;
              r.greensInRegulation = greensInRegulation;
            });

            return { totalScore, playedPar, holesCompleted: completedHoles.length, maxHoleNumber, totalHoles: allHoles.length };
          });

          // Update Live Activity outside the DB transaction (fire-and-forget)
          const { liveActivityId } = get();
          if (liveActivityId) {
            updateRoundActivity(liveActivityId, {
              currentHole: stats.maxHoleNumber,
              totalScore: stats.totalScore,
              scoreVsPar: stats.totalScore - stats.playedPar,
              holesCompleted: stats.holesCompleted,
              totalHoles: stats.totalHoles,
            }).catch((err) => console.warn('Live Activity failed:', err));
          }

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
        try {
          await database.write(async () => {
            const round = await database.collections.get<Round>('rounds').find(roundId);
            await round.update((r) => {
              r.isFinished = true;
            });
          });

          // End Live Activity with final stats (fire-and-forget)
          const { liveActivityId } = get();
          if (liveActivityId) {
            const round = await database.collections.get<Round>('rounds').find(roundId);
            const allHoles: Hole[] = await round.holes.fetch();
            const completedHoles = allHoles.filter((h: Hole) => h.strokes > 0);
            const totalScore = completedHoles.reduce((sum: number, h: Hole) => sum + h.strokes, 0);
            const playedPar = completedHoles.reduce((sum: number, h: Hole) => sum + h.par, 0);
            const maxHole = completedHoles.length > 0
              ? Math.max(...completedHoles.map((h: Hole) => h.holeNumber))
              : 18;
            endRoundActivity(liveActivityId, {
              currentHole: maxHole,
              totalScore,
              scoreVsPar: totalScore - playedPar,
              holesCompleted: completedHoles.length,
              totalHoles: allHoles.length,
            }).catch((err) => console.warn('Live Activity failed:', err));
          }

          // Round is now finished — no longer the active round
          sendRoundContext(null);
          set({ activeRound: null, liveActivityId: null });
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          set({ error });
          throw error;
        }
      },

      // Delete a round
      deleteRound: async (roundId: string) => {
        try {
          await database.write(async () => {
            // Delete all holes for the round
            const holes = await database.collections
              .get<Hole>('holes')
              .query(Q.where('round_id', roundId))
              .fetch();

            const round = await database.collections.get<Round>('rounds').find(roundId);
            await database.batch(
              ...holes.map((hole) => hole.prepareMarkAsDeleted()),
              round.prepareMarkAsDeleted(),
            );
          });

          const { activeRound, liveActivityId } = get();

          // Clear active round and end Live Activity if it was deleted
          if (activeRound?.id === roundId) {
            if (liveActivityId) {
              endRoundActivity(liveActivityId, {
                currentHole: 0, totalScore: 0, scoreVsPar: 0, holesCompleted: 0, totalHoles: 18,
              }).catch((err) => console.warn('Live Activity failed:', err));
            }
            set({ activeRound: null, liveActivityId: null });
          }

          // Remove deleted round from in-memory list instead of re-querying the DB
          set({ rounds: get().rounds.filter((r) => r.id !== roundId) });
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          set({ error });
          throw error;
        }
      },

      // Clear active round from in-memory state only.
      // Does NOT mark the round as finished — the round remains unfinished in the DB.
      // This is critical for golfer switching: hiding a round is not finishing it.
      clearActiveRound: async () => {
        const { liveActivityId } = get();
        if (liveActivityId) {
          // Dismiss immediately — don't show zeroed stats on Lock Screen
          endRoundActivity(liveActivityId, {
            currentHole: 0, totalScore: 0, scoreVsPar: 0, holesCompleted: 0, totalHoles: 18,
          }, true).catch((err) => console.warn('Live Activity end failed:', err));
        }
        sendRoundContext(null);
        set({ activeRound: null, liveActivityId: null });
      },

      // Load all rounds, optionally filtered by golfer
      loadAllRounds: async (golferId?: string) => {
        set({ error: null });

        try {
          const clauses = [
            ...(golferId ? [Q.where('golfer_id', golferId)] : []),
            Q.sortBy('date', Q.desc),
          ];

          const rounds = await database.collections
            .get<Round>('rounds')
            .query(...clauses)
            .fetch();

          set({ rounds });
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          set({ error });
        }
      },

      // Set active round by ID (for navigating to a specific round, including deep links)
      setActiveRound: async (roundId: string) => {
        try {
          const round = await database.collections.get<Round>('rounds').find(roundId);
          // Recover Live Activity if we don't already have one tracked
          const existingActivityId = get().liveActivityId;
          const liveActivityId = existingActivityId ?? await getRunningActivityId(roundId);
          set({ activeRound: round, liveActivityId });
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
