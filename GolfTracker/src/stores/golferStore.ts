import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Alert } from 'react-native';
import { database } from '../database/watermelon/database';
import Golfer from '../database/watermelon/models/Golfer';
import Round from '../database/watermelon/models/Round';
import { Q } from '@nozbe/watermelondb';
import { validateCreateGolfer } from '../validators/golferValidator';
import { getPreference, setPreference, removePreference } from '../services/preferenceService';
import type { SmsContact } from '../types';

const ACTIVE_GOLFER_KEY = 'active_golfer_id';
const CONTACTS_MIGRATED_KEY = 'sms_contacts_migrated';

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
  updateGolferContacts: (golferId: string, contacts: SmsContact[]) => Promise<void>;
  getGolferContacts: (golferId: string) => Promise<SmsContact[]>;
  migrateGlobalContacts: () => Promise<void>;
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

      updateGolferContacts: async (golferId, contacts) => {
        try {
          await database.write(async () => {
            const golfer = await database.collections.get<Golfer>('golfers').find(golferId);
            await golfer.update((g) => {
              g.smsContactsRaw = JSON.stringify(contacts);
            });
          });
          await get().loadGolfers();
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          set({ error });
          throw error;
        }
      },

      getGolferContacts: async (golferId) => {
        try {
          const golfer = await database.collections.get<Golfer>('golfers').find(golferId);
          return parseGolferContacts(golfer.smsContactsRaw);
        } catch {
          return [];
        }
      },

      migrateGlobalContacts: async () => {
        try {
          const alreadyMigrated = await getPreference(CONTACTS_MIGRATED_KEY);
          if (alreadyMigrated) return;

          const raw = await getPreference('default_sms_group');
          if (!raw) {
            await setPreference(CONTACTS_MIGRATED_KEY, 'true');
            return;
          }

          let legacyContacts: SmsContact[];
          try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
              await setPreference(CONTACTS_MIGRATED_KEY, 'true');
              return;
            }
            legacyContacts = parsed.filter(
              (c: Record<string, unknown>) => c && typeof c.phoneNumber === 'string',
            );
          } catch {
            // Unparseable legacy format — clean it up
            await removePreference('default_sms_group');
            await removePreference('default_sms_group_name');
            await setPreference(CONTACTS_MIGRATED_KEY, 'true');
            return;
          }

          if (legacyContacts.length === 0) {
            await removePreference('default_sms_group');
            await removePreference('default_sms_group_name');
            await setPreference(CONTACTS_MIGRATED_KEY, 'true');
            return;
          }

          // Prompt user
          const userChoice = await new Promise<'migrate' | 'skip'>((resolve) => {
            Alert.alert(
              'Migrate SMS Contacts',
              `You have ${legacyContacts.length} contact${legacyContacts.length !== 1 ? 's' : ''} in your default SMS group. Would you like to assign them to your default golfer profile?`,
              [
                { text: 'Skip', style: 'cancel', onPress: () => resolve('skip') },
                { text: 'Migrate', onPress: () => resolve('migrate') },
              ],
              { cancelable: false },
            );
          });

          if (userChoice === 'migrate') {
            const defaultGolfers = await database.collections
              .get<Golfer>('golfers')
              .query(Q.where('is_default', true))
              .fetch();

            if (defaultGolfers.length > 0) {
              await database.write(async () => {
                await defaultGolfers[0].update((g) => {
                  g.smsContactsRaw = JSON.stringify(legacyContacts);
                });
              });
              await get().loadGolfers();
            }
          }

          // Clean up legacy keys regardless of choice
          await removePreference('default_sms_group');
          await removePreference('default_sms_group_name');
          await setPreference(CONTACTS_MIGRATED_KEY, 'true');
        } catch (err) {
          console.error('Failed to migrate global contacts:', err);
        }
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

/** Parse the sms_contacts JSON column, returning [] on null/invalid data. */
export function parseGolferContacts(raw: string | undefined | null): SmsContact[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c: Record<string, unknown>) =>
        c &&
        typeof c.id === 'string' &&
        typeof c.name === 'string' &&
        typeof c.phoneNumber === 'string' &&
        (c.phoneNumber as string).length > 0,
    );
  } catch {
    return [];
  }
}
