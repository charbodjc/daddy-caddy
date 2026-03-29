import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { Button } from '../components/common/Button';
import { GolferAvatar } from '../components/golfer/GolferAvatar';
import { useGolferStore } from '../stores/golferStore';
import { useTournamentStore } from '../stores/tournamentStore';
import { useDeviceContacts } from '../hooks/useDeviceContacts';
import type { SmsContact } from '../types';
import type Golfer from '../database/watermelon/models/Golfer';
import { EMOJI_OPTIONS, GOLFER_COLORS as COLORS } from '../constants/golferOptions';

interface SetupWizardScreenProps {
  onComplete: () => void;
}

interface ContactRowProps {
  contact: SmsContact;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

const contactKeyExtractor = (item: SmsContact) => item.id;

const ContactRow = React.memo<ContactRowProps>(({ contact, isSelected, onToggle }) => (
  <TouchableOpacity
    style={[styles.contactRow, isSelected && styles.contactRowSelected]}
    onPress={() => onToggle(contact.id)}
    accessibilityRole="checkbox"
    accessibilityLabel={`${contact.name}, ${contact.phoneNumber}`}
    accessibilityState={{ checked: isSelected }}
  >
    <View style={styles.contactContent}>
      <Icon name="person" size={20} color={isSelected ? '#2E7D32' : '#666'} />
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{contact.name}</Text>
        <Text style={styles.contactPhone}>{contact.phoneNumber}</Text>
      </View>
    </View>
    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
      {isSelected && <Icon name="check" size={16} color="#fff" />}
    </View>
  </TouchableOpacity>
));

type Step = 'golfer' | 'contacts' | 'tournament' | 'done';
const STEPS: Step[] = ['golfer', 'contacts', 'tournament', 'done'];

const SetupWizardScreen: React.FC<SetupWizardScreenProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<Step>('golfer');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  // Golfer form state
  const [golferName, setGolferName] = useState('');
  const [golferHandicap, setGolferHandicap] = useState('');
  const [golferColor, setGolferColor] = useState(COLORS[1].hex); // Blue (Green is used by default "Me")
  const [golferEmoji, setGolferEmoji] = useState('');
  const [createdGolfer, setCreatedGolfer] = useState<Golfer | null>(null);

  // Contacts state
  const { contacts: deviceContacts, loading: contactsLoading, hasPermission, accessPrivileges, loadContacts, requestPermission, expandAccess } =
    useDeviceContacts();
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [contactSearch, setContactSearch] = useState('');

  // Tournament form state
  const [tournamentName, setTournamentName] = useState('');
  const [courseName, setCourseName] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [selectedTournamentGolferIds, setSelectedTournamentGolferIds] = useState<string[]>([]);

  // Stores
  const { golfers, createGolfer, updateGolferContacts, loadGolfers } = useGolferStore();
  const { createTournament } = useTournamentStore();

  const stepIndex = STEPS.indexOf(currentStep);

  const goToStep = (step: Step) => {
    setCurrentStep(step);
    // Pre-load contacts when entering contacts step
    if (step === 'contacts') {
      loadContacts();
    }
    // Pre-select all golfers when entering tournament step
    if (step === 'tournament') {
      loadGolfers()
        .then(() => {
          const allIds = useGolferStore.getState().golfers.map((g) => g.id);
          setSelectedTournamentGolferIds(allIds);
        })
        .catch(() => {
          // Golfer list will be empty; user can still create the tournament
        });
    }
  };

  const markStepDone = async (step: Step) => {
    await AsyncStorage.setItem(`setup_wizard_step_${step}`, 'true');
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem('setup_wizard_completed', 'true');
    onComplete();
  };

  // ── Step 1: Create Golfer ──────────────────────────────────────

