import { Platform } from 'react-native';
import type { RoundActivityState } from './src/LiveActivity.types';

export type { RoundActivityState };

// Import-level guard: requireNativeModule('LiveActivity') would throw on Android
// because the native module only exists on iOS.
const LiveActivityModule = Platform.OS === 'ios'
  ? require('./src/LiveActivityModule').default
  : null;

/**
 * Start a Live Activity for an active golf round.
 * Returns the activity ID on success, or null if unsupported/denied.
 */
export async function startRoundActivity(
  courseName: string,
  roundId: string,
  totalHoles: number,
): Promise<string | null> {
  if (!LiveActivityModule) return null;
  try {
    return await LiveActivityModule.startRoundActivity(courseName, roundId, totalHoles);
  } catch {
    return null;
  }
}

/**
 * Update the Live Activity with current round state.
 * Fire-and-forget — never blocks scoring.
 */
export async function updateRoundActivity(
  activityId: string,
  state: RoundActivityState,
): Promise<void> {
  if (!LiveActivityModule || !activityId) return;
  try {
    await LiveActivityModule.updateRoundActivity(
      activityId,
      state.currentHole,
      state.totalScore,
      state.scoreVsPar,
      state.holesCompleted,
      state.totalHoles,
    );
  } catch {
    // Fire-and-forget: Live Activity failures must never block scoring
  }
}

/**
 * End the Live Activity.
 * @param immediate - If true, dismisses immediately. If false (default), shows final score for 5 minutes.
 * Fire-and-forget — never blocks round completion.
 */
export async function endRoundActivity(
  activityId: string,
  state: RoundActivityState,
  immediate = false,
): Promise<void> {
  if (!LiveActivityModule || !activityId) return;
  try {
    await LiveActivityModule.endRoundActivity(
      activityId,
      state.currentHole,
      state.totalScore,
      state.scoreVsPar,
      state.holesCompleted,
      state.totalHoles,
      immediate,
    );
  } catch {
    // Fire-and-forget
  }
}

/**
 * Recover the running activity ID after app relaunch.
 * Filters by roundId to avoid returning a stale activity for a different round.
 * ActivityKit persists activities across app restarts.
 */
export async function getRunningActivityId(roundId: string): Promise<string | null> {
  if (!LiveActivityModule) return null;
  try {
    return await LiveActivityModule.getRunningActivityId(roundId);
  } catch {
    return null;
  }
}
