/**
 * @format
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

// Mock the database service before importing App
jest.mock('../src/services/database', () => ({
  __esModule: true,
  default: {
    init: jest.fn().mockResolvedValue(undefined),
    openDatabase: jest.fn(),
    saveRound: jest.fn(),
    getRounds: jest.fn().mockResolvedValue([]),
    getRound: jest.fn(),
    deleteRound: jest.fn(),
    setPreference: jest.fn(),
    getPreference: jest.fn(),
  },
}));

import App from '../App';
import DatabaseService from '../src/services/database';

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
    // Set default successful init
    (DatabaseService.init as jest.Mock).mockResolvedValue(undefined);
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

  it('handles database initialization error', async () => {
    // Mock database init to fail
    (DatabaseService.init as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

    const { getByText } = render(<App />);
    
    await waitFor(() => {
      expect(getByText(/Error: Failed to initialize database/)).toBeTruthy();
    });
  });
});
