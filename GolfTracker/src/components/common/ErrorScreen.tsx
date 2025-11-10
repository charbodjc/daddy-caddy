import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from './Button';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface ErrorScreenProps {
  error: Error;
  onRetry?: () => void;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({ error, onRetry }) => {
  return (
    <View style={styles.container}>
      <Icon name="error-outline" size={64} color="#f44336" />
      <Text style={styles.title}>Oops! Something went wrong</Text>
      <Text style={styles.message}>{error.message || 'An unexpected error occurred'}</Text>
      
      {onRetry && (
        <Button
          title="Try Again"
          onPress={onRetry}
          style={styles.button}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    minWidth: 150,
  },
});

