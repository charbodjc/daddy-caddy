import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import RoundTrackerScreen from '../screens/RoundTrackerScreen';
import HoleDetailsScreen from '../screens/HoleDetailsScreen';
import ShotTrackingScreen from '../screens/ShotTrackingScreen';
import HoleSummaryScreen from '../screens/HoleSummaryScreen';
import StatsScreen from '../screens/StatsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TournamentsScreen from '../screens/TournamentsScreen';
import RoundSummaryScreen from '../screens/RoundSummaryScreen';
import CameraScreen from '../screens/CameraScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stack navigator for Round tracking flow
const RoundStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="RoundTracker" 
        component={RoundTrackerScreen}
        options={{ title: 'Track Round' }}
      />
      <Stack.Screen 
        name="HoleDetails" 
        component={HoleDetailsScreen}
        options={{ title: 'Hole Details' }}
      />
      <Stack.Screen 
        name="ShotTracking" 
        component={ShotTrackingScreen}
        options={{ title: 'Shot Tracking' }}
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
        options={{ title: 'Tournaments' }}
      />
      <Stack.Screen 
        name="RoundTracker" 
        component={RoundTrackerScreen}
        options={{ title: 'Track Round' }}
      />
      <Stack.Screen 
        name="HoleDetails" 
        component={HoleDetailsScreen}
        options={{ title: 'Hole Details' }}
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
            } else if (route.name === 'Round') {
              return <FontAwesome5 name="golf-ball" size={size} color={color} />;
            } else if (route.name === 'Stats') {
              return <FontAwesome5 name="chart-line" size={size} color={color} />;
            } else if (route.name === 'Tournaments') {
              return <FontAwesome5 name="trophy" size={size} color={color} />;
            } else if (route.name === 'Settings') {
              return <FontAwesome5 name="cog" size={size} color={color} />;
            }

            return <Icon name="home" size={size} color={color} />;
          },
          tabBarActiveTintColor: '#4CAF50',
          tabBarInactiveTintColor: 'gray',
          headerShown: false,
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Round" component={RoundStack} />
        <Tab.Screen name="Stats" component={StatsScreen} />
        <Tab.Screen name="Tournaments" component={TournamentStack} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
