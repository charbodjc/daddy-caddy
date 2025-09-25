import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import DatabaseService from '../services/database';

const SettingsScreen = ({ navigation }: any) => {

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Settings</Text>
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
                <Text style={styles.menuItemDescription}>View database tables and data</Text>
              </View>
            </View>
            <MaterialIcon name="chevron-right" size={24} color="#999" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={async () => {
              Alert.alert(
                'Export Data',
                'Export all your golf data as JSON?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Export',
                    onPress: async () => {
                      try {
                        const data = await DatabaseService.exportData();
                        console.log('Exported data:', JSON.stringify(data));
                        Alert.alert('Success', 'Data exported to console (check logs)');
                      } catch (error) {
                        Alert.alert('Error', 'Failed to export data');
                      }
                    },
                  },
                ]
              );
            }}
          >
            <View style={styles.menuItemLeft}>
              <MaterialIcon name="file-download" size={24} color="#666" />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemTitle}>Export Data</Text>
                <Text style={styles.menuItemDescription}>Export all data as JSON</Text>
              </View>
            </View>
            <MaterialIcon name="chevron-right" size={24} color="#999" />
          </TouchableOpacity>

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
                        await DatabaseService.clearAllData();
                        Alert.alert('Success', 'All data has been cleared');
                      } catch (error) {
                        Alert.alert('Error', 'Failed to clear data');
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
                <Text style={styles.menuItemDescription}>Delete all rounds, tournaments, and media</Text>
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