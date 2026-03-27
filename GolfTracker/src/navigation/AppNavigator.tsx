import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import {
  HomeStackParamList,
  ScoringStackParamList,
  TournamentStackParamList,
  SettingsStackParamList,
  RootDrawerParamList,
} from '../types/navigation';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import StatsScreen from '../screens/StatsScreen';
import RoundTrackerScreen from '../screens/RoundTrackerScreen';
import HoleDetailsScreen from '../screens/HoleDetailsScreen';
import HoleScoringScreen from '../screens/HoleScoringScreen';
import HoleSummaryScreen from '../screens/HoleSummaryScreen';
import RoundSummaryScreen from '../screens/RoundSummaryScreen';
import TournamentsScreen from '../screens/TournamentsScreen';
import TournamentRoundsScreen from '../screens/TournamentRoundsScreen';
import CameraScreen from '../screens/CameraScreen';
import SettingsScreen from '../screens/SettingsScreen';
import GolfersScreen from '../screens/GolfersScreen';
import DatabaseDiagnosticScreen from '../screens/DatabaseDiagnosticScreen';
import GolferContactsScreen from '../screens/GolferContactsScreen';

const Drawer = createDrawerNavigator<RootDrawerParamList>();
const HomeStackNav = createStackNavigator<HomeStackParamList>();
const ScoringStackNav = createStackNavigator<ScoringStackParamList>();
const TournamentStackNav = createStackNavigator<TournamentStackParamList>();
const SettingsStackNav = createStackNavigator<SettingsStackParamList>();

// Home stack with HomeMain and Stats
const HomeStack = () => {
  return (
    <HomeStackNav.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <HomeStackNav.Screen name="HomeMain" component={HomeScreen} />
      <HomeStackNav.Screen name="Stats" component={StatsScreen} />
    </HomeStackNav.Navigator>
  );
};

// Stack navigator for Scoring/Round tracking flow
const ScoringStack = () => {
  return (
    <ScoringStackNav.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <ScoringStackNav.Screen name="RoundTracker" component={RoundTrackerScreen} />
      <ScoringStackNav.Screen name="HoleDetails" component={HoleDetailsScreen} />
      <ScoringStackNav.Screen name="HoleScoring" component={HoleScoringScreen} />
      <ScoringStackNav.Screen name="HoleSummary" component={HoleSummaryScreen} />
      <ScoringStackNav.Screen name="RoundSummary" component={RoundSummaryScreen} />
      <ScoringStackNav.Screen name="Camera" component={CameraScreen} />
    </ScoringStackNav.Navigator>
  );
};

// Stack navigator for Tournaments
const TournamentStack = () => {
  return (
    <TournamentStackNav.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <TournamentStackNav.Screen name="TournamentsList" component={TournamentsScreen} />
      <TournamentStackNav.Screen name="TournamentRounds" component={TournamentRoundsScreen} />
      <TournamentStackNav.Screen name="RoundSummary" component={RoundSummaryScreen} />
    </TournamentStackNav.Navigator>
  );
};

// Stack navigator for Settings
const SettingsStack = () => {
  return (
    <SettingsStackNav.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <SettingsStackNav.Screen name="SettingsList" component={SettingsScreen} />
      <SettingsStackNav.Screen name="Golfers" component={GolfersScreen} />
      <SettingsStackNav.Screen name="GolferContacts" component={GolferContactsScreen} />
      <SettingsStackNav.Screen name="DatabaseDiagnostic" component={DatabaseDiagnosticScreen} />
    </SettingsStackNav.Navigator>
  );
};

// Deep linking configuration — enables Live Activity tap → scoring screen.
const linking: LinkingOptions<RootDrawerParamList> = {
  prefixes: ['daddycaddy://'],
  config: {
    screens: {
      Scoring: {
        screens: {
          RoundTracker: 'round/:roundId',
        },
      },
    },
  },
};

const AppNavigator = () => {
  return (
    <NavigationContainer linking={linking}>
      <StatusBar barStyle="light-content" />
      <Drawer.Navigator
        screenOptions={{
          headerShown: false,
          drawerPosition: 'left',
          drawerActiveTintColor: '#2E7D32',
          drawerInactiveTintColor: 'gray',
          drawerLabelStyle: {
            fontSize: 16,
            fontWeight: '600',
          },
        }}
      >
        <Drawer.Screen
          name="Home"
          component={HomeStack}
          options={{
            drawerIcon: ({ color, size }) => (
              <FontAwesome5 name="home" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="Scoring"
          component={ScoringStack}
          options={{
            swipeEnabled: false,
            drawerIcon: ({ color, size }) => (
              <FontAwesome5 name="golf-ball" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="Tournaments"
          component={TournamentStack}
          options={{
            drawerIcon: ({ color, size }) => (
              <FontAwesome5 name="trophy" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="Settings"
          component={SettingsStack}
          options={{
            drawerIcon: ({ color, size }) => (
              <Icon name="settings" size={size} color={color} />
            ),
          }}
        />
      </Drawer.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
