import { NavigationProp as RNNavigationProp } from '@react-navigation/native';
import { GolfHole, Tournament } from './index';

// Scoring flow stack
export type ScoringStackParamList = {
  RoundTracker: { tournamentId?: string; tournamentName?: string; roundId?: string } | undefined;
  HoleDetails: { hole: GolfHole; onSave: (hole: GolfHole) => void };
  ShotTracking: {
    hole: GolfHole;
    onSave: (hole: GolfHole) => Promise<void>;
    roundId?: string;
    roundName?: string;
    tournamentName?: string;
    preselectedShotType?: string;
  };
  HoleSummary: { hole: GolfHole; roundId: string; onNext?: () => void };
  RoundSummary: { roundId: string };
  Camera: { currentHole: number; roundId: string; onCapture?: (uri: string) => void };
};

// Tournament stack
export type TournamentStackParamList = {
  TournamentsList: undefined;
  TournamentRounds: { tournament: Tournament };
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
