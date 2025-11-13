import { NavigatorScreenParams } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { StackScreenProps } from '@react-navigation/stack';

// Scoring Stack Parameter List
export type ScoringStackParamList = {
  RoundTracker: { roundId?: string; tournamentId?: string; tournamentName?: string } | undefined;
  HoleDetails: { roundId: string; holeNumber: number };
  ShotTracking: { roundId: string; holeNumber: number };
  HoleSummary: { roundId: string; holeNumber: number };
  RoundSummary: { roundId: string };
  Camera: { roundId: string; holeNumber?: number };
};

// Tournament Stack Parameter List
export type TournamentStackParamList = {
  TournamentsList: undefined;
  TournamentRounds: { tournamentId: string; tournamentName: string };
  RoundSummary: { roundId: string };
};

// Settings Stack Parameter List
export type SettingsStackParamList = {
  SettingsList: undefined;
  Contacts: undefined;
  DatabaseDiagnostic: undefined;
};

// Root Tab Parameter List
export type RootTabParamList = {
  Home: undefined;
  Scoring: NavigatorScreenParams<ScoringStackParamList>;
  Tournaments: NavigatorScreenParams<TournamentStackParamList>;
  Settings: NavigatorScreenParams<SettingsStackParamList>;
};

// Screen Props Types
export type HomeScreenProps = BottomTabScreenProps<RootTabParamList, 'Home'>;

export type ScoringScreenProps<T extends keyof ScoringStackParamList> = StackScreenProps<
  ScoringStackParamList,
  T
>;

export type TournamentScreenProps<T extends keyof TournamentStackParamList> = StackScreenProps<
  TournamentStackParamList,
  T
>;

export type SettingsScreenProps<T extends keyof SettingsStackParamList> = StackScreenProps<
  SettingsStackParamList,
  T
>;

// Declare global navigation types for @react-navigation/native
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootTabParamList {}
  }
}

