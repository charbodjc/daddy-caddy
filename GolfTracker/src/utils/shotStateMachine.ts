/**
 * shotStateMachine.ts
 *
 * Pure-function module that determines valid shot options based on
 * hole par, current stroke number, and previous shot history.
 * No side effects, no React dependencies — fully testable and offline.
 */

import { TrackedShot, SHOT_TYPES, SHOT_RESULTS } from '../types';

// ── Types ──────────────────────────────────────────────────────

export interface ShotContext {
  par: number;                    // 3, 4, or 5
  shotNumber: number;             // current stroke (1-based)
  previousShots: TrackedShot[];   // shots taken so far
}

export interface ShotOption {
  label: string;
  value: string;
}

export interface ShotOptions {
  recommendedType: string;         // auto-selected shot type
  availableTypes: string[];        // types the user can manually pick
  resultOptions: ShotOption[];     // valid results for the recommended type
}

// ── Result option sets ─────────────────────────────────────────

const TEE_SHOT_PAR3: ShotOption[] = [
  { label: 'On Green', value: SHOT_RESULTS.GREEN },
  { label: 'Left', value: SHOT_RESULTS.LEFT },
  { label: 'Right', value: SHOT_RESULTS.RIGHT },
  { label: 'Rough', value: SHOT_RESULTS.ROUGH },
  { label: 'Sand', value: SHOT_RESULTS.SAND },
  { label: 'Hazard', value: SHOT_RESULTS.HAZARD },
];

const TEE_SHOT_PAR4: ShotOption[] = [
  { label: 'Fairway', value: SHOT_RESULTS.CENTER },
  { label: 'On Green', value: SHOT_RESULTS.GREEN },
  { label: 'Left', value: SHOT_RESULTS.LEFT },
  { label: 'Right', value: SHOT_RESULTS.RIGHT },
  { label: 'Rough', value: SHOT_RESULTS.ROUGH },
  { label: 'Sand', value: SHOT_RESULTS.SAND },
  { label: 'OB', value: SHOT_RESULTS.OB },
];

const TEE_SHOT_PAR5: ShotOption[] = [
  { label: 'Fairway', value: SHOT_RESULTS.CENTER },
  { label: 'Left', value: SHOT_RESULTS.LEFT },
  { label: 'Right', value: SHOT_RESULTS.RIGHT },
  { label: 'Rough', value: SHOT_RESULTS.ROUGH },
  { label: 'Sand', value: SHOT_RESULTS.SAND },
  { label: 'OB', value: SHOT_RESULTS.OB },
];

const APPROACH_FROM_FAIRWAY: ShotOption[] = [
  { label: 'On Green', value: SHOT_RESULTS.GREEN },
  { label: 'Left', value: SHOT_RESULTS.LEFT },
  { label: 'Right', value: SHOT_RESULTS.RIGHT },
  { label: 'Rough', value: SHOT_RESULTS.ROUGH },
  { label: 'Sand', value: SHOT_RESULTS.SAND },
  { label: 'Hazard', value: SHOT_RESULTS.HAZARD },
];

const APPROACH_FROM_SAND: ShotOption[] = [
  { label: 'On Green', value: SHOT_RESULTS.GREEN },
  { label: 'Sand', value: SHOT_RESULTS.SAND },
  { label: 'Left', value: SHOT_RESULTS.LEFT },
  { label: 'Right', value: SHOT_RESULTS.RIGHT },
];

const APPROACH_FROM_ROUGH: ShotOption[] = [
  { label: 'On Green', value: SHOT_RESULTS.GREEN },
  { label: 'Left', value: SHOT_RESULTS.LEFT },
  { label: 'Right', value: SHOT_RESULTS.RIGHT },
  { label: 'Sand', value: SHOT_RESULTS.SAND },
  { label: 'Rough', value: SHOT_RESULTS.ROUGH },
];

