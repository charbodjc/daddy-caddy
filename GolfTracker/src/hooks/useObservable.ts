import { useState, useEffect } from 'react';
import type { Observable } from 'rxjs';

/**
 * Subscribe to a WatermelonDB / RxJS Observable and return
 * the latest emitted value as React state.
 *
 * Returns `undefined` until the first emission.
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
