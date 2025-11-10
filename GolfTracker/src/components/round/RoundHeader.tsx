import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Round from '../../database/watermelon/models/Round';

interface RoundHeaderProps {
  round: Round;
}

export const RoundHeader: React.FC<RoundHeaderProps> = React.memo(({ round }) => {
  const calculateScore = () => {
    if (!round.totalScore) return { strokes: 0, toPar: 0 };
    
    // Calculate total par from holes (assuming 72 for now, should be fetched from holes)
    const totalPar = 72;
    const toPar = round.totalScore - totalPar;
    
    return {
      strokes: round.totalScore,
      toPar,
    };
  };
  
  const score = calculateScore();
  const scoreDisplay = score.toPar > 0 ? `+${score.toPar}` : score.toPar === 0 ? 'E' : `${score.toPar}`;
  
  return (
    <View style={styles.container}>
      <View style={styles.courseInfo}>
        <Text style={styles.courseName}>{round.courseName}</Text>
        {round.tournamentName && (
          <Text style={styles.tournamentName}>{round.tournamentName}</Text>
        )}
        <Text style={styles.date}>
          {round.date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          })}
        </Text>
      </View>
      
      <View style={styles.scoreInfo}>
        <Text style={styles.scoreLabel}>Score</Text>
        <Text style={styles.scoreValue}>
          {score.strokes > 0 ? score.strokes : '--'}
        </Text>
        <Text style={styles.scoreToPar}>{scoreDisplay}</Text>
      </View>
    </View>
  );
});

RoundHeader.displayName = 'RoundHeader';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#4CAF50',
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  tournamentName: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  scoreInfo: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    borderRadius: 12,
    minWidth: 100,
  },
  scoreLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  scoreToPar: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginTop: 2,
  },
});

