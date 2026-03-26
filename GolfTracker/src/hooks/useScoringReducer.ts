/**
 * useScoringReducer.ts
 *
 * Pure state machine for the unified scoring screen.
 * All shot recording, undo, and phase transitions live here.
 * No side effects (DB, SMS, navigation) — those stay in the screen.
 */

import { useReducer, useCallback } from 'react';
import { SHOT_TYPES, SHOT_RESULTS } from '../types';
import type { TrackedShot, ShotType, ShotResult } from '../types';

// ── Phase (what the UI should show) ─────────────────────────────

export type ScoringPhase =
  | 'awaiting_direction'      // Compass visible, clean slate
  | 'awaiting_action'         // Center button tapped → Commit / Describe
  | 'awaiting_classification' // Direction tapped (or Describe) → classification panel
  | 'awaiting_putt_distance'  // Auto-prompt after Green commit → ft keypad
  | 'hole_complete';          // In The Hole confirmed → SMS + navigate away

// ── Center button values ────────────────────────────────────────

export type CenterResult = 'fairway' | 'green' | 'hole';

// ── Classification values (UI labels → SHOT_RESULTS mapping) ────

export type Classification = 'fairway' | 'rough' | 'bunker' | 'trouble' | 'hazard' | 'lost' | 'ob';

export function classificationToResult(c: Classification): string {
  switch (c) {
    case 'fairway': return SHOT_RESULTS.FAIRWAY;
    case 'rough': return SHOT_RESULTS.ROUGH;
    case 'bunker': return SHOT_RESULTS.SAND;
    case 'trouble': return SHOT_RESULTS.ROUGH; // catch-all, maps to rough for stats
    case 'hazard': return SHOT_RESULTS.HAZARD;
    case 'lost': return SHOT_RESULTS.LOST;
    case 'ob': return SHOT_RESULTS.OB;
  }
}

export function classificationIsPenalty(c: Classification): boolean {
  return c === 'hazard' || c === 'lost' || c === 'ob';
}

// ── Center button → results[0] mapping ──────────────────────────

export function centerResultToShotResult(c: CenterResult): string {
  switch (c) {
    case 'fairway': return SHOT_RESULTS.CENTER; // preserves fairwayHit stat
    case 'green': return SHOT_RESULTS.GREEN;
    case 'hole': return SHOT_RESULTS.MADE;
  }
}

// ── Shot type derivation ────────────────────────────────────────

export function deriveShotType(stroke: number, isOnGreen: boolean): ShotType {
  if (stroke === 1) return SHOT_TYPES.TEE_SHOT;
  if (isOnGreen) return SHOT_TYPES.PUTT;
  return SHOT_TYPES.APPROACH;
}

// ── State ───────────────────────────────────────────────────────

export interface ScoringState {
  phase: ScoringPhase;
  shots: TrackedShot[];
  currentStroke: number;
  isOnGreen: boolean;

  // Pending shot data (cleared on commit/undo)
  pendingDirection: ShotResult | null;
  pendingCenterResult: CenterResult | null;
  pendingClassification: Classification | null;

  // Shot type
  derivedShotType: ShotType;
  overriddenShotType: ShotType | null;

  // First putt distance (auto-prompted when landing on green, attached to first putt on commit)
  firstPuttDistance: string | null;

  // Hole par (needed for status messages)
  par: number;
}

// ── Actions ─────────────────────────────────────────────────────

export type ScoringAction =
  | { type: 'TAP_CENTER'; result: CenterResult }
  | { type: 'TAP_DIRECTION'; direction: ShotResult }
  | { type: 'TAP_CLASSIFICATION'; classification: Classification }
  | { type: 'SUBMIT_DISTANCE'; value: string }
  | { type: 'SKIP_DISTANCE' }
  | { type: 'COMMIT' }
  | { type: 'DESCRIBE' }
  | { type: 'CONFIRM_HOLE_COMPLETE' }
  | { type: 'CANCEL_HOLE_COMPLETE' }
  | { type: 'UNDO' }
  | { type: 'OVERRIDE_SHOT_TYPE'; shotType: ShotType }
  | { type: 'RESTORE'; shots: TrackedShot[]; currentStroke: number; par: number };

// ── Helpers ─────────────────────────────────────────────────────

function clearPending(state: ScoringState): ScoringState {
  return {
    ...state,
    pendingDirection: null,
    pendingCenterResult: null,
    pendingClassification: null,
    overriddenShotType: null,
  };
}

// Results that indicate the ball left the green (e.g., putt rolled off into bunker)
const OFF_GREEN_RESULTS: ReadonlySet<string> = new Set([
  SHOT_RESULTS.ROUGH, SHOT_RESULTS.SAND, SHOT_RESULTS.FAIRWAY,
  SHOT_RESULTS.HAZARD, SHOT_RESULTS.OB, SHOT_RESULTS.LOST, SHOT_RESULTS.WATER,
]);

