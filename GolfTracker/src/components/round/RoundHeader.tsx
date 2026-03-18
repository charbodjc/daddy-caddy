import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Round from '../../database/watermelon/models/Round';
import { formatScoreVsPar } from '../../utils/scoreCalculations';
import { formatDateShort } from '../../utils/dateFormatting';
import { GolferAvatar } from '../golfer/GolferAvatar';

interface RoundHeaderProps {
  round: Round;
  totalPar?: number;
  golferName?: string;
  golferColor?: string;
}

export const RoundHeader: React.FC<RoundHeaderProps> = React.memo(({ round, totalPar: totalParProp, golferName, golferColor }) => {
  const insets = useSafeAreaInsets();
  const calculateScore = () => {
    if (!round.totalScore) return { strokes: 0, toPar: 0 };

    // Use provided totalPar from actual hole data, fall back to 72 if not available
    const totalPar = totalParProp && totalParProp > 0 ? totalParProp : 72;
    const toPar = round.totalScore - totalPar;

    return {
      strokes: round.totalScore,
      toPar,
    };
  };
  
  const score = calculateScore();
  const scoreDisplay = formatScoreVsPar(score.toPar);
  
  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <View style={styles.courseInfo}>
        {golferName && golferColor && (
          <View style={styles.golferRow}>
            <GolferAvatar name={golferName} color={golferColor} size={24} />
            <Text style={styles.golferText}>{golferName}</Text>
          </View>
        )}
        <Text style={styles.courseName}>{round.courseName}</Text>
        {round.tournamentName && (
          <Text style={styles.tournamentName}>{round.tournamentName}</Text>
        )}
        <Text style={styles.date}>
          {formatDateShort(round.date)}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courseInfo: {
    flex: 1,
  },
  golferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  golferText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
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