  const handleCreateGolfer = async () => {
    if (savingRef.current) return;
    if (!golferName.trim()) return;
    if (golferHandicap && isNaN(parseFloat(golferHandicap))) {
      Alert.alert('Invalid Handicap', 'Please enter a valid number');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const parsedHandicap = golferHandicap ? parseFloat(golferHandicap) : undefined;
      const golfer = await createGolfer({
        name: golferName.trim(),
        handicap: parsedHandicap,
        color: golferColor,
        emoji: golferEmoji || undefined,
      });
      setCreatedGolfer(golfer);
      await markStepDone('golfer');
      goToStep('contacts');
    } catch {
      Alert.alert('Error', 'Failed to create golfer. Please try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleSkipGolfer = () => {
    goToStep('contacts');
  };

  // ── Step 2: SMS Contacts ───────────────────────────────────────

  // Determine which golfer gets the contacts:
  // the one just created, or the default "Me" if skipped
  const contactTargetGolfer = createdGolfer ?? golfers.find((g) => g.isDefault) ?? golfers[0];

  const toggleContact = useCallback((contactId: string) => {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }
      return next;
    });
  }, []);

  const filteredContacts = useMemo((): SmsContact[] => {
    if (!contactSearch) return deviceContacts;
    const query = contactSearch.toLowerCase();
    return deviceContacts.filter(
      (c) =>
        c.name.toLowerCase().includes(query) || c.phoneNumber.includes(contactSearch),
    );
  }, [deviceContacts, contactSearch]);

  const handleSaveContacts = async () => {
    if (savingRef.current) return;
    if (!contactTargetGolfer) {
      goToStep('tournament');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const selected = deviceContacts.filter((c) => selectedContactIds.has(c.id));
      await updateGolferContacts(contactTargetGolfer.id, selected);
      await markStepDone('contacts');
      goToStep('tournament');
    } catch {
      Alert.alert('Error', 'Failed to save contacts. Please try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleSkipContacts = () => {
    goToStep('tournament');
  };

  // ── Step 3: Tournament ─────────────────────────────────────────

  const toggleTournamentGolfer = useCallback((golferId: string) => {
    setSelectedTournamentGolferIds((prev) =>
      prev.includes(golferId)
        ? prev.filter((id) => id !== golferId)
        : [...prev, golferId],
    );
  }, []);

  const handleCreateTournament = async () => {
    if (savingRef.current) return;
    if (!tournamentName.trim() || !courseName.trim()) return;
    if (endDate < startDate) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      await createTournament({
        name: tournamentName.trim(),
        courseName: courseName.trim(),
        startDate,
        endDate,
        golferIds: selectedTournamentGolferIds,
      });
      await markStepDone('tournament');
      goToStep('done');
    } catch {
      Alert.alert('Error', 'Failed to create tournament. Please try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleSkipTournament = () => {
    goToStep('done');
  };

  // ── Step Indicator ─────────────────────────────────────────────

  const renderStepIndicator = () => {
    const labels = ['Golfer', 'Contacts', 'Tournament'];
    return (
      <View
        style={styles.stepIndicator}
        accessibilityRole="header"
        accessibilityLabel={`Step ${stepIndex + 1} of ${labels.length}: ${labels[stepIndex]}`}
      >
        {labels.map((label, index) => {
          const isActive = index === stepIndex;
          const isCompleted = index < stepIndex;
          return (
            <View key={label} style={styles.stepDot}>
              <View
                style={[
                  styles.dot,
                  isActive && styles.dotActive,
                  isCompleted && styles.dotCompleted,
                ]}
              >
                {isCompleted ? (
                  <Icon name="check" size={14} color="#fff" />
                ) : (
                  <Text style={[styles.dotText, (isActive || isCompleted) && styles.dotTextActive]}>
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  // ── Render: Golfer Step ────────────────────────────────────────

  const renderGolferStep = () => (
    <KeyboardAvoidingView
      style={styles.stepContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentInner}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={styles.stepHeader}>
          <Icon name="person-add" size={48} color="#2E7D32" />
          <Text style={styles.stepTitle}>Add a Golfer</Text>
          <Text style={styles.stepSubtitle}>
            Add the player you'll be following at the course. You can add more golfers later.
          </Text>
        </View>

        <Text style={styles.fieldLabel}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Player's name"
          value={golferName}
          onChangeText={setGolferName}
          autoCapitalize="words"
          autoFocus
          maxLength={50}
          accessibilityLabel="Golfer name"
        />

        <Text style={styles.fieldLabel}>Handicap (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 14.3"
          value={golferHandicap}
          onChangeText={setGolferHandicap}
          keyboardType="decimal-pad"
          accessibilityLabel="Handicap"
        />

        <Text style={styles.fieldLabel}>Emoji (optional)</Text>
        <View style={styles.emojiGrid}>
          {EMOJI_OPTIONS.map((emoji, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.emojiSwatch,
                golferEmoji === emoji && styles.emojiSwatchSelected,
              ]}
              onPress={() => setGolferEmoji(emoji)}
              accessibilityRole="button"
              accessibilityLabel={emoji || 'No emoji (use initials)'}
              accessibilityState={{ selected: golferEmoji === emoji }}
            >
              <Text style={styles.emojiText}>{emoji || '\u2013'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Color</Text>
        <View style={styles.colorGrid}>
          {COLORS.map(({ hex, name }) => (
            <TouchableOpacity
              key={hex}
              style={[
                styles.colorSwatch,
                { backgroundColor: hex },
                golferColor === hex && styles.colorSwatchSelected,
              ]}
              onPress={() => setGolferColor(hex)}
              accessibilityRole="button"
              accessibilityLabel={name}
              accessibilityState={{ selected: golferColor === hex }}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.stepFooter}>
        <TouchableOpacity onPress={handleSkipGolfer} style={styles.skipButton} accessibilityRole="button" accessibilityLabel="Skip adding a golfer">
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
        <Button
          title="Create & Continue"
          onPress={handleCreateGolfer}
          loading={saving}
          disabled={!golferName.trim()}
          style={styles.continueButton}
        />
      </View>
    </KeyboardAvoidingView>
  );

  // ── Render: Contacts Step ──────────────────────────────────────

  const renderContactsStep = () => {
    const targetName = contactTargetGolfer?.name ?? 'your golfer';

    // Permission not yet checked (still loading)
    if (contactsLoading && hasPermission === null) {
      return (
        <View style={styles.stepContainer}>
          <View style={styles.centeredContent}>
            <ActivityIndicator size="large" color="#2E7D32" />
            <Text style={styles.loadingText}>Loading contacts...</Text>
          </View>
        </View>
      );
    }

    // Permission denied
    if (hasPermission === false) {
      return (
        <View style={styles.stepContainer}>
          <View style={styles.centeredContent}>
            <Icon name="contacts" size={64} color="#ddd" />
            <Text style={styles.stepTitle}>Contacts Access</Text>
            <Text style={styles.stepSubtitle}>
              Grant access to your contacts so you can send score updates via SMS.
            </Text>
            <Button
              title="Grant Permission"
              onPress={requestPermission}
              style={styles.permissionBtn}
            />
          </View>
          <View style={styles.stepFooter}>
            <TouchableOpacity onPress={handleSkipContacts} style={styles.skipButton} accessibilityRole="button" accessibilityLabel="Skip adding contacts">
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <View style={styles.continueButton} />
          </View>
        </View>
      );
    }

    // Permission granted — show contact picker
    return (
      <View style={styles.stepContainer}>
        <View style={[styles.stepHeader, styles.stepHeaderPadded]}>
          <Icon name="sms" size={48} color="#2E7D32" />
          <Text style={styles.stepTitle}>SMS Contacts</Text>
          <Text style={styles.stepSubtitle}>
            Select who receives score updates for {targetName}.
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts..."
            value={contactSearch}
            onChangeText={setContactSearch}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search contacts"
          />
          {contactSearch.length > 0 && (
            <TouchableOpacity
              onPress={() => setContactSearch('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Icon name="close" size={20} color="#767676" />
            </TouchableOpacity>
          )}
        </View>

        {/* Limited access banner */}
        {accessPrivileges === 'limited' && (
          <TouchableOpacity
            style={styles.limitedBanner}
            onPress={expandAccess}
            accessibilityRole="button"
            accessibilityLabel="Not seeing all your contacts? Tap to grant access to more contacts"
          >
            <Icon name="info-outline" size={20} color="#1565C0" />
            <Text style={styles.limitedBannerText}>
              Not seeing all your contacts? Tap here to add more.
            </Text>
            <Icon name="chevron-right" size={20} color="#1565C0" />
          </TouchableOpacity>
        )}

        {/* Selection count */}
        <View style={styles.contactCountBar}>
          <Text style={styles.contactCountText}>
            {selectedContactIds.size} selected
          </Text>
        </View>

        {/* Contact list */}
        {contactsLoading ? (
          <View style={styles.centeredContent}>
            <ActivityIndicator size="large" color="#2E7D32" />
          </View>
        ) : (
          <FlatList
            data={filteredContacts}
            keyExtractor={contactKeyExtractor}
            keyboardDismissMode="on-drag"
            extraData={selectedContactIds}
            renderItem={({ item }) => (
              <ContactRow
                contact={item}
                isSelected={selectedContactIds.has(item.id)}
                onToggle={toggleContact}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyContacts}>
                <Text style={styles.emptyContactsText}>
                  {contactSearch ? 'No contacts match your search' : 'No SMS-capable contacts found'}
                </Text>
              </View>
            }
          />
        )}

        <View style={styles.stepFooter}>
          <TouchableOpacity onPress={handleSkipContacts} style={styles.skipButton} accessibilityRole="button" accessibilityLabel="Skip adding contacts">
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
          <Button
            title={`Save ${selectedContactIds.size} Contact${selectedContactIds.size !== 1 ? 's' : ''}`}
            onPress={handleSaveContacts}
            loading={saving}
            disabled={selectedContactIds.size === 0}
            style={styles.continueButton}
          />
        </View>
      </View>
    );
  };

  // ── Render: Tournament Step ────────────────────────────────────

  const renderTournamentStep = () => (
    <KeyboardAvoidingView
      style={styles.stepContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentInner}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={styles.stepHeader}>
          <Icon name="emoji-events" size={48} color="#FFD700" />
          <Text style={styles.stepTitle}>Create a Tournament</Text>
          <Text style={styles.stepSubtitle}>
            Set up your first tournament to track rounds across competition days.
          </Text>
        </View>

        <Text style={styles.fieldLabel}>Tournament Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Spring Championship"
          value={tournamentName}
          onChangeText={setTournamentName}
          autoCapitalize="words"
          accessibilityLabel="Tournament name"
        />

        <Text style={styles.fieldLabel}>Course Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Pine Valley Golf Club"
          value={courseName}
          onChangeText={setCourseName}
          autoCapitalize="words"
          accessibilityLabel="Course name"
        />

        <Text style={styles.fieldLabel}>Start Date</Text>
        <TouchableOpacity
          style={styles.dateInput}
          onPress={() => setShowStartPicker(true)}
          accessibilityRole="button"
          accessibilityLabel={`Start date: ${format(startDate, 'MMM d, yyyy')}`}
          accessibilityHint="Opens date picker"
        >
          <Icon name="event" size={20} color="#666" />
          <Text style={styles.dateInputText}>
            {format(startDate, 'MMM d, yyyy')}
          </Text>
        </TouchableOpacity>

        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            onChange={(_event, date) => {
              setShowStartPicker(false);
              if (date) setStartDate(date);
            }}
          />
        )}

        <Text style={styles.fieldLabel}>End Date</Text>
        <TouchableOpacity
          style={styles.dateInput}
          onPress={() => setShowEndPicker(true)}
          accessibilityRole="button"
          accessibilityLabel={`End date: ${format(endDate, 'MMM d, yyyy')}`}
          accessibilityHint="Opens date picker"
        >
          <Icon name="event" size={20} color="#666" />
          <Text style={styles.dateInputText}>
            {format(endDate, 'MMM d, yyyy')}
          </Text>
        </TouchableOpacity>

        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            onChange={(_event, date) => {
              setShowEndPicker(false);
              if (date) setEndDate(date);
            }}
          />
        )}

        {/* Golfer selection */}
        <Text style={styles.fieldLabel}>Golfers</Text>
        {golfers.map((golfer) => {
          const isSelected = selectedTournamentGolferIds.includes(golfer.id);
          return (
            <TouchableOpacity
              key={golfer.id}
              style={[styles.golferRow, isSelected && styles.golferRowSelected]}
              onPress={() => toggleTournamentGolfer(golfer.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={`${golfer.name}${golfer.isDefault ? ' (default)' : ''}`}
            >
              <GolferAvatar
                name={golfer.name}
                color={golfer.color}
                emoji={golfer.emoji}
                size={36}
              />
              <Text style={styles.golferRowName}>
                {golfer.name}
                {golfer.isDefault ? ' (default)' : ''}
              </Text>
              <Icon
                name={isSelected ? 'check-box' : 'check-box-outline-blank'}
                size={24}
                color={isSelected ? '#2E7D32' : '#ccc'}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.stepFooter}>
        <TouchableOpacity onPress={handleSkipTournament} style={styles.skipButton} accessibilityRole="button" accessibilityLabel="Skip creating a tournament">
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
        <Button
          title="Create Tournament"
          onPress={handleCreateTournament}
          loading={saving}
          disabled={!tournamentName.trim() || !courseName.trim()}
          style={styles.continueButton}
        />
      </View>
    </KeyboardAvoidingView>
  );

  // ── Render: Done Step ──────────────────────────────────────────

  const renderDoneStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.centeredContent}>
        <View style={styles.doneIconContainer}>
          <Icon name="check-circle" size={80} color="#2E7D32" />
        </View>
        <Text style={styles.doneTitle}>You're All Set!</Text>
        <Text style={styles.doneSubtitle}>
          Everything is ready. Head to the course and start tracking!
        </Text>
      </View>
      <View style={styles.doneFooter}>
        <Button
          title="Start Using Daddy Caddy"
          onPress={handleFinish}
          style={styles.doneButton}
        />
      </View>
    </View>
  );

  // ── Main Render ────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {currentStep !== 'done' && renderStepIndicator()}
      {currentStep === 'golfer' && renderGolferStep()}
      {currentStep === 'contacts' && renderContactsStep()}
      {currentStep === 'tournament' && renderTournamentStep()}
      {currentStep === 'done' && renderDoneStep()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 16,
    gap: 32,
    backgroundColor: '#fff',
  },
  stepDot: {
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotActive: {
    backgroundColor: '#2E7D32',
  },
  dotCompleted: {
    backgroundColor: '#2E7D32',
  },
  dotText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#999',
  },
  dotTextActive: {
    color: '#fff',
  },
  stepLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  stepLabelActive: {
    color: '#2E7D32',
    fontWeight: '700',
  },
  stepContainer: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentInner: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  stepHeader: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 24,
  },
  stepHeaderPadded: {
    paddingHorizontal: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 16,
  },
  stepSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  emojiSwatch: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiSwatchSelected: {
    borderColor: '#2E7D32',
    backgroundColor: '#f0f9f0',
  },
  emojiText: {
    fontSize: 24,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorSwatchSelected: {
    borderColor: '#333',
  },
  stepFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
    gap: 16,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '600',
  },
  continueButton: {
    flex: 1,
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
  permissionBtn: {
    marginTop: 24,
    minWidth: 200,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
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
  limitedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  limitedBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#1565C0',
    fontWeight: '500',
  },
  contactCountBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f9f9f9',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  contactCountText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
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
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  emptyContacts: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyContactsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#767676',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 10,
  },
  dateInputText: {
    fontSize: 16,
    color: '#333',
  },
  golferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 4,
    gap: 12,
  },
  golferRowSelected: {
    backgroundColor: '#f0f9f0',
  },
  golferRowName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  doneIconContainer: {
    marginBottom: 16,
  },
  doneTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  doneSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  doneFooter: {
    padding: 20,
    paddingBottom: 40,
  },
  doneButton: {
    width: '100%',
  },
});

export default SetupWizardScreen;
