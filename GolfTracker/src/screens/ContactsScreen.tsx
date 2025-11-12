import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, FlatList, ActivityIndicator, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import * as Contacts from 'expo-contacts';
import DatabaseService from '../services/database';
import ContactPickerModal from '../components/ContactPickerModal';

interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
}

const ContactsScreen = () => {
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [savedContacts, setSavedContacts] = useState<Contact[]>([]);
  const [groupName, setGroupName] = useState<string>('');
  const [savedGroupName, setSavedGroupName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);

  // Load saved contacts when screen is first mounted
  useEffect(() => {
    loadSavedContacts();
  }, []);

  // Refresh contacts when screen gains focus (e.g., after clearing data)
  useFocusEffect(
    useCallback(() => {
      loadSavedContacts();
    }, [])
  );

  const loadSavedContacts = async () => {
    try {
      const raw = await DatabaseService.getPreference('default_sms_group');
      if (raw) {
        try {
          // Try to parse as JSON first (new format with names and numbers)
          const parsedContacts = JSON.parse(raw);
          if (Array.isArray(parsedContacts)) {
            setSelectedContacts(parsedContacts);
            setSavedContacts(parsedContacts);
          }
        } catch {
          // Fallback: Parse old format (comma-separated phone numbers only)
          console.log('📱 Migrating from old format (numbers only) to new format (names + numbers)');
          const phoneNumbers = raw.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
          const contacts = phoneNumbers.map((phone, index) => ({
            id: `saved-${index}`,
            name: phone, // Display the number as the name for old data
            phoneNumber: phone,
          }));
          setSelectedContacts(contacts);
          setSavedContacts(contacts);
        }
      }
      
      // Load saved group name
      const savedName = await DatabaseService.getPreference('default_sms_group_name');
      if (savedName) {
        setGroupName(savedName);
        setSavedGroupName(savedName);
      }
    } catch (e) {
      console.error('Failed to load contacts:', e);
    } finally {
      setLoading(false);
    }
  };

  const pickContacts = async () => {
    try {
      // Always clear cached contacts to ensure we fetch fresh data from device
      setAvailableContacts([]);
      
      // Request permission
      const { status } = await Contacts.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant contacts permission in Settings to select contacts.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Get all contacts with phone numbers - this ALWAYS fetches fresh from device
      console.log('📱 Fetching fresh contacts from device...');
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });
      console.log(`📱 Found ${data.length} total contacts on device`);

      if (data.length === 0) {
        Alert.alert('No Contacts', 'No contacts with phone numbers found');
        return;
      }

      // Filter contacts that have phone numbers and prefer mobile numbers
      const contactsWithPhones = data
        .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
        .map(contact => {
          // Prefer mobile/cell numbers, fallback to first available
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

      console.log(`📱 Filtered to ${contactsWithPhones.length} contacts with phone numbers (preferring mobile)`);

      // Store contacts and show picker modal
      setAvailableContacts(contactsWithPhones);
      setShowPicker(true);
    } catch (e) {
      Alert.alert('Error', 'Failed to access contacts');
      console.error('Contact picker error:', e);
    }
  };

  const handleContactsSelected = (selectedIds: Set<string>) => {
    const newContacts = availableContacts.filter(c => selectedIds.has(c.id));
    setSelectedContacts(newContacts);
  };

  const removeContact = (contactId: string) => {
    setSelectedContacts(prev => prev.filter(c => c.id !== contactId));
  };

  const save = async () => {
    try {
      if (selectedContacts.length === 0) {
        Alert.alert('No Contacts', 'Please add at least one contact');
        return;
      }

      // Save contacts as JSON array with names and phone numbers
      const contactsJson = JSON.stringify(selectedContacts);
      
      await DatabaseService.setPreference('default_sms_group', contactsJson);
      await DatabaseService.setPreference('default_sms_group_name', groupName.trim() || 'your text group');
      setSavedContacts([...selectedContacts]);
      setSavedGroupName(groupName.trim() || 'your text group');
      
      const groupLabel = groupName.trim() || 'your text group';
      const contactNames = selectedContacts.map(c => c.name).join(', ');
      console.log(`💾 Saved contacts: ${contactNames}`);
      Alert.alert('Saved', `Default SMS group "${groupLabel}" updated with ${selectedContacts.length} contact${selectedContacts.length !== 1 ? 's' : ''}`);
    } catch (e) {
      console.error('Failed to save contacts:', e);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const clearAll = () => {
    Alert.alert(
      'Clear Default Group',
      'Are you sure you want to clear all contacts?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setSelectedContacts([]);
            setGroupName('');
            await DatabaseService.setPreference('default_sms_group', '');
            await DatabaseService.setPreference('default_sms_group_name', '');
            setSavedContacts([]);
            setSavedGroupName('');
            Alert.alert('Cleared', 'Default SMS group cleared');
          }
        }
      ]
    );
  };

  const hasChanges = () => {
    if (selectedContacts.length !== savedContacts.length) return true;
    if (groupName.trim() !== savedGroupName) return true;
    return !selectedContacts.every((contact, index) => 
      contact.phoneNumber === savedContacts[index]?.phoneNumber
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={styles.headerText}>Default SMS Group</Text>
            <Text style={styles.headerSubtext}>
              Select contacts to receive your golf updates
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="tag" size={18} color="#4CAF50" />
              <Text style={styles.cardTitle}>Group Name</Text>
            </View>
            <TextInput
              style={styles.groupNameInput}
              placeholder="e.g., Golf Buddies, Family, etc."
              placeholderTextColor="#999"
              value={groupName}
              onChangeText={setGroupName}
              maxLength={30}
            />
            <Text style={styles.groupNameHint}>
              This name will appear in toast notifications when messages are sent
            </Text>
          </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="users" size={18} color="#4CAF50" />
            <Text style={styles.cardTitle}>Selected Contacts</Text>
            <Text style={styles.contactCount}>({selectedContacts.length})</Text>
          </View>
          
          {selectedContacts.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="user-plus" size={48} color="#ddd" />
              <Text style={styles.emptyStateText}>No contacts selected</Text>
              <Text style={styles.emptyStateSubtext}>
                Tap "Add from Contacts" to choose recipients
              </Text>
            </View>
          ) : (
            <FlatList
              data={selectedContacts}
              scrollEnabled={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.contactItem}>
                  <Icon name="user" size={16} color="#666" />
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{item.name}</Text>
                    <Text style={styles.contactPhone}>{item.phoneNumber}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeContact(item.id)}
                    style={styles.removeButton}
                  >
                    <Icon name="times" size={16} color="#f44336" />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}

          <View style={styles.buttonGroup}>
            <TouchableOpacity 
              style={styles.addButton} 
              onPress={pickContacts}
            >
              <Icon name="user-plus" size={16} color="#4CAF50" />
              <Text style={styles.addButtonText}>Add from Contacts</Text>
            </TouchableOpacity>

            {selectedContacts.length > 0 && (
              <TouchableOpacity 
                style={styles.clearButton} 
                onPress={clearAll}
              >
                <Icon name="trash" size={16} color="#f44336" />
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {hasChanges() && (
            <TouchableOpacity style={styles.saveButton} onPress={save}>
              <Icon name="save" size={16} color="#fff" />
              <Text style={styles.saveText}>Save Changes</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Icon name="info-circle" size={16} color="#2196F3" />
            <Text style={styles.infoTitle}>How it works</Text>
          </View>
          <Text style={styles.infoText}>
            • All messages sent from the app will go to these contacts
          </Text>
          <Text style={styles.infoText}>
            • You can add or remove contacts anytime
          </Text>
          <Text style={styles.infoText}>
            • Changes take effect immediately after saving
          </Text>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ContactPickerModal
        visible={showPicker}
        contacts={availableContacts}
        selectedContactIds={new Set(selectedContacts.map(c => c.id))}
        onClose={() => setShowPicker(false)}
        onSave={handleContactsSelected}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
  },
  content: { 
    padding: 16,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: { 
    marginBottom: 16,
    paddingTop: 20,
  },
  headerText: {
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 4,
  },
  headerSubtext: {
    fontSize: 14,
    color: '#666',
  },
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#333',
    flex: 1,
  },
  contactCount: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
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
    textAlign: 'center',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
    gap: 10,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 13,
    color: '#666',
  },
  removeButton: {
    padding: 8,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4CAF50',
    backgroundColor: '#fff',
  },
  addButtonText: {
    color: '#4CAF50',
    fontSize: 15,
    fontWeight: '600',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#f44336',
    backgroundColor: '#fff',
  },
  clearButtonText: {
    color: '#f44336',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: { 
    backgroundColor: '#4CAF50', 
    padding: 14, 
    borderRadius: 8, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 8,
    marginTop: 12,
  },
  saveText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1976D2',
  },
  infoText: {
    fontSize: 13,
    color: '#1565C0',
    marginBottom: 4,
    lineHeight: 18,
  },
  groupNameInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  groupNameHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default ContactsScreen;
