import { Platform } from 'react-native';
import type { EventSubscription } from 'expo-modules-core';
import type {
  WatchRoundContext,
  WatchScoringActionEvent,
  WatchNavigateHoleEvent,
  WatchShareSMSEvent,
  WatchReachabilityEvent,
} from './src/WatchConnectivity.types';

export type {
  WatchRoundContext,
  WatchScoringState,
  WatchHoleScore,
  WatchScoringActionEvent,
  WatchNavigateHoleEvent,
  WatchShareSMSEvent,
  WatchReachabilityEvent,
  WatchScoringActionPayload,
} from './src/WatchConnectivity.types';

// Import-level guard: requireNativeModule('WatchConnectivity') would throw on Android
const WatchConnectivityModule = Platform.OS === 'ios'
  ? require('./src/WatchConnectivityModule').default
  : null;

let contextSeq = 0;

// ── Session lifecycle ─────────────────────────────────────────

/**
 * Activate the WCSession. Call once at app startup.
 * Returns true if WatchConnectivity is supported and session activated.
 */
export async function activateWatchSession(): Promise<boolean> {
  if (!WatchConnectivityModule) return false;
  try {
    return await WatchConnectivityModule.activateSession();
  } catch {
    return false;
  }
}

/**
 * Check if the paired watch is currently reachable.
 */
export async function isWatchReachable(): Promise<boolean> {
  if (!WatchConnectivityModule) return false;
  try {
    return await WatchConnectivityModule.getReachability();
  } catch {
    return false;
  }
}

/**
 * Check if an Apple Watch is paired to this iPhone.
 */
export async function isWatchPaired(): Promise<boolean> {
  if (!WatchConnectivityModule) return false;
  try {
    return await WatchConnectivityModule.getIsPaired();
  } catch {
    return false;
  }
}

/**
 * Check if the watch companion app is installed.
 */
export async function isWatchAppInstalled(): Promise<boolean> {
  if (!WatchConnectivityModule) return false;
  try {
    return await WatchConnectivityModule.getIsWatchAppInstalled();
  } catch {
    return false;
  }
}

// ── Phone → Watch ─────────────────────────────────────────────

/**
 * Send round context to the watch via updateApplicationContext.
 * Pass null to clear the context (round ended / no active round).
 * Fire-and-forget — never blocks scoring.
 */
export async function sendRoundContext(
  context: WatchRoundContext | null,
): Promise<void> {
  if (!WatchConnectivityModule) return;
  try {
    if (context === null) {
      await WatchConnectivityModule.clearContext();
    } else {
      contextSeq += 1;
      const payload = JSON.stringify({
        activeRound: context,
        seq: contextSeq,
        timestamp: Date.now(),
      });
      await WatchConnectivityModule.updateContext(payload);
    }
  } catch {
    // Fire-and-forget: watch sync failures must never block scoring
  }
}

// ── Watch → Phone (event subscriptions) ──────────────────────

/**
 * Subscribe to scoring actions from the watch.
 * The watch sends actions matching ScoringActionV2 payloads.
 */
export function onWatchScoringAction(
  listener: (event: WatchScoringActionEvent) => void,
): EventSubscription | null {
  if (!WatchConnectivityModule) return null;
  return WatchConnectivityModule.addListener('onWatchScoringAction', listener);
}

/**
 * Subscribe to hole navigation requests from the watch.
 */
export function onWatchNavigateHole(
  listener: (event: WatchNavigateHoleEvent) => void,
): EventSubscription | null {
  if (!WatchConnectivityModule) return null;
  return WatchConnectivityModule.addListener('onWatchNavigateHole', listener);
}

/**
 * Subscribe to share-via-SMS requests from the watch.
 */
export function onWatchShareSMS(
  listener: (event: WatchShareSMSEvent) => void,
): EventSubscription | null {
  if (!WatchConnectivityModule) return null;
  return WatchConnectivityModule.addListener('onWatchShareSMS', listener);
}

/**
 * Subscribe to watch reachability changes.
 */
export function onWatchReachabilityChanged(
  listener: (event: WatchReachabilityEvent) => void,
): EventSubscription | null {
  if (!WatchConnectivityModule) return null;
  return WatchConnectivityModule.addListener('onWatchReachabilityChanged', listener);
}
