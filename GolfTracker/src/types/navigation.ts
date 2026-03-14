import { NavigationProp as RNNavigationProp } from '@react-navigation/native';

// Home stack (nested inside Home tab)
export type HomeStackParamList = {
  HomeMain: undefined;
  Stats: undefined;
};

// Scoring flow stack
export type ScoringStackParamList = {
  RoundTracker: { tournamentId?: string; tournamentName?: string; roundId?: string; quickStart?: boolean } | undefined;
  HoleDetails: { holeId: string; roundId: string };
  ShotTracking: {
    holeId: string;
    roundId: string;
    preselectedShotType?: string;
  };
  HoleSummary: { holeId: string; roundId: string };
  RoundSummary: { roundId: string };
  Camera: { currentHole: number; roundId: string };
};

// Tournament stack
export type TournamentStackParamList = {
  TournamentsList: undefined;
  TournamentRounds: { tournamentId: string; tournamentName?: string };
  RoundSummary: { roundId: string };
};

// Settings stack
export type SettingsStackParamList = {
  SettingsList: undefined;
  Contacts: undefined;
  DatabaseDiagnostic: undefined;
};

// Composite type for screens that navigate across stacks
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- screens navigate across multiple stacks
export type AppNavigationProp = RNNavigationProp<any>;

// Bottom tabs
export type RootTabParamList = {
  Home: undefined;
  Scoring: { screen?: string; params?: Record<string, unknown> } | undefined;
  Tournaments: { screen?: string; params?: Record<string, unknown> } | undefined;
  Settings: undefined;
};