const PUTT_OPTIONS: ShotOption[] = [
  { label: 'Made', value: SHOT_RESULTS.MADE },
  { label: 'Missed', value: SHOT_RESULTS.MISSED },
];

const PENALTY_OPTIONS: ShotOption[] = [
  { label: 'OB', value: SHOT_RESULTS.OB },
  { label: 'Hazard', value: SHOT_RESULTS.HAZARD },
  { label: 'Lost Ball', value: SHOT_RESULTS.OB },
];

// ── Helpers ────────────────────────────────────────────────────

function getLastNonPenaltyShot(shots: TrackedShot[]): TrackedShot | null {
  for (let i = shots.length - 1; i >= 0; i--) {
    if (shots[i].type !== SHOT_TYPES.PENALTY) {
      return shots[i];
    }
  }
  return null;
}

function getLastShotResult(shots: TrackedShot[]): string | null {
  const lastShot = getLastNonPenaltyShot(shots);
  if (!lastShot || lastShot.results.length === 0) return null;
  return lastShot.results[0];
}

function getTeeResultsForPar(par: number): ShotOption[] {
  if (par <= 3) return TEE_SHOT_PAR3;
  if (par === 4) return TEE_SHOT_PAR4;
  return TEE_SHOT_PAR5;
}

function getApproachResults(previousShots: TrackedShot[]): ShotOption[] {
  const lastResult = getLastShotResult(previousShots);

  if (lastResult === SHOT_RESULTS.SAND) return APPROACH_FROM_SAND;
  if (lastResult === SHOT_RESULTS.ROUGH) return APPROACH_FROM_ROUGH;
  return APPROACH_FROM_FAIRWAY;
}

function determineRecommendedType(previousShots: TrackedShot[]): string {
  if (previousShots.length === 0) return SHOT_TYPES.TEE_SHOT;

  const lastShot = previousShots[previousShots.length - 1];

  if (lastShot.type === SHOT_TYPES.PENALTY) {
    return SHOT_TYPES.APPROACH;
  }

  if (lastShot.type === SHOT_TYPES.PUTT) {
    return SHOT_TYPES.PUTT;
  }

  const lastResult = lastShot.results[0];
  if (lastResult === SHOT_RESULTS.GREEN) {
    return SHOT_TYPES.PUTT;
  }

  if (lastShot.type === SHOT_TYPES.TEE_SHOT) {
    return SHOT_TYPES.APPROACH;
  }

  // After approach that didn't hit green, stay on approach
  return SHOT_TYPES.APPROACH;
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Returns the recommended shot type, available types, and result options
 * based on the current hole context.
 */
export function getNextShotOptions(context: ShotContext): ShotOptions {
  const { previousShots } = context;
  const recommendedType = determineRecommendedType(previousShots);

  // Available types: recommended + penalty is always available
  const availableTypes = [recommendedType];
  if (recommendedType !== SHOT_TYPES.PENALTY) {
    availableTypes.push(SHOT_TYPES.PENALTY);
  }
  // If on approach, also allow putt (for chipping close situations)
  if (recommendedType === SHOT_TYPES.APPROACH) {
    availableTypes.push(SHOT_TYPES.PUTT);
  }

  const resultOptions = getResultsForType(context, recommendedType);

  return { recommendedType, availableTypes, resultOptions };
}

/**
 * Returns the valid result options for a specific shot type
 * given the current context (par, previous shots).
 */
export function getResultsForType(
  context: ShotContext,
  shotType: string,
): ShotOption[] {
  const { par, previousShots } = context;

  switch (shotType) {
    case SHOT_TYPES.TEE_SHOT:
      return getTeeResultsForPar(par);
    case SHOT_TYPES.APPROACH:
      return getApproachResults(previousShots);
    case SHOT_TYPES.PUTT:
      return PUTT_OPTIONS;
    case SHOT_TYPES.PENALTY:
      return PENALTY_OPTIONS;
    default:
      return APPROACH_FROM_FAIRWAY;
  }
}
