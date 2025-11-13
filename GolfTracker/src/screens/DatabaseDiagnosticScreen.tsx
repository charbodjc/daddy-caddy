import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { database } from '../database/watermelon/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TableStats {
  name: string;
  count: number;
}

const DatabaseDiagnosticScreen = ({ navigation }: any) => {
  const [stats, setStats] = useState<TableStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDiagnostics = async () => {
    try {
      const collections = database.collections.map;
      const tableStats: TableStats[] = [];

      // Get counts for each collection
      for (const [tableName, collection] of Object.entries(collections)) {
        const count = await collection.query().fetchCount();
        tableStats.push({ name: tableName, count });
      }

      setStats(tableStats.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Error loading diagnostics:', error);
      Alert.alert('Error', 'Failed to load database diagnostics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadDiagnostics();
  };

  const clearDatabase = async () => {
    Alert.alert(
      'Clear Database',
      'This will permanently delete ALL your golf data. This cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear WatermelonDB
              await database.write(async () => {
                await database.unsafeResetDatabase();
              });
              
              // Clear AsyncStorage
              await AsyncStorage.removeItem('active_round_id');
              await AsyncStorage.removeItem('onboarding_completed');
              await AsyncStorage.removeItem('default_sms_group');
              await AsyncStorage.removeItem('default_sms_group_name');
              
              Alert.alert('Success', 'All data cleared successfully');
              loadDiagnostics();
            } catch (error) {
              console.error('Error clearing database:', error);
              Alert.alert('Error', 'Failed to clear database');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading diagnostics...</Text>
      </View>
    );
  }

  const totalRecords = stats.reduce((sum, table) => sum + table.count, 0);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Icon name="storage" size={40} color="#4CAF50" />
          <Text style={styles.headerTitle}>Database Diagnostics</Text>
          <Text style={styles.headerSubtitle}>WatermelonDB</Text>
        </View>

        {/* Summary Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Database Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Tables:</Text>
            <Text style={styles.summaryValue}>{stats.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Records:</Text>
            <Text style={styles.summaryValue}>{totalRecords}</Text>
          </View>
        </View>

        {/* Tables List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tables</Text>
          {stats.map((table) => (
            <View key={table.name} style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Icon 
                  name="table-chart" 
                  size={24} 
                  color={table.count > 0 ? '#4CAF50' : '#999'} 
                />
                <Text style={styles.tableName}>{table.name}</Text>
              </View>
              <View style={styles.tableStats}>
                <Text style={styles.rowCount}>
                  {table.count} {table.count === 1 ? 'record' : 'records'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={loadDiagnostics}
          >
            <Icon name="refresh" size={20} color="#fff" />
            <Text style={styles.refreshButtonText}>Refresh Data</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.dangerButton} 
            onPress={clearDatabase}
          >
            <Icon name="delete-forever" size={20} color="#fff" />
            <Text style={styles.dangerButtonText}>Clear All Data</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 30,
    paddingTop: 60,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginVertical: 12,
  },
  tableCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tableName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
    textTransform: 'capitalize',
  },
  tableStats: {
    marginLeft: 34,
  },
  rowCount: {
    fontSize: 14,
    color: '#666',
  },
  actionsSection: {
    margin: 16,
  },
  refreshButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  dangerButton: {
    backgroundColor: '#f44336',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default DatabaseDiagnosticScreen;
