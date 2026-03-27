/**
 * useScoringReducerV2.ts
 *
 * Pure state machine for the "telephone scoring" UI.
 * Two main steps per shot: distance → result.
 * Swing type is a toggle (defaults to "free"), not a phase.
 * No side effects (DB, SMS, navigation) — those stay in the screen.
 */

import { useReducer, useCallback } from 'react';
import {
  LIE_TYPES, SWING_TYPES, SHOT_OUTCOMES, PENALTY_TYPES,
} from '../types';
import type {
  TrackedShotV2, LieType, SwingType, MissDirection, ShotOutcome,
  PenaltyType, PuttMissDistance, PuttMissBreak, DistanceUnit,
} from '../types';

// ── Phase ────────────────────────────────────────────────────

export type ScoringPhaseV2 =
  | 'awaiting_distance'      // Step 1: enter distance (or skip)
  | 'awaiting_result'        // Step 2: compass (off-green) or putt result (on-green)
  | 'awaiting_result_lie'    // Step 2b: pick lie after off-green miss
  | 'hole_complete';         // Done — hole finished

// ── State ────────────────────────────────────────────────────

export interface ScoringStateV2 {
  phase: ScoringPhaseV2;
  shots: TrackedShotV2[];
  currentStroke: number;
  par: number;

  // Auto-inferred from previous shot (tappable to override)
  currentLie: LieType;
  isOnGreen: boolean;

  // Building the current shot
  pendingDistance: number | null;        // null = skipped
  pendingDistanceUnit: DistanceUnit;
  pendingSwing: SwingType;               // defaults to 'free'
  pendingMissDirection: MissDirection | null;
}

// ── Actions ──────────────────────────────────────────────────

export type ScoringActionV2 =
  | { type: 'SUBMIT_DISTANCE'; value: number }
  | { type: 'SKIP_DISTANCE' }
  | { type: 'TOGGLE_SWING' }
  | { type: 'SET_LIE'; lie: LieType }
  | { type: 'TAP_CENTER_RESULT'; result: 'fairway' | 'green' | 'hole' }
  | { type: 'TAP_DIRECTION'; direction: MissDirection }
  | { type: 'TAP_RESULT_LIE'; lie: LieType }
  | { type: 'TAP_PENALTY_LIE'; penaltyType: PenaltyType }
  | { type: 'TAP_PUTT_MISS'; distance: PuttMissDistance; break: PuttMissBreak }
  | { type: 'TAP_PUTT_MADE' }
  | { type: 'UNDO' }
  | { type: 'RESTORE'; shots: TrackedShotV2[]; currentStroke: number; par: number };

// ── Helpers ──────────────────────────────────────────────────

function inferNextLie(shots: TrackedShotV2[]): LieType {
  if (shots.length === 0) return LIE_TYPES.TEE;
  const last = shots[shots.length - 1];

  // OB/Lost: revert to the lie BEFORE the penalty shot (re-play from original spot)
  if (last.outcome === SHOT_OUTCOMES.PENALTY) {
    // Find the shot before this penalty
    if (shots.length >= 2) return shots[shots.length - 2].lie;
    return LIE_TYPES.TEE;
  }

  if (last.resultLie) return last.resultLie;
  if (last.outcome === SHOT_OUTCOMES.ON_TARGET) {
    // Default on_target result lies
    if (last.lie === LIE_TYPES.TEE) return LIE_TYPES.FAIRWAY;
    return LIE_TYPES.GREEN;
  }
  if (last.outcome === SHOT_OUTCOMES.HOLED) return LIE_TYPES.GREEN; // technically done
  return LIE_TYPES.FAIRWAY;
}

function inferDistanceUnit(lie: LieType): DistanceUnit {
  return lie === LIE_TYPES.GREEN ? 'ft' : 'yds';
}

function buildInitialState(par: number): ScoringStateV2 {
  return {
    phase: 'awaiting_distance',
    shots: [],
    currentStroke: 1,
    par,
    currentLie: LIE_TYPES.TEE,
    isOnGreen: false,
    pendingDistance: null,
    pendingDistanceUnit: 'yds',
    pendingSwing: SWING_TYPES.FREE,
    pendingMissDirection: null,
  };
}

function advanceToNextShot(state: ScoringStateV2, newShots: TrackedShotV2[]): ScoringStateV2 {
  const nextLie = inferNextLie(newShots);
  const isOnGreen = nextLie === LIE_TYPES.GREEN;
  return {
    ...state,
    phase: 'awaiting_distance',
    shots: newShots,
    currentStroke: state.currentStroke + 1,
    currentLie: nextLie,
    isOnGreen,
    pendingDistance: null,
    pendingDistanceUnit: inferDistanceUnit(nextLie),
    pendingSwing: SWING_TYPES.FREE,
    pendingMissDirection: null,
  };
}

