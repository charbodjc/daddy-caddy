import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

interface HoleCardProps {
  holeNumber: number;
  par: number;
  strokes: number;
  onPress: () => void;
  isActive?: boolean;
}

export const HoleCard: React.FC<HoleCardProps> = React.memo(({
  holeNumber,
  par,
  strokes,
  onPress,
  isActive = false,
}) => {
  const score = strokes - par;
  
  const getScoreStyle = () => {
    if (strokes === 0) return styles.scorePending;
    if (score <= -2) return styles.scoreEagle;
    if (score === -1) return styles.scoreBirdie;
    if (score === 0) return styles.scorePar;
    if (score === 1) return styles.scoreBogey;
    return styles.scoreDouble;
  };
  
  const getScoreCircleStyle = () => {
    if (strokes === 0) return styles.circleNone;
    if (score <= -2) return styles.circleEagle;
    if (score === -1) return styles.circleBirdie;
    if (score === 0) return styles.circleNone;
    if (score === 1) return styles.circleSquare;
    return styles.circleSquareFilled;
  };
  
  const getTextColor = () => {
    if (strokes === 0) return '#999';
    if (score === -1) return '#fff';
    if (score >= 2) return '#fff';
    return '#000';
  };
  
  return (
    <TouchableOpacity
      style={[
        styles.card,
        isActive && styles.cardActive,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.holeNumber}>{holeNumber}</Text>
      <View style={[styles.scoreCircle, getScoreCircleStyle()]}>
        {strokes > 0 ? (
          <Text style={[styles.score, { color: getTextColor() }]}>
            {strokes}
          </Text>
        ) : (
          <FontAwesome5 name="golf-ball" size={20} color="#999" />
        )}
      </View>
      <Text style={styles.par}>Par {par}</Text>
    </TouchableOpacity>
  );
});

HoleCard.displayName = 'HoleCard';

const styles = StyleSheet.create({
  card: {
    width: '22%',
    aspectRatio: 1,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  cardActive: {
    borderColor: '#4CAF50',
    borderWidth: 2,
    backgroundColor: '#f0f9f0',
  },
  holeNumber: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  scoreCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleNone: {
    backgroundColor: 'transparent',
  },
  circleEagle: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: '#FFD700',
  },
  circleBirdie: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FF0000',
    backgroundColor: '#FF0000',
  },
  circleSquare: {
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: 'transparent',
  },
  circleSquareFilled: {
    borderRadius: 4,
    backgroundColor: '#000',
  },
  score: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  scorePending: {
    color: '#999',
  },
  scoreEagle: {
    color: '#000',
  },
  scoreBirdie: {
    color: '#fff',
  },
  scorePar: {
    color: '#000',
  },
  scoreBogey: {
    color: '#000',
  },
  scoreDouble: {
    color: '#fff',
  },
  par: {
    fontSize: 11,
    color: '#999',
  },
});

