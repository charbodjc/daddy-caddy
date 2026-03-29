/**
 * useWatchSync.ts
 *
 * Bridges the WatchConnectivity native module with the phone's scoring flow.
 * - Pushes WatchRoundContext to the watch whenever scoring state changes
 * - Listens for watch-initiated scoring actions and routes them to named callbacks
 * - Handles watch-initiated hole navigation
 *
 * Fire-and-forget on all watch communication — never blocks scoring.
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  sendRoundContext,
  onWatchScoringAction,
  onWatchNavigateHole,
} from '../../modules/watch-connectivity';
import type {
  WatchRoundContext,
  WatchScoringActionEvent,
  WatchNavigateHoleEvent,
  WatchHoleScore,
} from '../../modules/watch-connectivity';
import type { ScoringStateV2 } from './useScoringReducerV2';
import type {
  LieType,
  MissDirection,
  PenaltyType,
  PuttMissDistance,
  PuttMissBreak,
} from '../types';

interface ScoringCallbacks {
  submitDistance: (value: number) => void;
  skipDistance: () => void;
  toggleSwing: () => void;
  setLie: (lie: LieType) => void;
  tapCenterResult: (result: 'fairway' | 'green' | 'hole') => void;
  tapDirection: (direction: MissDirection) => void;
  tapResultLie: (lie: LieType) => void;
  tapPenaltyLie: (penaltyType: PenaltyType) => void;
  tapPuttMade: () => void;
  tapPuttMiss: (distance: PuttMissDistance, breakDir: PuttMissBreak) => void;
}

interface UseWatchSyncParams {
  roundId: string | undefined;
  courseName: string | undefined;
  currentHoleNumber: number | undefined;
  currentHoleId: string | undefined;
  totalHoles: number;
  totalScore: number;
  scoreVsPar: number;
  holesCompleted: number;
  holes: WatchHoleScore[];
  scoringState: ScoringStateV2 | null;
  scoringCallbacks: ScoringCallbacks;
  onNavigateHole: (holeNumber: number, holeId: string) => void;
}

export function useWatchSync(params: UseWatchSyncParams) {
  const {
    roundId, courseName, currentHoleNumber, currentHoleId,
    totalHoles, totalScore, scoreVsPar, holesCompleted, holes,
    scoringState, scoringCallbacks, onNavigateHole,
  } = params;

  // Keep a stable ref of callbacks to avoid re-subscribing events
  const callbacksRef = useRef(scoringCallbacks);
  callbacksRef.current = scoringCallbacks;

  const navigateRef = useRef(onNavigateHole);
  navigateRef.current = onNavigateHole;

  const roundIdRef = useRef(roundId);
  roundIdRef.current = roundId;

  const holeIdRef = useRef(currentHoleId);
  holeIdRef.current = currentHoleId;

  // Push state to watch whenever it changes
  useEffect(() => {
    if (!roundId || !courseName || !currentHoleNumber || !currentHoleId || !scoringState) {
      sendRoundContext(null);
      return;
    }

    const context: WatchRoundContext = {
      roundId,
      courseName,
      currentHoleNumber,
      currentHoleId,
      totalHoles,
      totalScore,
      scoreVsPar,
      holesCompleted,
      scoring: scoringState,
      holes,
    };

    sendRoundContext(context);
  }, [
    roundId, courseName, currentHoleNumber, currentHoleId,
    totalHoles, totalScore, scoreVsPar, holesCompleted,
    scoringState, holes,
  ]);

  // Route a watch scoring action to the appropriate named callback
  const routeAction = useCallback((event: WatchScoringActionEvent) => {
    if (event.roundId !== roundIdRef.current) return;
    if (event.holeId !== holeIdRef.current) return;

    const cb = callbacksRef.current;
    const a = event.action;

    switch (a.type) {
      case 'SUBMIT_DISTANCE':
        cb.submitDistance(a.value);
        break;
      case 'SKIP_DISTANCE':
        cb.skipDistance();
        break;
      case 'TOGGLE_SWING':
        cb.toggleSwing();
        break;
      case 'SET_LIE':
        cb.setLie(a.lie);
        break;
      case 'TAP_CENTER_RESULT':
        cb.tapCenterResult(a.result);
        break;
      case 'TAP_DIRECTION':
        cb.tapDirection(a.direction);
        break;
      case 'TAP_RESULT_LIE':
        cb.tapResultLie(a.lie);
        break;
      case 'TAP_PENALTY_LIE':
        cb.tapPenaltyLie(a.penaltyType);
        break;
      case 'TAP_PUTT_MADE':
        cb.tapPuttMade();
        break;
      case 'TAP_PUTT_MISS':
        cb.tapPuttMiss(a.distance, a.break);
        break;
    }
  }, []);

  // Subscribe to watch events (once, stable refs handle updates)
  useEffect(() => {
    const subs = [
      onWatchScoringAction(routeAction),
      onWatchNavigateHole((event: WatchNavigateHoleEvent) => {
        if (event.roundId !== roundIdRef.current) return;
        navigateRef.current(event.holeNumber, event.holeId);
      }),
    ];

    return () => {
      subs.forEach((sub) => sub?.remove());
    };
  }, [routeAction]);
}
