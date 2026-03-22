import { useEffect } from 'react';
import { useRoundStore } from '../stores/roundStore';
import { useGolferStore } from '../stores/golferStore';

export const useRound = (roundId?: string) => {
  const activeRound = useRoundStore((s) => s.activeRound);
  const loading = useRoundStore((s) => s.loading);
  const error = useRoundStore((s) => s.error);
  const activeGolferId = useGolferStore((s) => s.activeGolferId);

  useEffect(() => {
    // Access actions via getState() to avoid putting unstable Zustand
    // function references in the dependency array (infinite re-render risk).
    const { setActiveRound, loadActiveRound } = useRoundStore.getState();

    if (roundId) {
      setActiveRound(roundId);
    } else {
      loadActiveRound();
    }
  }, [roundId, activeGolferId]);

  return {
    round: activeRound,
    loading,
    error,
    reload: () => useRoundStore.getState().loadActiveRound(),
  };
};
