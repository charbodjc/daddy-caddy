import { useEffect } from 'react';
import { useRoundStore } from '../stores/roundStore';

export const useRound = (roundId?: string) => {
  const { activeRound, loading, error } = useRoundStore();

  useEffect(() => {
    // Access actions via getState() to avoid putting unstable Zustand
    // function references in the dependency array (infinite re-render risk).
    const { setActiveRound, loadActiveRound } = useRoundStore.getState();

    if (roundId) {
      setActiveRound(roundId);
    } else {
      loadActiveRound();
    }
  }, [roundId]);

  return {
    round: activeRound,
    loading,
    error,
    reload: () => useRoundStore.getState().loadActiveRound(),
  };
};
