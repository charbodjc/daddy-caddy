// Jest mock for the watch-connectivity native module.
// All functions return null/void since WatchConnectivity is iOS-only and
// unavailable in the test environment.

export async function activateWatchSession(): Promise<boolean> {
  return false;
}

export async function isWatchReachable(): Promise<boolean> {
  return false;
}

export async function isWatchPaired(): Promise<boolean> {
  return false;
}

export async function isWatchAppInstalled(): Promise<boolean> {
  return false;
}

export async function sendRoundContext(): Promise<void> {}

export function onWatchScoringAction(): null {
  return null;
}

export function onWatchNavigateHole(): null {
  return null;
}

export function onWatchReachabilityChanged(): null {
  return null;
}
