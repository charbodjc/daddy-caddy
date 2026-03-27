// Jest mock for the live-activity native module.
// All functions return null/void since Live Activities are iOS-only and
// unavailable in the test environment.

export async function startRoundActivity(): Promise<string | null> {
  return null;
}

export async function updateRoundActivity(): Promise<void> {}

export async function endRoundActivity(): Promise<void> {}

export async function getRunningActivityId(): Promise<string | null> {
  return null;
}
