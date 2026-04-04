import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { database } from '../database/watermelon/database';
import Round from '../database/watermelon/models/Round';
import { Q } from '@nozbe/watermelondb';
import type { Statistics } from '../types';
import { calculateScoreBreakdown } from '../utils/scoreCalculations';
import { useGolferStore } from './golferStore';

export type StatsScope = 'all' | 'tournament' | 'non-tournament';

interface StatsState {
  stats: Statistics | null;
  loading: boolean;
  error: Error | null;
  scope: StatsScope;

  // Actions
  calculateStats: (golferId?: string, scope?: StatsScope) => Promise<void>;
  setScope: (scope: StatsScope) => void;
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
      scope: 'all',

      setScope: (scope: StatsScope) => {
        set({ scope });
      },

      // Calculate statistics for a specific golfer (defaults to active golfer)
      calculateStats: async (golferId?: string, scope?: StatsScope) => {
        const effectiveScope = scope ?? get().scope;
        set({ loading: true, error: null, scope: effectiveScope });

        try {
          const effectiveGolferId = golferId || useGolferStore.getState().getActiveGolferId();
          const clauses = [
            Q.where('is_finished', true),
            ...(effectiveGolferId ? [Q.where('golfer_id', effectiveGolferId)] : []),
            ...(effectiveScope === 'tournament' ? [Q.where('tournament_id', Q.notEq(null))] : []),
            ...(effectiveScope === 'non-tournament' ? [Q.where('tournament_id', null)] : []),
          ];

          const rounds = await database.collections
            .get<Round>('rounds')
            .query(...clauses)
            .fetch();
          
          const stats = await get().calculateStatsForRounds(rounds);
          
          set({ stats, loading: false });
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          set({ error, loading: false });
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
          const breakdown = calculateScoreBreakdown(holes);
          stats.eaglesOrBetter += breakdown.eagles;
          stats.birdies += breakdown.birdies;
          stats.pars += breakdown.pars;
          stats.bogeys += breakdown.bogeys;
          stats.doubleBogeyOrWorse += breakdown.doublePlus;
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

