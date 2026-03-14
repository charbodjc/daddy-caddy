import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { database } from '../database/watermelon/database';
import Round from '../database/watermelon/models/Round';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ErrorScreen } from '../components/common/ErrorScreen';
import { Button } from '../components/common/Button';
import Icon from 'react-native-vector-icons/MaterialIcons';
// FontAwesome5 available for future use
import { format } from 'date-fns';
import { formatScoreVsPar, calculateScoreBreakdown } from '../utils/scoreCalculations';

interface RouteParams {
  roundId: string;
}

const RoundSummaryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { roundId } = (route.params as RouteParams) || {};
  
  const [round, setRound] = useState<Round | null>(null);
  const [holes, setHoles] = useState<Array<{ strokes: number; par: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    loadRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadRound depends on roundId
  }, [roundId]);
  
  const loadRound = async () => {
    if (!roundId) return;
    
    setLoading(true);
    try {
      const roundData = await database.collections.get<Round>('rounds').find(roundId);
      const holesData = await roundData.holes.fetch();
      
      setRound(roundData);
      setHoles(holesData);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleShare = useCallback(async () => {
    if (!round) return;

    const completedHoles = holes.filter(h => h.strokes > 0);
    const totalPar = completedHoles.reduce((sum, h) => sum + h.par, 0);
    const totalStrokes = round.totalScore || 0;
    const toPar = totalStrokes - totalPar;
    const scoreDisplay = formatScoreVsPar(toPar);

    const message = `
🏌️ Golf Round Summary

📍 ${round.courseName}
📅 ${format(round.date, 'EEEE, MMM d, yyyy')}
${round.tournamentName ? `🏆 ${round.tournamentName}\n` : ''}
⛳ Score: ${totalStrokes} (${scoreDisplay})
${round.totalPutts ? `🎯 Putts: ${round.totalPutts}\n` : ''}${round.fairwaysHit !== undefined ? `🎯 Fairways: ${round.fairwaysHit}/14\n` : ''}${round.greensInRegulation !== undefined ? `🟢 GIR: ${round.greensInRegulation}/18\n` : ''}
Played with Daddy Caddy ⛳
    `.trim();

    try {
      await Share.share({ message });
    } catch (error) {
      console.error('Share failed:', error);
    }
  }, [round, holes]);

  const completedHoles = useMemo(() => holes.filter(h => h.strokes > 0), [holes]);
  const totalPar = useMemo(() => completedHoles.reduce((sum, h) => sum + h.par, 0), [completedHoles]);
  const breakdown = useMemo(() => {
    const result = calculateScoreBreakdown(completedHoles);
    return {
      eagles: result.eagles,
      birdies: result.birdies,
      pars: result.pars,
      bogeys: result.bogeys,
      doubles: result.doublePlus,
    };
  }, [completedHoles]);

  if (loading) {
    return <LoadingScreen message="Loading round summary..." />;
  }

  if (error || !round) {
    return <ErrorScreen error={error || new Error('Round not found')} onRetry={loadRound} />;
  }

  const totalStrokes = round.totalScore || 0;
  const toPar = totalStrokes - totalPar;
  const scoreDisplay = formatScoreVsPar(toPar);
  
  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Round Summary</Text>
          <Text style={styles.headerSubtitle}>{round.courseName}</Text>
        </View>

        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Share round"
          accessibilityRole="button"
        >
          <Icon name="share" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {/* Score Card */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreMain}>
          <Text style={styles.scoreLabel}>Total Score</Text>
          <Text style={styles.scoreValue}>{totalStrokes}</Text>
          <Text style={styles.scoreToPar}>{scoreDisplay}</Text>
        </View>
        
        <View style={styles.scoreDivider} />
        
        <View style={styles.scoreDetails}>
          <ScoreDetailItem label="Holes Played" value={completedHoles.length} />
          <ScoreDetailItem label="Total Par" value={totalPar} />
          {round.totalPutts && <ScoreDetailItem label="Putts" value={round.totalPutts} />}
        </View>
      </View>
      
      {/* Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        
        <View style={styles.statsGrid}>
          {round.fairwaysHit !== undefined && (
            <StatItem
              icon={<Icon name="flag" size={20} color="#4CAF50" />}
              label="Fairways Hit"
              value={`${round.fairwaysHit}/14`}
              percentage={Math.round((round.fairwaysHit / 14) * 100)}
            />
          )}
          
          {round.greensInRegulation !== undefined && (
            <StatItem
              icon={<Icon name="adjust" size={20} color="#4CAF50" />}
              label="Greens in Regulation"
              value={`${round.greensInRegulation}/18`}
              percentage={Math.round((round.greensInRegulation / 18) * 100)}
            />
          )}
        </View>
      </View>
      
      {/* Scoring Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Scoring Breakdown</Text>
        
        <View style={styles.breakdownList}>
          {breakdown.eagles > 0 && (
            <BreakdownItem emoji="🦅" label="Eagles or Better" value={breakdown.eagles} />
          )}
          {breakdown.birdies > 0 && (
            <BreakdownItem emoji="🐦" label="Birdies" value={breakdown.birdies} />
          )}
          <BreakdownItem emoji="✅" label="Pars" value={breakdown.pars} />
          <BreakdownItem emoji="😐" label="Bogeys" value={breakdown.bogeys} />
          {breakdown.doubles > 0 && (
            <BreakdownItem emoji="😔" label="Double Bogey+" value={breakdown.doubles} />
          )}
        </View>
      </View>
      
      {/* AI Analysis */}
      {round.aiAnalysis && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Analysis</Text>
          <View style={styles.aiCard}>
            <Icon name="psychology" size={24} color="#4CAF50" style={styles.aiIcon} />
            <Text style={styles.aiText}>{round.aiAnalysis}</Text>
          </View>
        </View>
      )}
      
      {/* Actions */}
      <View style={styles.actions}>
        <Button title="Share Round" onPress={handleShare} style={styles.actionButton} />
      </View>
    </ScrollView>
  );
};

// Helper Components
const ScoreDetailItem: React.FC<{ label: string; value: number }> = React.memo(({ label, value }) => (
  <View style={styles.detailItem}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
));

const StatItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  percentage: number;
}> = React.memo(({ icon, label, value, percentage }) => (
  <View style={styles.statItem}>
    <View style={styles.statHeader}>
      {icon}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statPercentage}>{percentage}%</Text>
  </View>
));

const BreakdownItem: React.FC<{
  emoji: string;
  label: string;
  value: number;
}> = React.memo(({ emoji, label, value }) => (
  <View style={styles.breakdownItem}>
    <Text style={styles.breakdownEmoji}>{emoji}</Text>
    <Text style={styles.breakdownLabel}>{label}</Text>
    <Text style={styles.breakdownValue}>{value}</Text>
  </View>
));

ScoreDetailItem.displayName = 'ScoreDetailItem';
StatItem.displayName = 'StatItem';
BreakdownItem.displayName = 'BreakdownItem';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  shareButton: {
    padding: 5,
  },
  scoreCard: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreMain: {
    flex: 1,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
  },
  scoreToPar: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 4,
  },
  scoreDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 20,
  },
  scoreDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    marginTop: 15,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statPercentage: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  breakdownList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  breakdownEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  breakdownLabel: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  breakdownValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  aiCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  aiIcon: {
    marginRight: 15,
    marginTop: 2,
  },
  aiText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  actions: {
    padding: 15,
    paddingBottom: 30,
  },
  actionButton: {
    marginBottom: 12,
  },
});

export default RoundSummaryScreen;