function commitShot(
  state: ScoringStateV2,
  outcome: ShotOutcome,
  options: {
    missDirection?: MissDirection;
    puttMissDistance?: PuttMissDistance;
    puttMissBreak?: PuttMissBreak;
    resultLie?: LieType;
    penaltyType?: PenaltyType;
    penaltyStrokes?: number;
  } = {},
): ScoringStateV2 {
  const shot: TrackedShotV2 = {
    stroke: state.currentStroke,
    lie: state.currentLie,
    distanceToHole: state.pendingDistance ?? undefined,
    distanceUnit: state.pendingDistanceUnit,
    swing: state.pendingSwing,
    outcome,
    missDirection: options.missDirection,
    puttMissDistance: options.puttMissDistance,
    puttMissBreak: options.puttMissBreak,
    resultLie: options.resultLie,
    penaltyType: options.penaltyType,
    penaltyStrokes: options.penaltyStrokes,
  };

  const newShots = [...state.shots, shot];
  return advanceToNextShot(state, newShots);
}

// ── Reducer ──────────────────────────────────────────────────

function reducer(state: ScoringStateV2, action: ScoringActionV2): ScoringStateV2 {
  switch (action.type) {

    // ── Step 1: Distance ──────────────────────────────────────

    case 'SUBMIT_DISTANCE':
      if (state.phase !== 'awaiting_distance') return state;
      return {
        ...state,
        phase: 'awaiting_result',
        pendingDistance: action.value,
      };

    case 'SKIP_DISTANCE':
      if (state.phase !== 'awaiting_distance') return state;
      return {
        ...state,
        phase: 'awaiting_result',
        pendingDistance: null,
      };

    // ── Swing toggle (available in distance or result phase) ──

    case 'TOGGLE_SWING':
      return {
        ...state,
        pendingSwing: state.pendingSwing === SWING_TYPES.FREE
          ? SWING_TYPES.RESTRICTED
          : SWING_TYPES.FREE,
      };

    // ── Lie override (available in distance phase) ────────────

    case 'SET_LIE':
      if (state.phase !== 'awaiting_distance') return state;
      return {
        ...state,
        currentLie: action.lie,
        isOnGreen: action.lie === LIE_TYPES.GREEN,
        pendingDistanceUnit: inferDistanceUnit(action.lie),
      };

    // ── Step 2: Result (off-green) ────────────────────────────

    case 'TAP_CENTER_RESULT': {
      if (state.phase !== 'awaiting_result') return state;

      if (action.result === 'hole') {
        // Commit the holed shot AND set hole_complete (same pattern as TAP_PUTT_MADE)
        const holedShot: TrackedShotV2 = {
          stroke: state.currentStroke,
          lie: state.currentLie,
          distanceToHole: state.pendingDistance ?? undefined,
          distanceUnit: state.pendingDistanceUnit,
          swing: state.pendingSwing,
          outcome: SHOT_OUTCOMES.HOLED,
        };
        return {
          ...state,
          phase: 'hole_complete',
          shots: [...state.shots, holedShot],
          currentStroke: state.currentStroke + 1,
        };
      }

      const resultLie: LieType = action.result === 'fairway'
        ? LIE_TYPES.FAIRWAY
        : LIE_TYPES.GREEN;

      return commitShot(state, SHOT_OUTCOMES.ON_TARGET, { resultLie });
    }

    case 'TAP_DIRECTION':
      if (state.phase !== 'awaiting_result') return state;
      return {
        ...state,
        phase: 'awaiting_result_lie',
        pendingMissDirection: action.direction,
      };

    // ── Step 2b: Result lie (off-green miss) ──────────────────

    case 'TAP_RESULT_LIE':
      if (state.phase !== 'awaiting_result_lie') return state;
      return commitShot(state, SHOT_OUTCOMES.MISSED, {
        missDirection: state.pendingMissDirection ?? undefined,
        resultLie: action.lie,
      });

    case 'TAP_PENALTY_LIE': {
      if (state.phase !== 'awaiting_result_lie') return state;
      const penaltyLie: LieType = action.penaltyType === PENALTY_TYPES.HAZARD
        ? LIE_TYPES.TROUBLE
        : state.currentLie; // OB/Lost: re-play from same lie
      return commitShot(state, SHOT_OUTCOMES.PENALTY, {
        missDirection: state.pendingMissDirection ?? undefined,
        resultLie: penaltyLie,
        penaltyType: action.penaltyType,
        penaltyStrokes: 1,
      });
    }

    // ── Step 2: Result (on-green / putts) ─────────────────────

    case 'TAP_PUTT_MADE': {
      if (state.phase !== 'awaiting_result') return state;
      const madeShot: TrackedShotV2 = {
        stroke: state.currentStroke,
        lie: state.currentLie,
        distanceToHole: state.pendingDistance ?? undefined,
        distanceUnit: state.pendingDistanceUnit,
        swing: state.pendingSwing,
        outcome: SHOT_OUTCOMES.HOLED,
      };
      const newShots = [...state.shots, madeShot];
      return {
        ...state,
        phase: 'hole_complete',
        shots: newShots,
        currentStroke: state.currentStroke + 1,
      };
    }

    case 'TAP_PUTT_MISS':
      if (state.phase !== 'awaiting_result') return state;
      return commitShot(state, SHOT_OUTCOMES.MISSED, {
        puttMissDistance: action.distance,
        puttMissBreak: action.break,
        resultLie: LIE_TYPES.GREEN,
      });

    // ── Hole completion ───────────────────────────────────────

    // ── Undo ──────────────────────────────────────────────────

    case 'UNDO': {
      // Phase-level undo: result_lie → result → distance → remove last shot
      if (state.phase === 'awaiting_result_lie') {
        return {
          ...state,
          phase: 'awaiting_result',
          pendingMissDirection: null,
        };
      }
      if (state.phase === 'awaiting_result') {
        return {
          ...state,
          phase: 'awaiting_distance',
          pendingDistance: null,
        };
      }
      if (state.phase === 'hole_complete') {
        // If we just committed a holed shot, remove it
        const lastShot = state.shots[state.shots.length - 1];
        if (lastShot?.outcome === SHOT_OUTCOMES.HOLED) {
          const prevShots = state.shots.slice(0, -1);
          const prevLie = inferNextLie(prevShots);
          return {
            ...state,
            phase: 'awaiting_result',
            shots: prevShots,
            currentStroke: state.currentStroke - 1,
            currentLie: prevLie,
            isOnGreen: prevLie === LIE_TYPES.GREEN,
          };
        }
        return { ...state, phase: 'awaiting_result' };
      }
      if (state.phase === 'awaiting_distance' && state.shots.length > 0) {
        // Remove last committed shot
        const prevShots = state.shots.slice(0, -1);
        const prevLie = inferNextLie(prevShots);
        return {
          ...state,
          shots: prevShots,
          currentStroke: state.currentStroke - 1,
          currentLie: prevLie,
          isOnGreen: prevLie === LIE_TYPES.GREEN,
          pendingDistanceUnit: inferDistanceUnit(prevLie),
          pendingSwing: SWING_TYPES.FREE,
        };
      }
      return state;
    }

    // ── Restore (resume in-progress hole) ─────────────────────

    case 'RESTORE': {
      if (action.shots.length === 0) {
        return buildInitialState(action.par);
      }
      const nextLie = inferNextLie(action.shots);
      const isOnGreen = nextLie === LIE_TYPES.GREEN;
      return {
        phase: 'awaiting_distance',
        shots: action.shots,
        currentStroke: action.currentStroke,
        par: action.par,
        currentLie: nextLie,
        isOnGreen,
        pendingDistance: null,
        pendingDistanceUnit: inferDistanceUnit(nextLie),
        pendingSwing: SWING_TYPES.FREE,
        pendingMissDirection: null,
      };
    }

    default:
      return state;
  }
}

