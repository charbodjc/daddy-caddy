import { useState, useEffect } from 'react';
import type { Observable } from 'rxjs';

/**
 * Subscribe to a WatermelonDB / RxJS Observable and return
 * the latest emitted value as React state.
 *
 * Returns `undefined` until the first emission.
 *
 * **Important:** The `observable` argument is used as a `useEffect` dependency.
 * Callers **must** memoize it (e.g. via `useMemo`) to avoid tearing down and
 * re-creating the subscription on every render. Example:
 *
 * ```ts
 * const obs = useMemo(() => round?.holes.observe(), [round?.id]);
 * const holes = useObservable(obs);
 * ```
 */
export function useObservable<T>(
  observable: Observable<T> | undefined,
): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined);

  useEffect(() => {
    if (!observable) {
      setValue(undefined);
      return;
    }

    const subscription = observable.subscribe({
      next: (v) => setValue(v),
      error: (err) => console.error('useObservable error:', err),
    });

    return () => subscription.unsubscribe();
  }, [observable]);

  return value;
}
