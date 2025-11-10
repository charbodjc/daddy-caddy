import { useEffect } from 'react';
import { useRoundStore } from '../stores/roundStore';

export const useRound = (roundId?: string) => {
  const { activeRound, loading, error, loadActiveRound, setActiveRound } = useRoundStore();
  
  useEffect(() => {
    if (roundId) {
      setActiveRound(roundId);
    } else {
      loadActiveRound();
    }
  }, [roundId, loadActiveRound, setActiveRound]);
  
  return { 
    round: activeRound, 
    loading, 
    error,
    reload: loadActiveRound,
  };
};

