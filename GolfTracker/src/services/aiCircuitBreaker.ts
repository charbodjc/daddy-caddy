/**
 * Shared timeout + circuit breaker for OpenAI API calls.
 *
 * Circuit breaker states:
 * - CLOSED: requests flow normally
 * - OPEN: requests are immediately rejected (fallback used)
 * - HALF-OPEN: one probe request is allowed after cooldown
 */

const TIMEOUT_MS = 10_000; // 10s — golf courses have spotty cell coverage
const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 60_000; // 60s before retrying after circuit opens

let consecutiveFailures = 0;
let lastFailureTime = 0;

export function isCircuitOpen(): boolean {
  if (consecutiveFailures < FAILURE_THRESHOLD) return false;

  // Allow a probe request after cooldown
  const elapsed = Date.now() - lastFailureTime;
  if (elapsed >= COOLDOWN_MS) {
    return false; // half-open: let one request through
  }

  return true;
}

export function recordSuccess(): void {
  consecutiveFailures = 0;
}

export function recordFailure(): void {
  consecutiveFailures += 1;
  lastFailureTime = Date.now();
}

/** Race a promise against a timeout. */
export function withTimeout<T>(promise: Promise<T>, ms: number = TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`AI request timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
