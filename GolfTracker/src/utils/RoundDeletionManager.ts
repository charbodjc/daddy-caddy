type RoundDeletionListener = (deletedRoundId: string) => void;

class RoundDeletionManager {
  private static instance: RoundDeletionManager;
  private listeners: Set<RoundDeletionListener> = new Set();

  private constructor() {}

  public static getInstance(): RoundDeletionManager {
    if (!RoundDeletionManager.instance) {
      RoundDeletionManager.instance = new RoundDeletionManager();
    }
    return RoundDeletionManager.instance;
  }

  public addListener(listener: RoundDeletionListener): () => void {
    this.listeners.add(listener);
    // Return cleanup function
    return () => {
      this.listeners.delete(listener);
    };
  }

  public notifyRoundDeleted(roundId: string) {
    this.listeners.forEach(listener => {
      try {
        listener(roundId);
      } catch (error) {
        console.error('Error notifying round deletion listener:', error);
      }
    });
  }
}

export default RoundDeletionManager.getInstance();
