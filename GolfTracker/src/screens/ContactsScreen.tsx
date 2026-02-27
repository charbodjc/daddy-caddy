import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList, ActivityIndicator, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import * as Contacts from 'expo-contacts';
import DatabaseService from '../services/database';

interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
}

const ContactsScreen = ({ navigation }: { navigation: { goBack: () => void } }) => {
  const [phoneContacts, setPhoneContacts] = useState<Contact[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasPermission, setHasPermission] = useState(false);

  // Load saved group and contacts on mount
  useEffect(() => {
    loadSavedGroup();
    loadPhoneContacts();
  }, []);

  // Refresh when screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadSavedGroup();
      loadPhoneContacts();
    }, [])
  );

  const loadSavedGroup = async () => {
    try {
      // Load group name
      const savedName = await DatabaseService.getPreference('default_sms_group_name');
      if (savedName) {
        setGroupName(savedName);
      }
      
      // Load which contacts are in the group
      const raw = await DatabaseService.getPreference('default_sms_group');
      if (raw) {
        try {
          // Parse JSON format
          const parsedContacts = JSON.parse(raw);
          if (Array.isArray(parsedContacts)) {
            // Extract IDs of selected contacts
            const ids = new Set(parsedContacts.map((c: Contact) => c.id));
            setSelectedContactIds(ids);
            console.log(`📱 Loaded ${ids.size} contacts in default group`);
          }
        } catch {
          // Legacy format - clear it out since we can't match to phone contacts
          console.log('📱 Clearing legacy format - will need to re-select contacts');
          setSelectedContactIds(new Set());
        }
      }
    } catch (e) {
      console.error('Failed to load saved group:', e);
    }
  };

  const loadPhoneContacts = async () => {
    try {
      setLoading(true);
      
      // Request permission
      const { status } = await Contacts.requestPermissionsAsync();
      setHasPermission(status === 'granted');
      
      if (status !== 'granted') {
        console.log('📱 Contacts permission not granted');
        setLoading(false);
        return;
      }

      // Get all contacts with phone numbers from device
      console.log('📱 Loading all contacts from device...');
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });

      // Filter and prefer mobile numbers
      const contactsWithPhones = data
        .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
        .map(contact => {
          // Prefer mobile/cell numbers
          const mobileNumber = contact.phoneNumbers?.find(
            phone => phone.label?.toLowerCase().includes('mobile') || 
                     phone.label?.toLowerCase().includes('cell') ||
                     phone.label?.toLowerCase().includes('iphone')
          );
          
          const phoneNumber = mobileNumber?.number || contact.phoneNumbers?.[0]?.number || '';
          
          return {
            id: contact.id,
            name: contact.name || 'Unknown',
            phoneNumber: phoneNumber,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      setPhoneContacts(contactsWithPhones);
      console.log(`📱 Loaded ${contactsWithPhones.length} SMS-capable contacts`);
    } catch (e) {
      console.error('Failed to load phone contacts:', e);
      Alert.alert('Error', 'Failed to load contacts from your phone');
    } finally {
      setLoading(false);
    }
  };

  const toggleContact = (contactId: string) => {
    setSelectedContactIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    const filtered = getFilteredContacts();
    setSelectedContactIds(new Set(filtered.map(c => c.id)));
  };

  const clearAll = () => {
    setSelectedContactIds(new Set());
  };

  const getFilteredContacts = () => {
    if (!searchQuery) return phoneContacts;
    
    const query = searchQuery.toLowerCase();
    return phoneContacts.filter(contact =>
      contact.name.toLowerCase().includes(query) ||
      contact.phoneNumber.includes(searchQuery)
    );
  };

  const save = async () => {
    try {
      if (selectedContactIds.size === 0) {
        Alert.alert('No Contacts', 'Please select at least one contact');
        return;
      }

      // Get selected contact objects
      const selectedContacts = phoneContacts.filter(c => selectedContactIds.has(c.id));
      
      // Save contacts as JSON array with names and phone numbers
      const contactsJson = JSON.stringify(selectedContacts);
      
      await DatabaseService.setPreference('default_sms_group', contactsJson);
      await DatabaseService.setPreference('default_sms_group_name', groupName.trim() || 'your text group');
      
      const groupLabel = groupName.trim() || 'your text group';
      const contactNames = selectedContacts.map(c => c.name).join(', ');
      console.log(`💾 Saved ${selectedContacts.length} contacts to "${groupLabel}": ${contactNames}`);
      Alert.alert('Saved', `Default SMS group "${groupLabel}" updated with ${selectedContacts.length} contact${selectedContacts.length !== 1 ? 's' : ''}`);
    } catch (e) {
      console.error('Failed to save contacts:', e);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const requestPermission = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status === 'granted') {
      setHasPermission(true);
      await loadPhoneContacts();
    } else {
      Alert.alert(
        'Permission Required',
        'Please grant contacts permission in your device Settings to manage your SMS group.',
        [{ text: 'OK' }]
      );
    }
  };

  const headerWithBack = (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="Go back to Settings"
      >
        <Icon name="arrow-left" size={18} color="#fff" />
        <Text style={styles.backButtonText}>Settings</Text>
      </TouchableOpacity>
      <Text style={styles.headerText}>Default SMS Group</Text>
      <Text style={styles.headerSubtext}>
        Select SMS-capable contacts from your phone
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {headerWithBack}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        {headerWithBack}
        <View style={styles.permissionContainer}>
          <Icon name="address-book" size={64} color="#ddd" />
          <Text style={styles.permissionTitle}>Contacts Access Required</Text>
          <Text style={styles.permissionText}>
            We need access to your contacts to create your SMS group
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Icon name="unlock" size={18} color="#fff" />
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const filteredContacts = getFilteredContacts();

  return (
    <View style={styles.container}>
      {/* Header */}
      {headerWithBack}

      {/* Group Name */}
      <View style={styles.groupNameCard}>
        <TextInput
          style={styles.groupNameInput}
          placeholder="Group Name (e.g., Golf Buddies)"
          placeholderTextColor="#999"
          value={groupName}
          onChangeText={setGroupName}
          maxLength={30}
        />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={16} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="times-circle" size={16} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <Text style={styles.countText}>
          {selectedContactIds.size} of {phoneContacts.length} selected
        </Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={selectAll} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Select All</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clearAll} style={styles.actionButton}>
            <Text style={[styles.actionButtonText, styles.clearText]}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Contact List */}
      <FlatList
        data={filteredContacts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isSelected = selectedContactIds.has(item.id);
          return (
            <TouchableOpacity
              style={[styles.contactRow, isSelected && styles.contactRowSelected]}
              onPress={() => toggleContact(item.id)}
            >
              <View style={styles.contactContent}>
                <Icon name="user" size={16} color={isSelected ? '#4CAF50' : '#666'} />
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{item.name}</Text>
                  <Text style={styles.contactPhone}>{item.phoneNumber}</Text>
                </View>
              </View>
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && <Icon name="check" size={14} color="#fff" />}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="address-book" size={48} color="#ddd" />
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No contacts found' : 'No SMS-capable contacts'}
            </Text>
            {searchQuery && (
              <Text style={styles.emptyStateSubtext}>Try a different search term</Text>
            )}
          </View>
        }
      />

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, selectedContactIds.size === 0 && styles.saveButtonDisabled]}
          onPress={save}
          disabled={selectedContactIds.size === 0}
        >
          <Icon name="save" size={18} color="#fff" />
          <Text style={styles.saveButtonText}>
            Save Group ({selectedContactIds.size} contacts)
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    minHeight: 44,
    paddingRight: 16,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    paddingTop: 60,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  groupNameCard: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  groupNameInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ddd',
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    color: '#999',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 4,
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
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ContactsScreen;