// ── Hook ─────────────────────────────────────────────────────

export function useScoringReducerV2(par: number) {
  const [state, dispatch] = useReducer(reducer, par, buildInitialState);

  const submitDistance = useCallback((value: number) =>
    dispatch({ type: 'SUBMIT_DISTANCE', value }), []);
  const skipDistance = useCallback(() =>
    dispatch({ type: 'SKIP_DISTANCE' }), []);
  const toggleSwing = useCallback(() =>
    dispatch({ type: 'TOGGLE_SWING' }), []);
  const setLie = useCallback((lie: LieType) =>
    dispatch({ type: 'SET_LIE', lie }), []);
  const tapCenterResult = useCallback((result: 'fairway' | 'green' | 'hole') =>
    dispatch({ type: 'TAP_CENTER_RESULT', result }), []);
  const tapDirection = useCallback((direction: MissDirection) =>
    dispatch({ type: 'TAP_DIRECTION', direction }), []);
  const tapResultLie = useCallback((lie: LieType) =>
    dispatch({ type: 'TAP_RESULT_LIE', lie }), []);
  const tapPenaltyLie = useCallback((penaltyType: PenaltyType) =>
    dispatch({ type: 'TAP_PENALTY_LIE', penaltyType }), []);
  const tapPuttMade = useCallback(() =>
    dispatch({ type: 'TAP_PUTT_MADE' }), []);
  const tapPuttMiss = useCallback((distance: PuttMissDistance, breakDir: PuttMissBreak) =>
    dispatch({ type: 'TAP_PUTT_MISS', distance, break: breakDir }), []);
  const undo = useCallback(() =>
    dispatch({ type: 'UNDO' }), []);
  const restore = useCallback((shots: TrackedShotV2[], currentStroke: number, holePar: number) =>
    dispatch({ type: 'RESTORE', shots, currentStroke, par: holePar }), []);

  return {
    state,
    submitDistance,
    skipDistance,
    toggleSwing,
    setLie,
    tapCenterResult,
    tapDirection,
    tapResultLie,
    tapPenaltyLie,
    tapPuttMade,
    tapPuttMiss,
    undo,
    restore,
  };
}
