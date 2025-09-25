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
import DatabaseService from '../services/database';

interface TableInfo {
  name: string;
  rowCount: number;
  columns: Array<{
    name: string;
    type: string;
    notNull: boolean;
    defaultValue: any;
    primaryKey: boolean;
  }>;
  sampleData: any[];
}

interface DiagnosticData {
  database: string;
  location: string;
  tables: Record<string, TableInfo>;
  timestamp: string;
  error?: string;
}

const DatabaseDiagnosticScreen = ({ navigation }: any) => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const loadDiagnostics = async () => {
    try {
      const data = await DatabaseService.getDatabaseDiagnostics();
      setDiagnostics(data);
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

  const toggleTableExpansion = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  const clearDatabase = async () => {
    Alert.alert(
      'Clear Database',
      'Are you sure you want to clear all data? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.clearAllData();
              Alert.alert('Success', 'Database cleared successfully');
              loadDiagnostics();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear database');
            }
          },
        },
      ]
    );
  };

  const formatValue = (value: any): string => {
    if (value === null) return 'NULL';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  const formatDate = (timestamp: number): string => {
    if (!timestamp) return 'N/A';
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return String(timestamp);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Database Diagnostics</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </View>
    );
  }

  if (!diagnostics) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Database Diagnostics</Text>
        </View>
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={48} color="#f44336" />
          <Text style={styles.errorText}>Failed to load diagnostics</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadDiagnostics}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (diagnostics.error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Database Diagnostics</Text>
        </View>
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={48} color="#f44336" />
          <Text style={styles.errorText}>Database Error</Text>
          <Text style={styles.errorDetail}>{diagnostics.error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadDiagnostics}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const tableNames = Object.keys(diagnostics.tables || {});

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Database Diagnostics</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Database Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Database Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Database:</Text>
            <Text style={styles.infoValue}>{diagnostics.database}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Location:</Text>
            <Text style={styles.infoValue}>{diagnostics.location}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Updated:</Text>
            <Text style={styles.infoValue}>
              {new Date(diagnostics.timestamp).toLocaleString()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Tables:</Text>
            <Text style={styles.infoValue}>{tableNames.length}</Text>
          </View>
        </View>

        {/* Tables */}
        {tableNames.map((tableName) => {
          const table = diagnostics.tables[tableName];
          const isExpanded = expandedTables.has(tableName);

          return (
            <View key={tableName} style={styles.tableSection}>
              <TouchableOpacity
                style={styles.tableHeader}
                onPress={() => toggleTableExpansion(tableName)}
              >
                <View style={styles.tableHeaderLeft}>
                  <Icon
                    name={isExpanded ? 'expand-less' : 'expand-more'}
                    size={24}
                    color="#333"
                  />
                  <Text style={styles.tableName}>{tableName}</Text>
                </View>
                <View style={styles.tableHeaderRight}>
                  <Text style={styles.rowCount}>{table.rowCount} rows</Text>
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.tableContent}>
                  {/* Columns */}
                  <Text style={styles.subSectionTitle}>Schema:</Text>
                  <View style={styles.columnsContainer}>
                    {table.columns.map((column) => (
                      <View key={column.name} style={styles.columnRow}>
                        <Text style={styles.columnName}>
                          {column.name}
                          {column.primaryKey && ' (PK)'}
                        </Text>
                        <Text style={styles.columnType}>
                          {column.type}
                          {column.notNull && ' NOT NULL'}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Sample Data */}
                  {table.sampleData.length > 0 && (
                    <>
                      <Text style={styles.subSectionTitle}>
                        Sample Data (first {table.sampleData.length} rows):
                      </Text>
                      {table.sampleData.map((row, index) => (
                        <View key={index} style={styles.sampleDataContainer}>
                          <Text style={styles.sampleDataIndex}>Row {index + 1}:</Text>
                          {Object.entries(row).map(([key, value]) => (
                            <View key={key} style={styles.dataRow}>
                              <Text style={styles.dataKey}>{key}:</Text>
                              <Text style={styles.dataValue} numberOfLines={3}>
                                {key.includes('date') || key.includes('Date') || 
                                 key.includes('At') || key === 'timestamp'
                                  ? formatDate(value as number)
                                  : formatValue(value)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ))}
                    </>
                  )}

                  {table.rowCount === 0 && (
                    <Text style={styles.emptyTableText}>No data in this table</Text>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.dangerButton} onPress={clearDatabase}>
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
  header: {
    backgroundColor: '#4CAF50',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#f44336',
    marginTop: 10,
    marginBottom: 5,
  },
  errorDetail: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    margin: 12,
    padding: 16,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  tableSection: {
    backgroundColor: '#fff',
    margin: 12,
    borderRadius: 10,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tableHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tableHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  rowCount: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tableContent: {
    padding: 16,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
    marginBottom: 8,
  },
  columnsContainer: {
    marginBottom: 16,
  },
  columnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  columnName: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  columnType: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  sampleDataContainer: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  sampleDataIndex: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 6,
  },
  dataRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dataKey: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
    minWidth: 80,
  },
  dataValue: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  emptyTableText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 10,
  },
  actionsSection: {
    margin: 12,
    marginTop: 20,
  },
  dangerButton: {
    backgroundColor: '#f44336',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    gap: 8,
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DatabaseDiagnosticScreen;
