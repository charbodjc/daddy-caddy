import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { database } from '../database/watermelon/database';
import Golfer from '../database/watermelon/models/Golfer';
import Round from '../database/watermelon/models/Round';
import { Q } from '@nozbe/watermelondb';
import { validateCreateGolfer } from '../validators/golferValidator';
import { getPreference, setPreference } from '../services/preferenceService';

const ACTIVE_GOLFER_KEY = 'active_golfer_id';

/** Color palette — WCAG AA compliant. */
const GOLFER_COLORS = [
  '#2E7D32', // green (default)
  '#1565C0', // blue
  '#6A1B9A', // purple
  '#C62828', // red
  '#EF6C00', // orange
  '#00838F', // teal
  '#4E342E', // brown
  '#37474F', // blue-grey
];

interface GolferState {
  golfers: Golfer[];
  activeGolferId: string | null;
  loading: boolean;
  error: Error | null;

  loadGolfers: () => Promise<void>;
  createGolfer: (data: { name: string; handicap?: number; color?: string }) => Promise<Golfer>;
  updateGolfer: (id: string, data: { name?: string; handicap?: number; color?: string }) => Promise<void>;
  deleteGolfer: (id: string) => Promise<{ reassignedCount: number }>;
  setActiveGolfer: (id: string) => Promise<void>;
  ensureDefaultGolfer: () => Promise<void>;
  getActiveGolferId: () => string | null;
}

export const useGolferStore = create<GolferState>()(
  devtools(
    (set, get) => ({
      golfers: [],
      activeGolferId: null,
      loading: false,
      error: null,

      loadGolfers: async () => {
        set({ loading: true, error: null });
        try {
          const golfers = await database.collections
            .get<Golfer>('golfers')
            .query(Q.sortBy('is_default', Q.desc), Q.sortBy('name', Q.asc))
            .fetch();
          set({ golfers, loading: false });
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          console.error('Failed to load golfers:', error);
          set({ error, loading: false });
        }
      },

      createGolfer: async (data) => {
        set({ loading: true, error: null });
        try {
          validateCreateGolfer(data);

          const color = data.color || getNextUnusedColor(get().golfers);

          const golfer = await database.write(async () => {
            return database.collections.get<Golfer>('golfers').create((g) => {
              g.name = data.name;
              if (data.handicap !== undefined) g.handicap = data.handicap;
              g.color = color;
              g.isDefault = false;
            });
          });

          await get().loadGolfers();
          set({ loading: false });
          return golfer;
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          set({ error, loading: false });
          throw error;
        }
      },

      updateGolfer: async (id, data) => {
        try {
          await database.write(async () => {
            const golfer = await database.collections.get<Golfer>('golfers').find(id);
            await golfer.update((g) => {
              if (data.name !== undefined) g.name = data.name;
              if (data.handicap !== undefined) g.handicap = data.handicap;
              if (data.color !== undefined) g.color = data.color;
            });
          });
          await get().loadGolfers();
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          set({ error });
          throw error;
        }
      },

      deleteGolfer: async (id) => {
        try {
          // Atomic: fetch + reassign + delete all inside one write block
          // to prevent concurrent createRound from slipping a new round in
          const reassignedCount = await database.write(async () => {
            const golfer = await database.collections.get<Golfer>('golfers').find(id);
            if (golfer.isDefault) {
              throw new Error('Cannot delete the default golfer');
            }

            const defaultGolfers = await database.collections
              .get<Golfer>('golfers')
              .query(Q.where('is_default', true))
              .fetch();
            const defaultGolfer = defaultGolfers[0];
            if (!defaultGolfer) {
              throw new Error('No default golfer found');
            }

            const rounds = await database.collections
              .get<Round>('rounds')
              .query(Q.where('golfer_id', id))
              .fetch();

            const batchOps = rounds.map((round) =>
              round.prepareUpdate((r) => {
                r.golferId = defaultGolfer.id;
              }),
            );
            await database.batch(
              ...batchOps,
              golfer.prepareMarkAsDeleted(),
            );

            return { count: rounds.length, defaultId: defaultGolfer.id };
          });

          // If the deleted golfer was active, switch to default
          if (get().activeGolferId === id) {
            await get().setActiveGolfer(reassignedCount.defaultId);
          }

          await get().loadGolfers();
          return { reassignedCount: reassignedCount.count };
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          set({ error });
          throw error;
        }
      },

      setActiveGolfer: async (id) => {
        try {
          await setPreference(ACTIVE_GOLFER_KEY, id);
          set({ activeGolferId: id });
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          set({ error });
          throw error;
        }
      },

      ensureDefaultGolfer: async () => {
        try {
          // DB operations: create default golfer + backfill orphan rounds
          // Kept in a single write() to prevent duplicate "Me" golfers
          const defaultGolfer = await database.write(async () => {
            const existing = await database.collections
              .get<Golfer>('golfers')
              .query(Q.where('is_default', true))
              .fetch();

            let golfer: Golfer;
            if (existing.length === 0) {
              golfer = await database.collections.get<Golfer>('golfers').create((g) => {
                g.name = 'Me';
                g.color = GOLFER_COLORS[0];
                g.isDefault = true;
              });
            } else {
              golfer = existing[0];
            }

            // Backfill orphan rounds using batch for performance
            const orphanRounds = await database.collections
              .get<Round>('rounds')
              .query(Q.where('golfer_id', null))
              .fetch();

            if (orphanRounds.length > 0) {
              const batchOps = orphanRounds.map((round) =>
                round.prepareUpdate((r) => {
                  r.golferId = golfer.id;
                }),
              );
              await database.batch(...batchOps);
            }

            return golfer;
          });

          // AsyncStorage operations OUTSIDE the writer to avoid blocking
          // DB writes while waiting on AsyncStorage I/O
          const storedId = await getPreference(ACTIVE_GOLFER_KEY);
          if (storedId) {
            // Verify the stored golfer still exists
            try {
              await database.collections.get<Golfer>('golfers').find(storedId);
              set({ activeGolferId: storedId });
            } catch {
              // Golfer was deleted — reset to default
              await setPreference(ACTIVE_GOLFER_KEY, defaultGolfer.id);
              set({ activeGolferId: defaultGolfer.id });
            }
          } else {
            await setPreference(ACTIVE_GOLFER_KEY, defaultGolfer.id);
            set({ activeGolferId: defaultGolfer.id });
          }
        } catch (err) {
          console.error('Failed to ensure default golfer:', err);
          const error = err instanceof Error ? err : new Error(String(err));
          set({ error });
        }
      },

      getActiveGolferId: () => {
        return get().activeGolferId;
      },
    }),
    { name: 'GolferStore' },
  ),
);

/** Pick the first color from the palette not used by any existing golfer. */
function getNextUnusedColor(golfers: Golfer[]): string {
  const usedColors = new Set(golfers.map((g) => g.color));
  for (const color of GOLFER_COLORS) {
    if (!usedColors.has(color)) return color;
  }
  // All used — wrap around
  return GOLFER_COLORS[golfers.length % GOLFER_COLORS.length];
}
