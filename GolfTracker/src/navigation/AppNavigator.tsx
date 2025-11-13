import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

// Import screens (WatermelonDB only - SQLite removed)
import HomeScreen from '../screens/HomeScreen';
import RoundTrackerScreen from '../screens/RoundTrackerScreen';
import HoleDetailsScreen from '../screens/HoleDetailsScreen';
import ShotTrackingScreen from '../screens/ShotTrackingScreen';
import HoleSummaryScreen from '../screens/HoleSummaryScreen'; // TODO: migrate
import StatsScreen from '../screens/StatsScreen';
import TournamentsScreen from '../screens/TournamentsScreen';
import TournamentRoundsScreen from '../screens/TournamentRoundsScreen';
import RoundSummaryScreen from '../screens/RoundSummaryScreen';
import CameraScreen from '../screens/CameraScreen'; // No DB dependency
import SettingsScreen from '../screens/SettingsScreen';
import DatabaseDiagnosticScreen from '../screens/DatabaseDiagnosticScreen'; // TODO: migrate
import ContactsScreen from '../screens/ContactsScreen'; // TODO: migrate

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stack navigator for Scoring/Round tracking flow
const ScoringStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen 
        name="RoundTracker" 
        component={RoundTrackerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="HoleDetails" 
        component={HoleDetailsScreen}
        options={{ title: 'Hole Details' }}
      />
      <Stack.Screen 
        name="ShotTracking" 
        component={ShotTrackingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="HoleSummary" 
        component={HoleSummaryScreen}
        options={{ title: 'Hole Summary' }}
      />
      <Stack.Screen 
        name="RoundSummary" 
        component={RoundSummaryScreen}
        options={{ title: 'Round Summary' }}
      />
      <Stack.Screen 
        name="Camera" 
        component={CameraScreen}
        options={{ title: 'Capture Media' }}
      />
    </Stack.Navigator>
  );
};

// Stack navigator for Tournaments
const TournamentStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="TournamentsList" 
        component={TournamentsScreen}
        options={{ title: 'Tournaments', headerShown: false }}
      />
      <Stack.Screen 
        name="TournamentRounds" 
        component={TournamentRoundsScreen}
        options={{ title: 'Tournament Rounds', headerShown: false }}
      />
      <Stack.Screen 
        name="RoundSummary" 
        component={RoundSummaryScreen}
        options={{ title: 'Round Summary' }}
      />
    </Stack.Navigator>
  );
};

// Stack navigator for Settings
const SettingsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="SettingsList" 
        component={SettingsScreen}
        options={{ title: 'Settings', headerShown: false }}
      />
      <Stack.Screen 
        name="Contacts" 
        component={ContactsScreen}
        options={{ title: 'Default Text Group', headerShown: false }}
      />
      <Stack.Screen 
        name="DatabaseDiagnostic" 
        component={DatabaseDiagnosticScreen}
        options={{ title: 'Database Diagnostics', headerShown: false }}
      />
    </Stack.Navigator>
  );
};

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
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