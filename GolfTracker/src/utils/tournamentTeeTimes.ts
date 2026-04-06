import { format, parse, isValid } from 'date-fns';

/** Maximum number of rounds allowed per tournament. */
export const MAX_TOURNAMENT_ROUNDS = 4;

/** Tee times stored as a map from round number (1-indexed) to local datetime string (yyyy-MM-dd'T'HH:mm). */
export type TeeTimeMap = Record<number, string>;

const TEE_TIME_FORMAT = "yyyy-MM-dd'T'HH:mm";

/** Format a stored tee time string for display (e.g. "Apr 5, 10:00 AM"). */
export function formatTeeTime(teeTime: string): string {
  try {
    const parsed = parse(teeTime, TEE_TIME_FORMAT, new Date());
    if (!isValid(parsed)) return teeTime;
    return format(parsed, 'MMM d, h:mm a');
  } catch {
    return teeTime;
  }
}

/** Parse a stored tee time string into a Date (for DateTimePicker value). */
export function parseTeeTimeToDate(teeTime: string, fallback: Date): Date {
  try {
    const parsed = parse(teeTime, TEE_TIME_FORMAT, new Date());
    return isValid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/** Format a Date as a local tee time string for storage (no timezone). */
export function formatDateAsTeeTime(date: Date): string {
  return format(date, TEE_TIME_FORMAT);
}

/** Parse the tee_times JSON column, returning {} on null/invalid data. */
export function parseTournamentTeeTimes(raw: string | undefined | null): TeeTimeMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const result: TeeTimeMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      const roundNum = Number(key);
      if (Number.isInteger(roundNum) && roundNum >= 1 && roundNum <= MAX_TOURNAMENT_ROUNDS && typeof value === 'string' && value.length > 0) {
        result[roundNum] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
}

/** Serialize tee times for storage. Strips empty entries. Returns null when map is empty to clear the DB column (WatermelonDB ignores undefined assignments). */
export function serializeTournamentTeeTimes(teeTimes: TeeTimeMap): string | null {
  const clean: TeeTimeMap = {};
  for (const [key, value] of Object.entries(teeTimes)) {
    if (value && value.length > 0) {
      clean[Number(key)] = value;
    }
  }
  if (Object.keys(clean).length === 0) return null;
  return JSON.stringify(clean);
}
