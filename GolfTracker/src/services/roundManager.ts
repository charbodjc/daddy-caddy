// Simple event emitter for round deletion notifications
class RoundDeletionManager {
  private listeners: (() => void)[] = [];

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  notifyRoundDeleted(roundId: string) {
    this.listeners.forEach(listener => listener());
  }
}

export default new RoundDeletionManager();
