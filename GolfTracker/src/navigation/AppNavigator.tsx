import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import {
  ScoringStackParamList,
  TournamentStackParamList,
  SettingsStackParamList,
  RootTabParamList,
} from '../types/navigation';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import RoundTrackerScreen from '../screens/RoundTrackerScreen';
import HoleDetailsScreen from '../screens/HoleDetailsScreen';
import ShotTrackingScreen from '../screens/ShotTrackingScreen';
import HoleSummaryScreen from '../screens/HoleSummaryScreen';
import TournamentsScreen from '../screens/TournamentsScreen';
import TournamentRoundsScreen from '../screens/TournamentRoundsScreen';
import RoundSummaryScreen from '../screens/RoundSummaryScreen';
import CameraScreen from '../screens/CameraScreen';
import SettingsScreen from '../screens/SettingsScreen';
import DatabaseDiagnosticScreen from '../screens/DatabaseDiagnosticScreen';
import ContactsScreen from '../screens/ContactsScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();
const ScoringStackNav = createStackNavigator<ScoringStackParamList>();
const TournamentStackNav = createStackNavigator<TournamentStackParamList>();
const SettingsStackNav = createStackNavigator<SettingsStackParamList>();

// Stack navigator for Scoring/Round tracking flow
const ScoringStack = () => {
  return (
    <ScoringStackNav.Navigator
      screenOptions={{
        headerShown: true,
      }}
    >
      <ScoringStackNav.Screen
        name="RoundTracker"
        component={RoundTrackerScreen}
        options={{ headerShown: false }}
      />
      <ScoringStackNav.Screen
        name="HoleDetails"
        component={HoleDetailsScreen}
        options={{ title: 'Hole Details' }}
      />
      <ScoringStackNav.Screen
        name="ShotTracking"
        component={ShotTrackingScreen}
        options={{ headerShown: false }}
      />
      <ScoringStackNav.Screen
        name="HoleSummary"
        component={HoleSummaryScreen}
        options={{ title: 'Hole Summary' }}
      />
      <ScoringStackNav.Screen
        name="RoundSummary"
        component={RoundSummaryScreen}
        options={{ title: 'Round Summary' }}
      />
      <ScoringStackNav.Screen
        name="Camera"
        component={CameraScreen}
        options={{ title: 'Capture Media' }}
      />
    </ScoringStackNav.Navigator>
  );
};

// Stack navigator for Tournaments
const TournamentStack = () => {
  return (
    <TournamentStackNav.Navigator>
      <TournamentStackNav.Screen
        name="TournamentsList"
        component={TournamentsScreen}
        options={{ title: 'Tournaments', headerShown: false }}
      />
      <TournamentStackNav.Screen
        name="TournamentRounds"
        component={TournamentRoundsScreen}
        options={{ title: 'Tournament Rounds', headerShown: false }}
      />
      <TournamentStackNav.Screen
        name="RoundSummary"
        component={RoundSummaryScreen}
        options={{ title: 'Round Summary' }}
      />
    </TournamentStackNav.Navigator>
  );
};

// Stack navigator for Settings
const SettingsStack = () => {
  return (
    <SettingsStackNav.Navigator>
      <SettingsStackNav.Screen
        name="SettingsList"
        component={SettingsScreen}
        options={{ title: 'Settings', headerShown: false }}
      />
      <SettingsStackNav.Screen
        name="Contacts"
        component={ContactsScreen}
        options={{ title: 'Default Text Group', headerShown: false }}
      />
      <SettingsStackNav.Screen
        name="DatabaseDiagnostic"
        component={DatabaseDiagnosticScreen}
        options={{ title: 'Database Diagnostics', headerShown: false }}
      />
    </SettingsStackNav.Navigator>
  );
};

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            if (route.name === 'Home') {
              return <FontAwesome5 name="home" size={size} color={color} />;
            } else if (route.name === 'Scoring') {
              return <FontAwesome5 name="golf-ball" size={size} color={color} />;
            } else if (route.name === 'Tournaments') {
              return <FontAwesome5 name="trophy" size={size} color={color} />;
            } else if (route.name === 'Settings') {
              return <Icon name="settings" size={size} color={color} />;
            }

            return <Icon name="home" size={size} color={color} />;
          },
          tabBarActiveTintColor: '#4CAF50',
          tabBarInactiveTintColor: 'gray',
          headerShown: false,
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Scoring" component={ScoringStack} />
        <Tab.Screen name="Tournaments" component={TournamentStack} />
        <Tab.Screen name="Settings" component={SettingsStack} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
