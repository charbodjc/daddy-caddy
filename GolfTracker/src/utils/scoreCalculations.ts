/**
 * scoreCalculations.ts
 *
 * Shared score calculation utilities to eliminate duplicated score-to-par
 * formatting and score breakdown logic across screens and services.
 */

export interface ScoreBreakdown {
  eagles: number;
  birdies: number;
  pars: number;
  bogeys: number;
  doublePlus: number;
}

/**
 * Format a numeric score-vs-par value as a display string.
 * Examples: +3, E, -2
 */
export function formatScoreVsPar(score: number): string {
  if (score > 0) return `+${score}`;
  if (score === 0) return 'E';
  return score.toString();
}

/**
 * Calculate score breakdown counts from an array of hole data.
 * Each hole must have `strokes` and `par` fields.
 * Holes with strokes <= 0 are skipped.
 */
export function calculateScoreBreakdown(
  holes: Array<{ strokes: number; par: number }>,
): ScoreBreakdown {
  const breakdown: ScoreBreakdown = {
    eagles: 0,
    birdies: 0,
    pars: 0,
    bogeys: 0,
    doublePlus: 0,
  };

  for (const hole of holes) {
    if (hole.strokes <= 0) continue;
    const diff = hole.strokes - hole.par;
    if (diff <= -2) breakdown.eagles++;
    else if (diff === -1) breakdown.birdies++;
    else if (diff === 0) breakdown.pars++;
    else if (diff === 1) breakdown.bogeys++;
    else breakdown.doublePlus++;
  }

  return breakdown;
}
