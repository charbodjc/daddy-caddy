/**
 * SettingsScreenNew.tsx
 * 
 * Migration template for Settings screen.
 * Demonstrates: Simple screen migration, list-based settings, navigation
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { exportLegacyData, shareExportFile } from '../utils/migration/exportData';
import { database } from '../database/watermelon/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingsScreenNew: React.FC = () => {
  const navigation = useNavigation();
  const [exporting, setExporting] = useState(false);
  const [notifications, setNotifications] = useState(false);
  
  const handleExportData = async () => {
    setExporting(true);
    
    try {
      const filePath = await exportLegacyData();
      
      Alert.alert(
        'Export Successful',
        'Your data has been exported. Would you like to share the file?',
        [
          { text: 'Not Now', style: 'cancel' },
          {
            text: 'Share',
            onPress: () => shareExportFile(filePath),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Export Failed',
        error instanceof Error ? error.message : 'Failed to export data'
      );
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
              
              await AsyncStorage.removeItem('active_round_id');
              
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
    navigation.navigate('DatabaseDiagnostic' as never);
  };
  
  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>
      
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
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Notifications</Text>
            <Text style={styles.settingDescription}>
              Receive round reminders
            </Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: '#ccc', true: '#4CAF50' }}
            thumbColor="#fff"
          />
        </View>
      </View>
      
      {/* Data Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>
        
        <TouchableOpacity
          style={styles.settingItem}
          onPress={handleExportData}
          disabled={exporting}
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
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
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
    color: '#999',
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
    color: '#999',
    marginBottom: 4,
  },
});

export default SettingsScreenNew;

