/**
 * Round Manager - Centralized round ID and state management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from '../database/watermelon/database';
import Round from '../database/watermelon/models/Round';

class RoundManager {
  private static instance: RoundManager;
  private currentRoundId: string | null = null;

  private constructor() {}

  static getInstance(): RoundManager {
    if (!RoundManager.instance) {
      RoundManager.instance = new RoundManager();
    }
    return RoundManager.instance;
  }

  /**
   * Generate a unique round ID with prefix for better tracking
   */
  generateRoundId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `round_${timestamp}_${random}`;
  }

  /**
   * Set the current active round
   */
  async setActiveRound(roundId: string): Promise<void> {
    this.currentRoundId = roundId;
    await AsyncStorage.setItem('active_round_id', roundId);
    console.log('Active round set:', roundId);
  }

  /**
   * Get the current active round ID
   */
  async getActiveRoundId(): Promise<string | null> {
    if (this.currentRoundId) {
      return this.currentRoundId;
    }
    
    // Try to load from AsyncStorage
    const savedId = await AsyncStorage.getItem('active_round_id');
    if (savedId) {
      this.currentRoundId = savedId;
      return savedId;
    }
    
    return null;
  }

  /**
   * Clear the active round (when finishing or canceling)
   */
  async clearActiveRound(): Promise<void> {
    this.currentRoundId = null;
    await AsyncStorage.removeItem('active_round_id');
    console.log('Active round cleared');
  }

  /**
   * Check if there's an active round
   */
  async hasActiveRound(): Promise<boolean> {
    const roundId = await this.getActiveRoundId();
    if (!roundId) return false;
    
    try {
      // Verify the round actually exists in WatermelonDB
      const round = await database.collections.get<Round>('rounds').find(roundId);
      return round !== null && !round.isFinished;
    } catch {
      return false;
    }
  }

  /**
   * Get the active round data
   */
  async getActiveRound(): Promise<Round | null> {
    const roundId = await this.getActiveRoundId();
    if (!roundId) return null;
    
    try {
      return await database.collections.get<Round>('rounds').find(roundId);
    } catch {
      return null;
    }
  }

  /**
   * Validate a round ID format
   */
  isValidRoundId(roundId: string): boolean {
    // Check if it matches our format or legacy format
    return /^round_\d+_\d+$/.test(roundId) || /^\d+$/.test(roundId);
  }
}

export default RoundManager.getInstance();
