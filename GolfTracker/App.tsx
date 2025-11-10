import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from './src/navigation/AppNavigator';
import DatabaseService from './src/services/database';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';

const App = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize database
      await DatabaseService.init();
      console.log('Database initialized successfully');
      
      // Check if user has completed onboarding
      const onboardingCompleted = await AsyncStorage.getItem('onboarding_completed');
      setShowOnboarding(onboardingCompleted !== 'true');
      
      setIsInitialized(true);
    } catch (err) {
      console.error('Failed to initialize app:', err);
      setError('Failed to initialize database');
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (!isInitialized || showOnboarding === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Initializing Daddy Caddy...</Text>
      </View>
    );
  }

  // Show onboarding for first-time users
  if (showOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  return (
    <ErrorBoundary>
      <AppNavigator />
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    padding: 20,
  },
});

export default App;