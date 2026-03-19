import { useState, useCallback } from 'react';
import * as Contacts from 'expo-contacts';
import { Alert } from 'react-native';
import type { SmsContact } from '../types';

interface UseDeviceContactsResult {
  contacts: SmsContact[];
  loading: boolean;
  hasPermission: boolean | null;
  loadContacts: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
}

export function useDeviceContacts(): UseDeviceContactsResult {
  const [contacts, setContacts] = useState<SmsContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);

      // Check existing permission without prompting — only requestPermission() prompts
      const { status } = await Contacts.getPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);

      if (!granted) {
        setLoading(false);
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });

      const contactsWithPhones: SmsContact[] = data
        .filter(
          (contact) =>
            contact.id &&
            contact.phoneNumbers &&
            contact.phoneNumbers.length > 0,
        )
        .map((contact) => {
          const mobileNumber = contact.phoneNumbers?.find(
            (phone) =>
              phone.label?.toLowerCase().includes('mobile') ||
              phone.label?.toLowerCase().includes('cell') ||
              phone.label?.toLowerCase().includes('iphone'),
          );

          const phoneNumber =
            mobileNumber?.number || contact.phoneNumbers?.[0]?.number || '';

          return {
            id: contact.id!,
            name: contact.name || 'Unknown',
            phoneNumber,
          };
        })
        .filter((c) => c.phoneNumber.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name));

      setContacts(contactsWithPhones);
    } catch (e) {
      Alert.alert('Error', 'Failed to load contacts from your phone');
    } finally {
      setLoading(false);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await Contacts.requestPermissionsAsync();
    const granted = status === 'granted';
    setHasPermission(granted);

    if (granted) {
      await loadContacts();
    } else {
      Alert.alert(
        'Permission Required',
        'Please grant contacts permission in your device Settings to manage SMS contacts.',
        [{ text: 'OK' }],
      );
    }

    return granted;
  }, [loadContacts]);

  return { contacts, loading, hasPermission, loadContacts, requestPermission };
}