function deriveIsOnGreen(shots: TrackedShot[]): boolean {
  if (shots.length === 0) return false;
  const last = shots[shots.length - 1];

  // Explicitly landed on green
  if (last.results.includes(SHOT_RESULTS.GREEN)) return true;

  // Made it in the hole — technically not "on green" but hole is over
  if (last.results.includes(SHOT_RESULTS.MADE)) return true;

  // A putt that didn't classify as off-green is still on the green (missed but stayed on)
  if (last.type === SHOT_TYPES.PUTT) {
    const hasOffGreenResult = last.results.some(r => OFF_GREEN_RESULTS.has(r));
    return !hasOffGreenResult;
  }

  return false;
}

function buildShotFromState(state: ScoringState): TrackedShot {
  const shotType = state.overriddenShotType ?? state.derivedShotType;
  const results: string[] = [];

  if (state.pendingCenterResult) {
    results.push(centerResultToShotResult(state.pendingCenterResult));
  } else if (state.pendingDirection) {
    results.push(state.pendingDirection);
  }

  if (state.pendingClassification) {
    results.push(classificationToResult(state.pendingClassification));
  }

  const shot: TrackedShot = {
    stroke: state.currentStroke,
    type: shotType,
    results,
  };

  // Attach first putt distance if this is the first putt and distance was auto-prompted
  if (state.firstPuttDistance && shotType === SHOT_TYPES.PUTT && !shot.puttDistance) {
    shot.puttDistance = `${state.firstPuttDistance} ft`;
  }

  // Penalty
  if (state.pendingClassification && classificationIsPenalty(state.pendingClassification)) {
    shot.penaltyStrokes = 1;
  }

  return shot;
}

// ── Shared commit logic ─────────────────────────────────────────

function commitShot(state: ScoringState): ScoringState {
  const shot = buildShotFromState(state);
  const updatedShots = [...state.shots, shot];
  const nextStroke = state.currentStroke + 1;

  const landedOnGreen = state.pendingCenterResult === 'green';
  const isOnGreen = deriveIsOnGreen(updatedShots);
  const newDerived = deriveShotType(nextStroke, isOnGreen);

  if (landedOnGreen) {
    return {
      ...clearPending({ ...state, shots: updatedShots, currentStroke: nextStroke }),
      phase: 'awaiting_putt_distance',
      isOnGreen: true,
      derivedShotType: newDerived,
    };
  }

  const consumedPuttDistance = state.firstPuttDistance && shot.puttDistance;

  return {
    ...clearPending({ ...state, shots: updatedShots, currentStroke: nextStroke }),
    phase: 'awaiting_direction',
    isOnGreen,
    derivedShotType: newDerived,
    ...(consumedPuttDistance ? { firstPuttDistance: null } : {}),
  };
}

// ── Reducer ─────────────────────────────────────────────────────

