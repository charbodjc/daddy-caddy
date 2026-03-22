/** Parse the golfer_ids JSON column, returning [] on null/invalid data. */
export function parseTournamentGolferIds(raw: string | undefined | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string' && id.length > 0);
  } catch {
    return [];
  }
}

/** Serialize golfer IDs for storage in the golfer_ids column. */
export function serializeTournamentGolferIds(ids: string[]): string {
  return JSON.stringify(ids);
}
