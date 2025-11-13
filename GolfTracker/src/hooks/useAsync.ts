import { useState, useEffect, useCallback, DependencyList } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export const useAsync = <T,>(
  asyncFunction: () => Promise<T>,
  dependencies: DependencyList = [],
  immediate: boolean = true
) => {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const execute = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    
    try {
      const data = await asyncFunction();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
      throw error;
    }
  }, dependencies);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { 
    ...state, 
    execute,
    refetch: execute,
  };
};

