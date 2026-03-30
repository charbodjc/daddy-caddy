/**
 * watchScoringCoordinator.ts
 *
 * Module-level coordination between HoleScoringScreen and the background
 * watch scoring bridge. Prevents double-processing of watch events when
 * both listeners are active (HoleScoringScreen is mounted on top of
 * RoundTrackerScreen in the stack navigator).
 *
 * - HoleScoringScreen calls mount/unmount on lifecycle
 * - The bridge checks isHoleScoringMounted() before processing scoring actions
 * - SMS and scoring events use tryProcess() for message-level dedup
 * - Unmount callbacks let the bridge invalidate stale cached state
 */

// Track which holeIds have an active HoleScoringScreen
const mountedHoles = new Set<string>();

// Track processed messageIds for dedup (both listeners fire for same event)
const processedMessages = new Set<string>();
const MAX_PROCESSED = 500;

// Callbacks fired when HoleScoringScreen unmounts for a holeId.
// The bridge registers here to invalidate its in-memory state cache.
type UnmountCallback = (holeId: string) => void;
const unmountCallbacks: UnmountCallback[] = [];

export function mountHoleScoring(holeId: string): void {
  mountedHoles.add(holeId);
}

export function unmountHoleScoring(holeId: string): void {
  mountedHoles.delete(holeId);
  for (const cb of unmountCallbacks) {
    cb(holeId);
  }
}

export function isHoleScoringMounted(holeId: string): boolean {
  return mountedHoles.has(holeId);
}

/**
 * Register a callback to be notified when HoleScoringScreen unmounts.
 * Returns an unregister function for cleanup.
 */
export function onHoleScoringUnmount(cb: UnmountCallback): () => void {
  unmountCallbacks.push(cb);
  return () => {
    const idx = unmountCallbacks.indexOf(cb);
    if (idx >= 0) unmountCallbacks.splice(idx, 1);
  };
}

/**
 * Attempt to claim processing of a message. Returns true if this is the
 * first caller for this messageId (caller should process). Returns false
 * if already claimed (caller should skip).
 */
export function tryProcess(messageId: string): boolean {
  if (processedMessages.has(messageId)) return false;
  processedMessages.add(messageId);
  if (processedMessages.size > MAX_PROCESSED) {
    const first = processedMessages.values().next().value;
    if (first) processedMessages.delete(first);
  }
  return true;
}
