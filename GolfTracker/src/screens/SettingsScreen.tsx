import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { ScreenHeader } from '../components/common/ScreenHeader';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { database } from '../database/watermelon/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetOnboarding } from '../utils/onboarding';
import { useGolferStore } from '../stores/golferStore';
import { removePreference } from '../services/preferenceService';
import type { SettingsStackParamList } from '../types/navigation';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<SettingsStackParamList>>();
  const [exporting, setExporting] = useState(false);
  
  const handleExportData = async () => {
    setExporting(true);
    try {
      Alert.alert('Coming Soon', 'Data export will be available in a future update.');
    } finally {
      setExporting(false);
    }
  };
  
  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete ALL your golf data. This cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.write(async () => {
                await database.unsafeResetDatabase();
              });

              // Clean up AsyncStorage keys
              await AsyncStorage.removeItem('active_round_id');
              await removePreference('active_golfer_id');

              // Re-bootstrap default golfer immediately
              await useGolferStore.getState().ensureDefaultGolfer();
              await useGolferStore.getState().loadGolfers();

              Alert.alert('Success', 'All data has been cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };
  
  const handleDatabaseDiagnostics = () => {
    navigation.navigate('DatabaseDiagnostic');
  };
  
  const handleReplayOnboarding = async () => {
    Alert.alert(
      'Replay Onboarding',
      'Would you like to see the app tutorial again?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Show Tutorial',
          onPress: async () => {
            try {
              await resetOnboarding();
              Alert.alert(
                'Tutorial Reset',
                'The app tutorial will show the next time you restart the app.',
                [
                  {
                    text: 'Restart Now',
                    onPress: () => {
                      // In a real app, you'd use a state management solution or reload
                      Alert.alert('Info', 'Please close and reopen the app to see the tutorial.');
                    },
                  },
                  { text: 'Later', style: 'cancel' },
                ]
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to reset tutorial');
            }
          },
        },
      ]
    );
  };
  
  return (
    <ScrollView style={styles.container}>
      <ScreenHeader title="Settings" leftAction="menu" />
      
      {/* App Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Information</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Version</Text>
            <Text style={styles.settingValue}>2.0.0 (Refactored)</Text>
          </View>
        </View>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Database</Text>
            <Text style={styles.settingValue}>Watermelon DB</Text>
          </View>
        </View>
      </View>
      
      {/* Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => navigation.navigate('Golfers')}
          accessibilityRole="button"
          accessibilityLabel="Manage Golfers"
        >
          <View style={styles.settingInfo}>
            <Icon name="people" size={24} color="#4CAF50" />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Manage Golfers</Text>
              <Text style={styles.settingDescription}>
                Add and manage golfer profiles
              </Text>
            </View>
          </View>
          <Icon name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={handleReplayOnboarding}
          accessibilityRole="button"
          accessibilityLabel="Replay tutorial"
        >
          <View style={styles.settingInfo}>
            <Icon name="help-outline" size={24} color="#4CAF50" />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Tutorial</Text>
              <Text style={styles.settingDescription}>
                Replay the app tutorial
              </Text>
            </View>
          </View>
          <Icon name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>
      </View>
      
      {/* Data Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>
        
        <TouchableOpacity
          style={styles.settingItem}
          onPress={handleExportData}
          disabled={exporting}
          accessibilityRole="button"
          accessibilityLabel="Export data"
        >
          <View style={styles.settingInfo}>
            <Icon name="cloud-upload" size={24} color="#4CAF50" />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Export Data</Text>
              <Text style={styles.settingDescription}>
                Save your data to a file
              </Text>
            </View>
          </View>
          {exporting && (
            <Text style={styles.loadingText}>Exporting...</Text>
          )}
          {!exporting && <Icon name="chevron-right" size={24} color="#ccc" />}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.settingItem}
          onPress={handleClearAllData}
          accessibilityRole="button"
          accessibilityLabel="Clear all data"
        >
          <View style={styles.settingInfo}>
            <Icon name="delete-forever" size={24} color="#f44336" />
            <View style={styles.settingText}>
              <Text style={[styles.settingLabel, { color: '#f44336' }]}>
                Clear All Data
              </Text>
              <Text style={styles.settingDescription}>
                Permanently delete all rounds and tournaments
              </Text>
            </View>
          </View>
          <Icon name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>
      </View>
      
      {/* Developer Tools */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Developer</Text>
        
        <TouchableOpacity
          style={styles.settingItem}
          onPress={handleDatabaseDiagnostics}
          accessibilityRole="button"
          accessibilityLabel="Database diagnostics"
        >
          <View style={styles.settingInfo}>
            <Icon name="bug-report" size={24} color="#666" />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Database Diagnostics</Text>
              <Text style={styles.settingDescription}>
                View database information
              </Text>
            </View>
          </View>
          <Icon name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>
      </View>
      
      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Made with ❤️ for golfers
        </Text>
        <Text style={styles.footerText}>
          Daddy Caddy © 2025
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    marginTop: 20,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 15,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 14,
    color: '#666',
  },
  settingDescription: {
    fontSize: 13,
    color: '#767676',
  },
  loadingText: {
    fontSize: 14,
    color: '#4CAF50',
  },
  footer: {
    padding: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#767676',
    marginBottom: 4,
  },
});

export default SettingsScreen;

