import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import DatabaseService from '../services/database';

const APP_VERSION = '1.2.7';
const BUILD_NUMBER = '27'; // Increment this with each deploy
const BUILD_DATE = '2025-10-13'; // Update this when deploying

const SettingsScreen = ({ navigation }: any) => {

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Settings</Text>
          <Text style={styles.versionText}>
            v{APP_VERSION} (build {BUILD_NUMBER}) • {BUILD_DATE}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('Contacts')}
          >
            <View style={styles.menuItemLeft}>
              <MaterialIcon name="group" size={24} color="#4CAF50" />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemTitle}>Default Text Group</Text>
                <Text style={styles.menuItemDescription}>Set default recipients for score updates</Text>
              </View>
            </View>
            <MaterialIcon name="chevron-right" size={24} color="#999" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Developer Tools</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('DatabaseDiagnostic')}
          >
            <View style={styles.menuItemLeft}>
              <MaterialIcon name="storage" size={24} color="#666" />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemTitle}>Database Diagnostics</Text>
                <Text style={styles.menuItemDescription}>Check if rounds are being deleted</Text>
              </View>
            </View>
            <MaterialIcon name="chevron-right" size={24} color="#999" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <TouchableOpacity 
            style={[styles.menuItem, styles.dangerItem]}
            onPress={() => {
              Alert.alert(
                'Clear All Data',
                'This will permanently delete all your golf data. This action cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete All',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        console.log('🗑️ User confirmed data deletion');
                        await DatabaseService.clearAllData();
                        console.log('✅ Data cleared successfully');
                        Alert.alert(
                          'Success', 
                          'All data has been cleared successfully',
                          [{ text: 'OK', onPress: () => {
                            // Optionally navigate to home or refresh
                            console.log('User acknowledged data deletion');
                          }}]
                        );
                      } catch (error: any) {
                        console.error('❌ Failed to clear data:', error);
                        Alert.alert('Error', `Failed to clear data: ${error.message || 'Unknown error'}`);
                      }
                    },
                  },
                ]
              );
            }}
          >
            <View style={styles.menuItemLeft}>
              <MaterialIcon name="delete-forever" size={24} color="#f44336" />
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemTitle, styles.dangerText]}>Clear All Data</Text>
                <Text style={styles.menuItemDescription}>Delete all rounds, tournaments, contacts, and media</Text>
              </View>
            </View>
            <MaterialIcon name="chevron-right" size={24} color="#999" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
  },
  content: { 
    paddingBottom: 30 
  },
  header: { 
    backgroundColor: '#4CAF50',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerText: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#fff',
  },
  versionText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    fontWeight: '500',
  },
  card: { 
    backgroundColor: '#fff', 
    margin: 16,
    borderRadius: 12, 
    padding: 16, 
    gap: 10 
  },
  cardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  cardTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#333' 
  },
  description: { 
    color: '#666', 
    fontSize: 13 
  },
  textArea: {
    minHeight: 100,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  helper: { 
    color: '#999', 
    fontSize: 12 
  },
  saveButton: { 
    backgroundColor: '#4CAF50', 
    padding: 12, 
    borderRadius: 8, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 8 
  },
  saveText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  menuItemDescription: {
    fontSize: 13,
    color: '#999',
  },
  dangerItem: {
    borderWidth: 1,
    borderColor: '#ffebee',
  },
  dangerText: {
    color: '#f44336',
  },
});

export default SettingsScreen;