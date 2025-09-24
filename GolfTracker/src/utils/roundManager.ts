/**
 * Round Manager - Centralized round ID and state management
 */

import DatabaseService from '../services/database';

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
    await DatabaseService.setPreference('active_round_id', roundId);
    console.log('Active round set:', roundId);
  }

  /**
   * Get the current active round ID
   */
  async getActiveRoundId(): Promise<string | null> {
    if (this.currentRoundId) {
      return this.currentRoundId;
    }
    
    // Try to load from database
    const savedId = await DatabaseService.getPreference('active_round_id');
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
    await DatabaseService.setPreference('active_round_id', '');
    console.log('Active round cleared');
  }

  /**
   * Check if there's an active round
   */
  async hasActiveRound(): Promise<boolean> {
    const roundId = await this.getActiveRoundId();
    if (!roundId) return false;
    
    // Verify the round actually exists in the database
    const round = await DatabaseService.getRound(roundId);
    return round !== null && !round.isFinished;
  }

  /**
   * Get the active round data
   */
  async getActiveRound() {
    const roundId = await this.getActiveRoundId();
    if (!roundId) return null;
    
    return await DatabaseService.getRound(roundId);
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
