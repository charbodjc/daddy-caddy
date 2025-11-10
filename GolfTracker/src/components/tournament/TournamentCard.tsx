import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Tournament from '../../database/watermelon/models/Tournament';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { format } from 'date-fns';

interface TournamentCardProps {
  tournament: Tournament;
  onPress: () => void;
  roundCount?: number;
}

export const TournamentCard: React.FC<TournamentCardProps> = React.memo(({
  tournament,
  onPress,
  roundCount = 0,
}) => {
  const dateRange = `${format(tournament.startDate, 'MMM d')} - ${format(tournament.endDate, 'MMM d, yyyy')}`;
  
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Icon name="emoji-events" size={28} color="#4CAF50" />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{tournament.name}</Text>
          <Text style={styles.courseName}>{tournament.courseName}</Text>
        </View>
      </View>
      
      <View style={styles.footer}>
        <View style={styles.dateContainer}>
          <Icon name="calendar-today" size={14} color="#666" />
          <Text style={styles.dateText}>{dateRange}</Text>
        </View>
        
        <View style={styles.roundsContainer}>
          <Icon name="golf-course" size={14} color="#666" />
          <Text style={styles.roundsText}>
            {roundCount} {roundCount === 1 ? 'Round' : 'Rounds'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

TournamentCard.displayName = 'TournamentCard';

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f9f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  courseName: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: '#666',
  },
  roundsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roundsText: {
    fontSize: 13,
    color: '#666',
  },
});

