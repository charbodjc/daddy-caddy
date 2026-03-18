import { useEffect } from 'react';
import { useGolferStore } from '../stores/golferStore';

export const useGolfers = () => {
  const {
    golfers,
    activeGolferId,
    loading,
    error,
    loadGolfers,
    setActiveGolfer,
    createGolfer,
  } = useGolferStore();

  useEffect(() => {
    loadGolfers();
  }, [loadGolfers]);

  const activeGolfer = golfers.find((g) => g.id === activeGolferId) ?? null;

  return {
    golfers,
    activeGolfer,
    activeGolferId,
    loading,
    error,
    setActiveGolfer,
    createGolfer,
    reload: loadGolfers,
  };
};
