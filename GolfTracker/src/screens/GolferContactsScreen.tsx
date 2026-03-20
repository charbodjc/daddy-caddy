import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { useDeviceContacts } from '../hooks/useDeviceContacts';
import { useGolferStore, parseGolferContacts } from '../stores/golferStore';
import type { SmsContact } from '../types';

type GolferContactsRouteParams = {
  GolferContacts: { golferId: string; golferName: string };
};

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()]+/g, '');
}

const GolferContactsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<GolferContactsRouteParams, 'GolferContacts'>>();
  const { golferId, golferName } = route.params;

  const { contacts: deviceContacts, loading, hasPermission, loadContacts, requestPermission } =
    useDeviceContacts();
  const { golfers, updateGolferContacts } = useGolferStore();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Load device contacts and pre-select golfer's saved contacts
  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // Once device contacts are loaded, match saved contacts to device contact IDs
  useEffect(() => {
    if (loading || initialLoaded || deviceContacts.length === 0) return;

    const golfer = golfers.find((g) => g.id === golferId);
    const savedContacts = parseGolferContacts(golfer?.smsContactsRaw);

    if (savedContacts.length > 0) {
      const ids = new Set<string>();
      for (const saved of savedContacts) {
        // Try exact ID match first
        const idMatch = deviceContacts.find((dc) => dc.id === saved.id);
        if (idMatch) {
          ids.add(idMatch.id);
          continue;
        }
        // Fallback: match by normalized phone number
        const normalizedSaved = normalizePhone(saved.phoneNumber);
        const phoneMatch = deviceContacts.find(
          (dc) => normalizePhone(dc.phoneNumber) === normalizedSaved,
        );
        if (phoneMatch) {
          ids.add(phoneMatch.id);
        }
      }
      setSelectedIds(ids);
    }
    setInitialLoaded(true);
  }, [loading, deviceContacts, golfers, golferId, initialLoaded]);

  const toggleContact = useCallback((contactId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }
      return next;
    });
  }, []);

  const selectAll = () => {
    const filtered = getFilteredContacts();
    setSelectedIds((prev) => new Set([...prev, ...filtered.map((c) => c.id)]));
  };

  const clearAll = () => {
    setSelectedIds(new Set());
  };

  const getFilteredContacts = (): SmsContact[] => {
    if (!searchQuery) return deviceContacts;
    const query = searchQuery.toLowerCase();
    return deviceContacts.filter(
      (c) =>
        c.name.toLowerCase().includes(query) || c.phoneNumber.includes(searchQuery),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const selected = deviceContacts.filter((c) => selectedIds.has(c.id));
      await updateGolferContacts(golferId, selected);
      Alert.alert(
        'Saved',
        `${selected.length} SMS contact${selected.length !== 1 ? 's' : ''} saved for ${golferName}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch {
      Alert.alert('Error', 'Failed to save contacts');
    } finally {
      setSaving(false);
    }
  };

  const filteredContacts = getFilteredContacts();

  const header = (
    <ScreenHeader
      title="SMS Contacts"
      subtitle={`Select who receives updates for ${golferName}`}
      leftAction="back"
    />
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.centeredContent}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.centeredContent}>
          <Icon name="contacts" size={64} color="#ddd" />
          <Text style={styles.permissionTitle}>Contacts Access Required</Text>
          <Text style={styles.permissionText}>
            We need access to your contacts to set up SMS notifications
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
            accessibilityRole="button"
            accessibilityLabel="Grant contacts permission"
          >
            <Icon name="lock-open" size={18} color="#fff" />
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {header}

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search contacts"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Clear search"
            accessibilityRole="button"
          >
            <Icon name="close" size={20} color="#767676" />
          </TouchableOpacity>
        )}
      </View>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <Text style={styles.countText}>
          {selectedIds.size} of {deviceContacts.length} selected
        </Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            onPress={selectAll}
            style={styles.actionButton}
            accessibilityRole="button"
            accessibilityLabel="Select all contacts"
          >
            <Text style={styles.actionButtonText}>Select All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={clearAll}
            style={styles.actionButton}
            accessibilityRole="button"
            accessibilityLabel="Clear all selections"
          >
            <Text style={[styles.actionButtonText, styles.clearText]}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Contact List */}
      <FlatList
        data={filteredContacts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isSelected = selectedIds.has(item.id);
          return (
            <TouchableOpacity
              style={[styles.contactRow, isSelected && styles.contactRowSelected]}
              onPress={() => toggleContact(item.id)}
              accessibilityRole="checkbox"
              accessibilityLabel={`${item.name}, ${item.phoneNumber}`}
              accessibilityState={{ checked: isSelected }}
            >
              <View style={styles.contactContent}>
                <Icon
                  name="person"
                  size={20}
                  color={isSelected ? '#4CAF50' : '#666'}
                />
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{item.name}</Text>
                  <Text style={styles.contactPhone}>{item.phoneNumber}</Text>
                </View>
              </View>
              <View
                style={[styles.checkbox, isSelected && styles.checkboxSelected]}
              >
                {isSelected && <Icon name="check" size={16} color="#fff" />}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="person-search" size={48} color="#ddd" />
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No contacts match your search' : 'No SMS-capable contacts found'}
            </Text>
          </View>
        }
      />

      {/* Save Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={`Save ${selectedIds.size} contacts for ${golferName}`}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Icon name="save" size={20} color="#fff" />
          )}
          <Text style={styles.saveButtonText}>
            Save ({selectedIds.size} contact{selectedIds.size !== 1 ? 's' : ''})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    minHeight: 48,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  countText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    padding: 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  clearText: {
    color: '#f44336',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    minHeight: 60,
  },
  contactRowSelected: {
    backgroundColor: '#f1f8f4',
  },
  contactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 14,
    color: '#666',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#767676',
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GolferContactsScreen;
