import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DatabaseService from '../services/database';
import { Contact } from '../types';

const ContactsScreen = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [defaultRecipientId, setDefaultRecipientId] = useState<string | null>(null);

  useEffect(() => {
    loadContacts();
    loadDefaultRecipient();
  }, []);

  const loadContacts = async () => {
    try {
      const contactsList = await DatabaseService.getContacts();
      setContacts(contactsList);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const loadDefaultRecipient = async () => {
    try {
      const defaultContact = await DatabaseService.getDefaultSMSRecipient();
      setDefaultRecipientId(defaultContact?.id || null);
    } catch (error) {
      console.error('Error loading default recipient:', error);
    }
  };

  const setAsDefaultRecipient = async (contactId: string) => {
    try {
      if (defaultRecipientId === contactId) {
        // If already default, remove it
        await DatabaseService.setDefaultSMSRecipient(null);
        setDefaultRecipientId(null);
        Alert.alert('Success', 'Default recipient removed');
      } else {
        // Set as new default
        await DatabaseService.setDefaultSMSRecipient(contactId);
        setDefaultRecipientId(contactId);
        const contact = contacts.find(c => c.id === contactId);
        Alert.alert('Success', `${contact?.name} set as default SMS recipient`);
      }
    } catch (error) {
      console.error('Error setting default recipient:', error);
      Alert.alert('Error', 'Failed to set default recipient');
    }
  };

  const openAddModal = () => {
    setEditingContact(null);
    setName('');
    setPhoneNumber('');
    setModalVisible(true);
  };

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setName(contact.name);
    setPhoneNumber(contact.phoneNumber);
    setModalVisible(true);
  };

  const saveContact = async () => {
    if (!name.trim() || !phoneNumber.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Basic phone number validation
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(phoneNumber)) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    try {
      const contact: Contact = {
        id: editingContact?.id || Date.now().toString(),
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        isActive: true,
      };

      await DatabaseService.saveContact(contact);
      setModalVisible(false);
      loadContacts();
      
      Alert.alert(
        'Success',
        editingContact ? 'Contact updated successfully' : 'Contact added successfully'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save contact');
      console.error('Save contact error:', error);
    }
  };

  const deleteContact = (contact: Contact) => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to delete ${contact.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteContact(contact.id);
              loadContacts();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete contact');
              console.error('Delete contact error:', error);
            }
          },
        },
      ]
    );
  };

  const renderContact = ({ item }: { item: Contact }) => (
    <View style={[styles.contactCard, defaultRecipientId === item.id && styles.defaultContactCard]}>
      <View style={styles.contactInfo}>
        <View style={styles.contactIcon}>
          <Icon name="person" size={24} color={defaultRecipientId === item.id ? "#2196F3" : "#4CAF50"} />
          {defaultRecipientId === item.id && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>DEFAULT</Text>
            </View>
          )}
        </View>
        <View style={styles.contactDetails}>
          <Text style={styles.contactName}>{item.name}</Text>
          <Text style={styles.contactPhone}>{item.phoneNumber}</Text>
        </View>
      </View>
      <View style={styles.contactActions}>
        <TouchableOpacity
          style={[styles.actionButton, defaultRecipientId === item.id && styles.defaultButton]}
          onPress={() => setAsDefaultRecipient(item.id)}
        >
          <Icon 
            name={defaultRecipientId === item.id ? "star" : "star-border"} 
            size={20} 
            color={defaultRecipientId === item.id ? "#FFD700" : "#666"} 
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openEditModal(item)}
        >
          <Icon name="edit" size={20} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => deleteContact(item)}
        >
          <Icon name="delete" size={20} color="#F44336" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <View style={styles.header}>
        <Text style={styles.title}>SMS Recipients</Text>
        <Text style={styles.subtitle}>
          These contacts will receive your round summaries
        </Text>
        {defaultRecipientId && (
          <Text style={styles.defaultInfo}>
            ⭐ Default recipient auto-selected for quick sharing
          </Text>
        )}
      </View>

      {contacts.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="people" size={64} color="#ccc" />
          <Text style={styles.emptyStateText}>No contacts added yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Add contacts to share your golf rounds via SMS
          </Text>
          <TouchableOpacity style={styles.addFirstButton} onPress={openAddModal}>
            <Icon name="add" size={24} color="#fff" />
            <Text style={styles.addFirstButtonText}>Add First Contact</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={contacts}
          renderItem={renderContact}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {contacts.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={openAddModal}>
          <Icon name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Add/Edit Contact Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingContact ? 'Edit Contact' : 'Add Contact'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+1 (555) 123-4567"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={saveContact}
                >
                  <Icon name="check" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 5,
  },
  listContainer: {
    padding: 15,
  },
  contactCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  defaultContactCard: {
    borderWidth: 2,
    borderColor: '#2196F3',
    backgroundColor: '#F3F9FF',
  },
  contactIcon: {
    position: 'relative',
  },
  defaultBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#2196F3',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  defaultButton: {
    backgroundColor: '#FFF8DC',
    borderRadius: 20,
  },
  defaultInfo: {
    fontSize: 12,
    color: '#2196F3',
    marginTop: 4,
    fontStyle: 'italic',
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  contactPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  addFirstButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalForm: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default ContactsScreen;
