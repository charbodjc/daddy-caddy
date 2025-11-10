import { useEffect } from 'react';
import { useStatsStore } from '../stores/statsStore';

export const useStats = (autoLoad: boolean = true) => {
  const { stats, loading, error, calculateStats } = useStatsStore();
  
  useEffect(() => {
    if (autoLoad) {
      calculateStats();
    }
  }, [autoLoad, calculateStats]);
  
  return { 
    stats, 
    loading, 
    error,
    refresh: calculateStats,
  };
};

