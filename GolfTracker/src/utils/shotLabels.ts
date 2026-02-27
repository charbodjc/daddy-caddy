import { SHOT_RESULTS } from '../types';

/**
 * Map a shot result string to a human-readable display label.
 * Single source of truth — used by HoleSummaryScreen, StatsScreen, ShotTrackingScreen, and AI analysis.
 */
export function getResultLabel(result: string): string {
  switch (result) {
    case SHOT_RESULTS.LEFT: return 'Left';
    case SHOT_RESULTS.RIGHT: return 'Right';
    case SHOT_RESULTS.CENTER: return 'Fairway';
    case SHOT_RESULTS.GREEN: return 'On Green';
    case SHOT_RESULTS.ROUGH: return 'Rough';
    case SHOT_RESULTS.SAND: return 'Sand';
    case SHOT_RESULTS.HAZARD: return 'Hazard';
    case SHOT_RESULTS.OB: return 'OB';
    case SHOT_RESULTS.MADE: return 'Made';
    case SHOT_RESULTS.MISSED: return 'Missed';
    default: return result;
  }
}
