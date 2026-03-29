import { requireNativeModule } from 'expo-modules-core';

interface WatchConnectivityNativeModule {
  activateSession(): Promise<boolean>;
  getReachability(): Promise<boolean>;
  getIsPaired(): Promise<boolean>;
  getIsWatchAppInstalled(): Promise<boolean>;
  updateContext(contextJson: string): Promise<void>;
  clearContext(): Promise<void>;
}

export default requireNativeModule<WatchConnectivityNativeModule>('WatchConnectivity');
