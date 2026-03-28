/**
 * Shared color constants for scoring components.
 * Single source of truth — all scoring UI references these.
 */

export const SCORING_COLORS = {
  // Primary actions
  green: '#2E7D32',
  red: '#F44336',
  white: '#fff',
  bg: '#f5f5f5',

  // Center buttons
  fairway: '#43A047',
  greenBtn: '#2E7D32',
  hole: '#1565C0',

  // Classification buttons
  rough: '#558B2F',
  bunker: '#B8860B',
  trouble: '#795548',
  hazard: '#0288D1',
  lost: '#9E9E9E',

  // Putt miss buttons (gradient for visual hierarchy)
  puttMissLongHigh: '#BF360C',
  puttMissLongLow: '#D84315',
  puttMissShortHigh: '#E65100',
  puttMissShortLow: '#EF6C00',
  puttMissSide: '#546E7A',

  // Swing toggle
  swingFreeBg: '#E3F2FD',
  swingFreeBorder: '#1E88E5',
  swingFreeText: '#1565C0',
  swingRestricted: '#E65100',

  // Misc
  skip: '#9E9E9E',
  disabled: '#e0e0e0',

  // Opacity
  disabledOpacity: 0.5,
} as const;
