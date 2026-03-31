/**
 * useWatchScoringBridge.ts
 *
 * Round-level hook that processes watch scoring events even when
 * HoleScoringScreen is NOT mounted. Runs in RoundTrackerScreen.
 *
 * When HoleScoringScreen IS mounted for a given hole, the bridge defers
 * to it (via watchScoringCoordinator) so events are not double-processed.
 *
 * Responsibilities:
 * - Listen for watch scoring actions and apply them via the pure reducer
 * - Persist updated hole data to the database
 * - Push updated context to the watch after each state change
 * - Handle SMS share requests from the watch
 */

import { useEffect, useRef, useCallback } from 'react';
import * as SMS from 'expo-sms';
import { Alert } from 'react-native';
import {
  onWatchScoringAction,
  onWatchNavigateHole,
  onWatchShareSMS,
  sendRoundContext,
} from '../../modules/watch-connectivity';
import type {
  WatchRoundContext,
  WatchHoleScore,
} from '../../modules/watch-connectivity';
import { reducer, buildInitialState } from './useScoringReducerV2';
import type { ScoringStateV2, ScoringActionV2 } from './useScoringReducerV2';
import { isHoleScoringMounted, tryProcess, onHoleScoringUnmount } from './watchScoringCoordinator';
import { database } from '../database/watermelon/database';
import Hole from '../database/watermelon/models/Hole';
import { isShotDataV2 } from '../types';
import type { ShotDataV2 } from '../types';
import { parseShotData, deriveHoleStatsV2 } from '../utils/roundStats';
import { calculateTotalStrokesV2 } from '../utils/shotDataV2Helpers';
import { useRoundStore } from '../stores/roundStore';
import smsService from '../services/sms';

interface UseWatchScoringBridgeParams {
  roundId: string | undefined;
  courseName: string | undefined;
  holes: WatchHoleScore[];
  onNavigateToHole: (holeNumber: number, holeId: string) => void;
}

