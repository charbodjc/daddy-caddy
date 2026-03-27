import { NavigationProp as RNNavigationProp, NavigatorScreenParams } from '@react-navigation/native';

// Home stack (nested inside Home tab)
export type HomeStackParamList = {
  HomeMain: undefined;
  Stats: undefined;
};

// Scoring flow stack
export type ScoringStackParamList = {
  RoundTracker: { tournamentId?: string; tournamentName?: string; roundId?: string; quickStart?: boolean } | undefined;
  HoleDetails: { holeId: string; roundId: string };
  HoleScoring: {
    holeId: string;
    roundId: string;
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
  Golfers: undefined;
  GolferContacts: { golferId: string; golferName: string };
  DatabaseDiagnostic: undefined;
};

// Composite type — screens navigate both within and across stacks; proper
// CompositeNavigationProp would require per-screen typing which is a larger refactor.
export type AppNavigationProp = RNNavigationProp<Record<string, unknown>>;

// Drawer navigation — NavigatorScreenParams enables type-safe nested navigation
// and deep linking config for nested stack screens.
export type RootDrawerParamList = {
  Home: NavigatorScreenParams<HomeStackParamList> | undefined;
  Scoring: NavigatorScreenParams<ScoringStackParamList> | undefined;
  Tournaments: NavigatorScreenParams<TournamentStackParamList> | undefined;
  Settings: NavigatorScreenParams<SettingsStackParamList> | undefined;
};