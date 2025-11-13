/**
 * @format
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

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

describe('App', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    const { getByText } = render(<App />);
    expect(getByText('Initializing Daddy Caddy...')).toBeTruthy();
  });

  it('renders AppNavigator after initialization', async () => {
    const { getByText } = render(<App />);
    
    // Wait for the async initialization to complete
    await waitFor(() => {
      expect(getByText('App Navigator')).toBeTruthy();
    }, { timeout: 3000 });
  });
});
