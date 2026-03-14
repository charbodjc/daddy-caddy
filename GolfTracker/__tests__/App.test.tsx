/**
 * @format
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import App from '../App';

// Mock the AppNavigator
jest.mock('../src/navigation/AppNavigator', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function AppNavigator() {
    return (
      <View>
        <Text>App Navigator</Text>
      </View>
    );
  };
});

// Mock OnboardingScreen
jest.mock('../src/screens/OnboardingScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function OnboardingScreen() {
    return (
      <View>
        <Text>Onboarding Screen</Text>
      </View>
    );
  };
});

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    const { getByText } = render(<App />);
    expect(getByText('Initializing Daddy Caddy...')).toBeTruthy();
  });

  it('renders AppNavigator after initialization when onboarding is complete', async () => {
    // Mock onboarding as completed
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

    const { getByText } = render(<App />);

    await waitFor(() => {
      expect(getByText('App Navigator')).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('renders OnboardingScreen for first-time users', async () => {
    // Mock onboarding as not completed
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const { getByText } = render(<App />);

    await waitFor(() => {
      expect(getByText('Onboarding Screen')).toBeTruthy();
    }, { timeout: 3000 });
  });
});
