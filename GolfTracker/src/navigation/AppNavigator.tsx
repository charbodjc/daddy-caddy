import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import RoundTrackerScreen from '../screens/RoundTrackerScreen';
import HoleDetailsScreen from '../screens/HoleDetailsScreen';
import ShotTrackingScreen from '../screens/ShotTrackingScreen';
import HoleSummaryScreen from '../screens/HoleSummaryScreen';
import StatsScreen from '../screens/StatsScreen';
import ContactsScreen from '../screens/ContactsScreen';
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
            let iconName: string = 'home';

            if (route.name === 'Home') {
              iconName = 'home';
            } else if (route.name === 'Round') {
              iconName = 'golf-course';
            } else if (route.name === 'Stats') {
              iconName = 'bar-chart';
            } else if (route.name === 'Tournaments') {
              iconName = 'emoji-events';
            } else if (route.name === 'Contacts') {
              iconName = 'people';
            }

            return <Icon name={iconName} size={size} color={color} />;
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
        <Tab.Screen name="Contacts" component={ContactsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
