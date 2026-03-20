/**
 * scoreColors.ts
 *
 * Unified score color and naming utility for consistent display
 * of golf scores relative to par across the app.
 */

/**
 * Returns a foreground color for a score relative to par.
 */
export function getScoreColor(strokesVsPar: number): string {
  if (strokesVsPar <= -2) return '#FFD700'; // gold – eagle or better
  if (strokesVsPar === -1) return '#2E7D32'; // green – birdie
  if (strokesVsPar === 0) return '#333333'; // neutral dark – par
  if (strokesVsPar === 1) return '#FF9800'; // orange – bogey
  return '#f44336'; // red – double bogey or worse
}

/**
 * Returns the human-readable name for a score relative to par.
 */
export function getScoreName(strokesVsPar: number): string {
  if (strokesVsPar <= -3) return 'Albatross';
  if (strokesVsPar === -2) return 'Eagle';
  if (strokesVsPar === -1) return 'Birdie';
  if (strokesVsPar === 0) return 'Par';
  if (strokesVsPar === 1) return 'Bogey';
  if (strokesVsPar === 2) return 'Double Bogey';
  if (strokesVsPar === 3) return 'Triple Bogey';
  return `+${strokesVsPar}`;
}

/**
 * Returns a lighter background color suitable for score badges/cards.
 */
export function getScoreBackgroundColor(strokesVsPar: number): string {
  if (strokesVsPar <= -2) return '#FFF8E1'; // light gold
  if (strokesVsPar === -1) return '#E8F5E9'; // light green
  if (strokesVsPar === 0) return '#F5F5F5'; // light grey
  if (strokesVsPar === 1) return '#FFF3E0'; // light orange
  return '#FFEBEE'; // light red
}
