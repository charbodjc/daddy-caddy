import React, { useState, useEffect } from 'react';
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
import { GolferAvatar } from '../components/golfer/GolferAvatar';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { database } from '../database/watermelon/database';
import Round from '../database/watermelon/models/Round';
import Tournament from '../database/watermelon/models/Tournament';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetOnboarding } from '../utils/onboarding';
import { useGolferStore } from '../stores/golferStore';
import { removePreference } from '../services/preferenceService';
import type { SettingsStackParamList } from '../types/navigation';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<SettingsStackParamList>>();
  const { golfers, loadGolfers } = useGolferStore();
  const [smsExpanded, setSmsExpanded] = useState(false);

  useEffect(() => {
    loadGolfers();
  }, [loadGolfers]);

  const executeClearAllData = async () => {
    try {
      await database.write(async () => {
        await database.unsafeResetDatabase();
      });

      await AsyncStorage.removeItem('active_round_id');
      await removePreference('active_golfer_id');

      await useGolferStore.getState().ensureDefaultGolfer();
      await useGolferStore.getState().loadGolfers();

      Alert.alert('Success', 'All data has been cleared');
    } catch {
      Alert.alert('Error', 'Failed to clear data');
    }
  };

  const handleClearAllData = async () => {
    // Query data counts for an informative first confirmation
    const roundCount = await database.collections.get<Round>('rounds').query().fetchCount();
    const tournamentCount = await database.collections.get<Tournament>('tournaments').query().fetchCount();

    const dataDescription = [
      roundCount > 0 ? `${roundCount} round${roundCount === 1 ? '' : 's'}` : '',
      tournamentCount > 0 ? `${tournamentCount} tournament${tournamentCount === 1 ? '' : 's'}` : '',
    ].filter(Boolean).join(' and ');

    const details = dataDescription
      ? `This will permanently delete ${dataDescription} and all associated data.`
      : 'This will permanently delete all your golf data.';

    Alert.alert(
      'Clear All Data?',
      details,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'This cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Everything',
                  style: 'destructive',
                  onPress: executeClearAllData,
                },
              ],
            );
          },
        },
      ],
    );
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
            } catch {
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
            <Icon name="people" size={24} color="#2E7D32" />
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
          onPress={() => setSmsExpanded(prev => !prev)}
          accessibilityRole="button"
          accessibilityLabel="Manage SMS contacts"
        >
          <View style={styles.settingInfo}>
            <Icon name="sms" size={24} color="#2E7D32" />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Manage SMS</Text>
              <Text style={styles.settingDescription}>
                Choose contacts to receive round updates
              </Text>
            </View>
          </View>
          <Icon name={smsExpanded ? 'expand-less' : 'expand-more'} size={24} color="#ccc" />
        </TouchableOpacity>

        {smsExpanded && (
          <View style={styles.golferList}>
            {golfers.length === 0 ? (
              <Text style={styles.noGolfersText}>No golfers yet — add golfers above</Text>
            ) : (
              golfers.map(golfer => (
                <TouchableOpacity
                  key={golfer.id}
                  style={styles.golferRow}
                  onPress={() => navigation.navigate('GolferContacts', { golferId: golfer.id, golferName: golfer.name })}
                  accessibilityRole="button"
                  accessibilityLabel={`Manage SMS contacts for ${golfer.name}`}
                >
                  <GolferAvatar name={golfer.name} color={golfer.color} emoji={golfer.emoji} avatarUri={golfer.avatarUri} size={32} />
                  <Text style={styles.golferRowName}>{golfer.name}</Text>
                  <Icon name="chevron-right" size={20} color="#ccc" />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        <TouchableOpacity
          style={styles.settingItem}
          onPress={handleReplayOnboarding}
          accessibilityRole="button"
          accessibilityLabel="Replay tutorial"
        >
          <View style={styles.settingInfo}>
            <Icon name="help-outline" size={24} color="#2E7D32" />
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
  golferList: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    backgroundColor: '#fafafa',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  golferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  golferRowName: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  noGolfersText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    paddingVertical: 12,
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

