import { requireNativeModule } from 'expo-modules-core';

interface LiveActivityNativeModule {
  startRoundActivity(courseName: string, roundId: string, totalHoles: number): Promise<string | null>;
  updateRoundActivity(
    activityId: string,
    currentHole: number,
    totalScore: number,
    scoreVsPar: number,
    holesCompleted: number,
    totalHoles: number,
  ): Promise<void>;
  endRoundActivity(
    activityId: string,
    currentHole: number,
    totalScore: number,
    scoreVsPar: number,
    holesCompleted: number,
    totalHoles: number,
    immediate: boolean,
  ): Promise<void>;
  getRunningActivityId(roundId: string): Promise<string | null>;
}

export default requireNativeModule<LiveActivityNativeModule>('LiveActivity');