function scoringReducer(state: ScoringState, action: ScoringAction): ScoringState {
  switch (action.type) {
    case 'TAP_CENTER': {
      if (action.result === 'hole') {
        // "In The Hole" — needs confirmation before committing
        return {
          ...state,
          phase: 'awaiting_action',
          pendingCenterResult: 'hole',
        };
      }

      if (action.result === 'fairway') {
        // Fairway — auto-commit immediately, no Commit/Describe step needed
        const withPending: ScoringState = { ...state, pendingCenterResult: 'fairway', pendingDirection: null };
        return commitShot(withPending);
      }

      // Green — show Commit / Describe
      return {
        ...state,
        phase: 'awaiting_action',
        pendingCenterResult: action.result,
        pendingDirection: null,
      };
    }

    case 'TAP_DIRECTION': {
      return {
        ...state,
        phase: 'awaiting_classification',
        pendingDirection: action.direction,
        pendingCenterResult: null,
      };
    }

    case 'TAP_CLASSIFICATION': {
      return {
        ...state,
        pendingClassification: action.classification,
      };
    }

    case 'SUBMIT_DISTANCE': {
      // Return to awaiting_direction if from putt distance prompt
      if (state.phase === 'awaiting_putt_distance') {
        const isOnGreen = true;
        const newDerived = deriveShotType(state.currentStroke, isOnGreen);
        return {
          ...clearPending(state),
          phase: 'awaiting_direction',
          isOnGreen,
          derivedShotType: newDerived,
          // Store as pending — will be attached to the first putt when committed
          firstPuttDistance: action.value,
        };
      }
      // SUBMIT_DISTANCE is now only used for putt distance
      return state;
    }

    case 'SKIP_DISTANCE': {
      if (state.phase === 'awaiting_putt_distance') {
        const isOnGreen = true;
        const newDerived = deriveShotType(state.currentStroke, isOnGreen);
        return {
          ...clearPending(state),
          phase: 'awaiting_direction',
          isOnGreen,
          derivedShotType: newDerived,
        };
      }
      return state;
    }

    case 'DESCRIBE': {
      // Only valid from awaiting_action (after tapping a center button)
      if (state.phase !== 'awaiting_action') return state;
      return {
        ...state,
        phase: 'awaiting_classification',
      };
    }

    case 'COMMIT': {
      if (state.pendingCenterResult === 'hole') {
        // This is handled by CONFIRM_HOLE_COMPLETE, not COMMIT
        return state;
      }
      return commitShot(state);
    }

    case 'CONFIRM_HOLE_COMPLETE': {
      const shot = buildShotFromState(state);
      const updatedShots = [...state.shots, shot];
      return {
        ...clearPending({
          ...state,
          shots: updatedShots,
          currentStroke: state.currentStroke + 1,
        }),
        phase: 'hole_complete',
      };
    }

    case 'CANCEL_HOLE_COMPLETE': {
      return {
        ...clearPending(state),
        phase: 'awaiting_direction',
      };
    }

    case 'UNDO': {
      // Phase-level undo: if building a shot, just clear pending
      if (state.phase !== 'awaiting_direction') {
        // Special case: undo during putt distance prompt reverts the green shot
        if (state.phase === 'awaiting_putt_distance') {
          const revertedShots = state.shots.slice(0, -1);
          const prevStroke = state.currentStroke - 1;
          const isOnGreen = deriveIsOnGreen(revertedShots);
          return {
            ...clearPending(state),
            phase: 'awaiting_direction',
            shots: revertedShots,
            currentStroke: prevStroke,
            isOnGreen,
            derivedShotType: deriveShotType(prevStroke, isOnGreen),
          };
        }
        return {
          ...clearPending(state),
          phase: 'awaiting_direction',
        };
      }

      // Shot-level undo: remove last committed shot
      if (state.shots.length === 0) return state;

      const removedShot = state.shots[state.shots.length - 1];
      const revertedShots = state.shots.slice(0, -1);
      const prevStroke = state.currentStroke - 1;
      const isOnGreen = deriveIsOnGreen(revertedShots);

      // If the removed shot consumed firstPuttDistance, restore it
      const restoredPuttDistance = removedShot.puttDistance && !state.firstPuttDistance
        ? removedShot.puttDistance.replace(/\s*(ft|feet)\s*$/i, '').trim()
        : state.firstPuttDistance;

      return {
        ...clearPending(state),
        phase: 'awaiting_direction',
        shots: revertedShots,
        currentStroke: prevStroke,
        isOnGreen,
        derivedShotType: deriveShotType(prevStroke, isOnGreen),
        firstPuttDistance: restoredPuttDistance,
      };
    }

    case 'OVERRIDE_SHOT_TYPE': {
      return {
        ...state,
        overriddenShotType: action.shotType,
      };
    }

    case 'RESTORE': {
      const isOnGreen = deriveIsOnGreen(action.shots);
      return {
        ...createInitialState(action.par),
        shots: action.shots,
        currentStroke: action.currentStroke,
        isOnGreen,
        derivedShotType: deriveShotType(action.currentStroke, isOnGreen),
      };
    }

    default:
      return state;
  }
}

// ── Initial state factory ───────────────────────────────────────

export function createInitialState(par: number): ScoringState {
  return {
    phase: 'awaiting_direction',
    shots: [],
    currentStroke: 1,
    isOnGreen: false,
    pendingDirection: null,
    pendingCenterResult: null,
    pendingClassification: null,
    derivedShotType: SHOT_TYPES.TEE_SHOT,
    overriddenShotType: null,
    firstPuttDistance: null,
    par,
  };
}

// ── Hook ────────────────────────────────────────────────────────

export function useScoringReducer(par: number) {
  const [state, dispatch] = useReducer(scoringReducer, par, createInitialState);

  const activeShotType = state.overriddenShotType ?? state.derivedShotType;

  const statusLabel = (() => {
    if (state.phase === 'hole_complete') return 'Hole complete!';

    if (state.phase === 'awaiting_direction') {
      if (state.currentStroke === 1) return 'Waiting for tee shot';
      return `Waiting for shot ${state.currentStroke}`;
    }

    const typeLabel = activeShotType.toLowerCase();

    if (state.pendingCenterResult) {
      const resultLabel =
        state.pendingCenterResult === 'green' ? 'on the green' :
        'in the hole';
      return `${typeLabel} ${resultLabel}`;
    }

    if (state.pendingDirection) {
      const dirLabel = state.pendingDirection.replace(/_/g, '-');
      if (state.pendingClassification) {
        return `${typeLabel} ${dirLabel}, ${state.pendingClassification}`;
      }
      return `${typeLabel} ${dirLabel}`;
    }

    return `Waiting for shot ${state.currentStroke}`;
  })();

  const canCommit = (() => {
    if (state.phase === 'awaiting_action') return true;
    if (state.phase === 'awaiting_classification') {
      // On green: can always commit (classification is optional)
      if (state.isOnGreen) return true;
      // Off green: must select classification first
      return state.pendingClassification !== null;
    }
    return false;
  })();

  const canUndo = state.phase !== 'awaiting_direction' || state.shots.length > 0;

  const restore = useCallback((shots: TrackedShot[], currentStroke: number, restorePar: number) => {
    dispatch({ type: 'RESTORE', shots, currentStroke, par: restorePar });
  }, []);

  return {
    state,
    dispatch,
    activeShotType,
    statusLabel,
    canCommit,
    canUndo,
    restore,
  };
}