export function useWatchScoringBridge(params: UseWatchScoringBridgeParams) {
  const { roundId, courseName, holes, onNavigateToHole } = params;
  const updateHole = useRoundStore((s) => s.updateHole);

  // Stable refs so event listeners always see current values
  const roundIdRef = useRef(roundId);
  roundIdRef.current = roundId;

  const courseNameRef = useRef(courseName);
  courseNameRef.current = courseName;

  const holesRef = useRef(holes);
  holesRef.current = holes;

  const navigateRef = useRef(onNavigateToHole);
  navigateRef.current = onNavigateToHole;

  const updateHoleRef = useRef(updateHole);
  updateHoleRef.current = updateHole;

  // In-memory scoring state for holes being scored from the watch.
  // Key: holeId, Value: current ScoringStateV2
  // Maintained across actions so intermediate state (e.g., pendingDistance)
  // is preserved between sequential watch events.
  const holeStates = useRef(new Map<string, ScoringStateV2>());

  // Per-hole processing queue to serialize concurrent async actions on the same hole.
  // Without this, two rapid watch events for the same hole could both load the same
  // base state from DB, causing the first action's result to be overwritten.
  const holeQueues = useRef(new Map<string, Promise<void>>());

  // Track the "current" hole being scored from the watch (last action's holeId)
  const activeWatchHoleId = useRef<string | null>(null);

  // Optimistic stroke overrides for holes persisted by the bridge but not yet
  // reflected in holesRef (WatermelonDB observation lag). Cleared per-hole when
  // the observation catches up (strokes match), or on round change.
  const strokeOverrides = useRef(new Map<string, { strokes: number; par: number }>());

  /**
   * Load or retrieve the scoring state for a hole.
   * First call for a hole loads from DB; subsequent calls use cached state.
   */
  const getOrLoadState = useCallback(async (holeId: string): Promise<ScoringStateV2> => {
    const cached = holeStates.current.get(holeId);
    if (cached) return cached;

    try {
      const hole = await database.collections.get<Hole>('holes').find(holeId);
      const existing = parseShotData(hole.shotData);

      let state: ScoringStateV2;
      if (existing && isShotDataV2(existing) && existing.shots.length > 0) {
        // Reconstruct state via RESTORE action
        state = reducer(
          buildInitialState(hole.par),
          { type: 'RESTORE', shots: existing.shots, currentStroke: existing.currentStroke || existing.shots.length + 1, par: hole.par },
        );
      } else {
        state = buildInitialState(hole.par);
      }

      holeStates.current.set(holeId, state);
      return state;
    } catch (err) {
      // DB read failure — do NOT cache a fallback state. Rethrow so the
      // queued action is dropped (fire-and-forget). The next watch action
      // will retry the DB read.
      throw err;
    }
  }, []);

  /**
   * Persist scoring state to the database with retry.
   * Up to 2 retries (3 total attempts) with 1s delay between each.
   */
  const persistState = useCallback(async (holeId: string, state: ScoringStateV2, attempt = 0) => {
    const currentRoundId = roundIdRef.current;
    if (!currentRoundId) return;

    try {
      const hole = await database.collections.get<Hole>('holes').find(holeId);
      const shotData: ShotDataV2 = {
        version: 2,
        par: state.par,
        shots: state.shots,
        currentStroke: state.currentStroke,
      };
      const stats = state.shots.length > 0 ? deriveHoleStatsV2(shotData, state.par) : null;
      const strokes = calculateTotalStrokesV2(state.shots);

      await updateHoleRef.current(currentRoundId, {
        holeNumber: hole.holeNumber,
        par: state.par,
        strokes,
        fairwayHit: stats?.fairwayHit,
        greenInRegulation: stats?.greenInRegulation,
        putts: stats?.puttsCount,
        shotData: JSON.stringify(shotData),
      });
    } catch {
      if (attempt < 2) {
        await new Promise<void>(resolve => setTimeout(resolve, 1000));
        // Only retry if we're still on the same round
        if (roundIdRef.current === currentRoundId) {
          return persistState(holeId, state, attempt + 1);
        }
      }
      // Final failure is silent — the override keeps the watch consistent,
      // and the next scoring action will persist the latest state.
    }
  }, []);

  /**
   * Push updated round context to the watch after processing an action.
   * Applies all stroke overrides (not just the current hole) so that rapid
   * catch-up scoring across multiple holes produces accurate totals even
   * before WatermelonDB observations propagate each DB write.
   */
  const pushContext = useCallback((scoringState: ScoringStateV2, currentHoleId: string) => {
    const currentRoundId = roundIdRef.current;
    const currentCourseName = courseNameRef.current;
    const currentHoles = holesRef.current;
    if (!currentRoundId || !currentCourseName) return;

    const currentHole = currentHoles.find(h => h.holeId === currentHoleId);
    if (!currentHole) return;

    // Record the current hole's strokes as an override
    const updatedStrokes = calculateTotalStrokesV2(scoringState.shots);
    strokeOverrides.current.set(currentHoleId, { strokes: updatedStrokes, par: scoringState.par });

    // Prune overrides that the observation has caught up with
    for (const [holeId, override] of strokeOverrides.current) {
      const observed = currentHoles.find(h => h.holeId === holeId);
      if (observed && observed.strokes === override.strokes) {
        strokeOverrides.current.delete(holeId);
      }
    }

    // Apply all pending overrides to build the merged holes array
    const mergedHoles = currentHoles.map(h => {
      const override = strokeOverrides.current.get(h.holeId);
      return override ? { ...h, strokes: override.strokes, par: override.par } : h;
    });

    const completedHoles = mergedHoles.filter(h => h.strokes > 0);
    const totalScore = completedHoles.reduce((sum, h) => sum + h.strokes, 0);
    const totalPar = completedHoles.reduce((sum, h) => sum + h.par, 0);

    const context: WatchRoundContext = {
      roundId: currentRoundId,
      courseName: currentCourseName,
      currentHoleNumber: currentHole.number,
      currentHoleId: currentHoleId,
      totalHoles: currentHoles.length || 18,
      totalScore,
      scoreVsPar: totalScore - totalPar,
      holesCompleted: completedHoles.length,
      scoring: scoringState,
      holes: mergedHoles,
    };

    sendRoundContext(context);
  }, []);

  /**
   * Handle SMS share request from the watch.
   */
  const handleSmsRequest = useCallback(async (text: string) => {
    const currentRoundId = roundIdRef.current;
    if (!currentRoundId) return;

    try {
      const contacts = await smsService.getRecipientsForRound(currentRoundId);
      const phoneNumbers = contacts.map(c => c.phoneNumber).filter(Boolean);
      if (phoneNumbers.length === 0) {
        Alert.alert('No Recipients', 'Configure SMS recipients in Manage Golfers.');
        return;
      }
      const isAvailable = await SMS.isAvailableAsync();
      if (isAvailable) {
        await SMS.sendSMSAsync(phoneNumbers, text);
      } else {
        Alert.alert('SMS Unavailable', 'SMS is not available on this device.');
      }
    } catch {
      Alert.alert('SMS Error', 'Failed to send SMS. Please try again.');
    }
  }, []);

  // Invalidate cached state when HoleScoringScreen unmounts for a hole.
  // Without this, the bridge would use stale pre-HoleScoringScreen state
  // when the watch sends the next action after the user returns to the scorecard.
  useEffect(() => {
    return onHoleScoringUnmount((holeId) => {
      holeStates.current.delete(holeId);
    });
  }, []);

  // Subscribe to watch events
  useEffect(() => {
    const subs = [
      // Scoring actions — process when HoleScoringScreen is NOT handling this hole.
      // Uses tryProcess dedup to handle the timing gap during screen transitions
      // (mountHoleScoring runs in useEffect, so there's a brief frame where both
      // listeners are active). Actions for the same hole are serialized via
      // holeQueues to prevent race conditions.
      onWatchScoringAction((event) => {
        if (event.roundId !== roundIdRef.current) return;
        if (isHoleScoringMounted(event.holeId)) return;
        if (!tryProcess(event.messageId)) return;

        const holeId = event.holeId;
        const prev = holeQueues.current.get(holeId) ?? Promise.resolve();
        const next = prev.then(async () => {
          activeWatchHoleId.current = holeId;

          const currentState = await getOrLoadState(holeId);
          const action = event.action as ScoringActionV2;
          const newState = reducer(currentState, action);

          // Update in-memory cache
          holeStates.current.set(holeId, newState);

          // Persist when shots change (same logic as HoleScoringScreen)
          if (newState.shots !== currentState.shots && newState.shots.length > 0) {
            await persistState(holeId, newState);
          }

          // Push context to watch so it can reconcile
          pushContext(newState, holeId);
        }).catch(() => {
          // Fire-and-forget — individual action failures should not break the queue
        });
        holeQueues.current.set(holeId, next);
      }),

      // Navigate hole — defer to HoleScoringScreen if mounted, otherwise navigate from scorecard
      onWatchNavigateHole((event) => {
        if (event.roundId !== roundIdRef.current) return;
        if (isHoleScoringMounted(event.holeId)) return;

        // Clear cached state for the previous hole (new hole, fresh start)
        if (activeWatchHoleId.current && activeWatchHoleId.current !== event.holeId) {
          holeStates.current.delete(activeWatchHoleId.current);
        }
        activeWatchHoleId.current = event.holeId;

        navigateRef.current(event.holeNumber, event.holeId);
      }),

      // SMS share — use message dedup since both bridge and useWatchSync may listen
      onWatchShareSMS((event) => {
        if (event.roundId !== roundIdRef.current) return;
        if (!tryProcess(event.messageId)) return;
        handleSmsRequest(event.text);
      }),
    ];

    return () => {
      subs.forEach((sub) => sub?.remove());
    };
  }, [getOrLoadState, persistState, pushContext, handleSmsRequest]);

  // Clear state cache and processing queues when round changes
  useEffect(() => {
    holeStates.current.clear();
    holeQueues.current.clear();
    strokeOverrides.current.clear();
    activeWatchHoleId.current = null;
  }, [roundId]);
}
