import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { database } from '../database/watermelon/database';
import Round from '../database/watermelon/models/Round';
import { Q } from '@nozbe/watermelondb';
import type { Statistics } from '../types';

interface StatsState {
  stats: Statistics | null;
  loading: boolean;
  error: Error | null;
  
  // Actions
  calculateStats: () => Promise<void>;
  calculateStatsForRounds: (rounds: Round[]) => Promise<Statistics>;
  clearStats: () => void;
}

const initialStats: Statistics = {
  totalRounds: 0,
  averageScore: 0,
  bestScore: 0,
  worstScore: 0,
  averagePutts: 0,
  fairwayAccuracy: 0,
  girPercentage: 0,
  eaglesOrBetter: 0,
  birdies: 0,
  pars: 0,
  bogeys: 0,
  doubleBogeyOrWorse: 0,
};

export const useStatsStore = create<StatsState>()(
  devtools(
    (set, get) => ({
      stats: null,
      loading: false,
      error: null,
      
      // Calculate statistics from all rounds
      calculateStats: async () => {
        set({ loading: true, error: null });
        
        try {
          const rounds = await database.collections
            .get<Round>('rounds')
            .query(Q.where('is_finished', true))
            .fetch();
          
          const stats = await get().calculateStatsForRounds(rounds);
          
          set({ stats, loading: false });
        } catch (error) {
          set({ error: error as Error, loading: false });
        }
      },
      
      // Calculate statistics for specific rounds
      calculateStatsForRounds: async (rounds: Round[]) => {
        if (rounds.length === 0) {
          return initialStats;
        }
        
        const stats: Statistics = {
          totalRounds: rounds.length,
          averageScore: 0,
          bestScore: Infinity,
          worstScore: -Infinity,
          averagePutts: 0,
          fairwayAccuracy: 0,
          girPercentage: 0,
          eaglesOrBetter: 0,
          birdies: 0,
          pars: 0,
          bogeys: 0,
          doubleBogeyOrWorse: 0,
        };
        
        let totalScore = 0;
        let totalPutts = 0;
        let totalFairways = 0;
        let totalGIR = 0;
        
        for (const round of rounds) {
          // Get holes for this round
          const holes = await round.holes.fetch();
          
          if (round.totalScore) {
            totalScore += round.totalScore;
            stats.bestScore = Math.min(stats.bestScore, round.totalScore);
            stats.worstScore = Math.max(stats.worstScore, round.totalScore);
          }
          
          if (round.totalPutts) totalPutts += round.totalPutts;
          if (round.fairwaysHit) totalFairways += round.fairwaysHit;
          if (round.greensInRegulation) totalGIR += round.greensInRegulation;
          
          // Calculate hole-by-hole stats
          for (const hole of holes) {
            if (hole.strokes > 0) {
              const score = hole.strokes - hole.par;
              
              if (score <= -2) stats.eaglesOrBetter++;
              else if (score === -1) stats.birdies++;
              else if (score === 0) stats.pars++;
              else if (score === 1) stats.bogeys++;
              else if (score >= 2) stats.doubleBogeyOrWorse++;
            }
          }
        }
        
        // Calculate averages
        stats.averageScore = totalScore / rounds.length;
        stats.averagePutts = totalPutts / rounds.length;
        stats.fairwayAccuracy = (totalFairways / (rounds.length * 14)) * 100; // 14 fairways per round
        stats.girPercentage = (totalGIR / (rounds.length * 18)) * 100;
        
        // Handle edge cases
        if (stats.bestScore === Infinity) stats.bestScore = 0;
        if (stats.worstScore === -Infinity) stats.worstScore = 0;
        
        return stats;
      },
      
      // Clear statistics
      clearStats: () => {
        set({ stats: null });
      },
    }),
    { name: 'StatsStore' }
  )
);

