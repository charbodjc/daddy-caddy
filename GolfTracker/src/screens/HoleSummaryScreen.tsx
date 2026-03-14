/**
 * HoleSummaryScreen.tsx
 *
 * Post-hole summary screen showing score, shot breakdown, AI analysis,
 * media gallery, and SMS sharing. Uses Zustand + WatermelonDB.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { database } from '../database/watermelon/database';
import Hole from '../database/watermelon/models/Hole';
import Round from '../database/watermelon/models/Round';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ErrorScreen } from '../components/common/ErrorScreen';
import { Button } from '../components/common/Button';
import { Toast, useToast } from '../components/Toast';
import AIHoleAnalysisService from '../services/aiHoleAnalysis';
import SMSService from '../services/sms';
import MediaService from '../services/media';
import { holeToGolfHole } from '../services/adapters';
import { parseShotData, deriveHoleStats, calculateRunningRoundStats, formatRunningStatsForSMS } from '../utils/roundStats';
import { getResultLabel } from '../utils/shotLabels';
import { getScoreColor, getScoreName } from '../utils/scoreColors';
import { SHOT_TYPES, SHOT_RESULTS } from '../types';
import type { MediaItem } from '../types';
import type { ScoringStackParamList } from '../types/navigation';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';

type NavProp = StackNavigationProp<ScoringStackParamList, 'HoleSummary'>;
type RoutePropT = RouteProp<ScoringStackParamList, 'HoleSummary'>;

const aiService = new AIHoleAnalysisService();

function getScoreDisplay(strokes: number, par: number) {
  const diff = strokes - par;
  const name = getScoreName(diff);
  const text = diff <= -2 ? `${name}!` : name;
  return { text, color: getScoreColor(diff) };
}

function shotColor(shot: { type: string; results: string[] }): string {
  if (
    shot.results.includes(SHOT_RESULTS.CENTER) ||
    shot.results.includes(SHOT_RESULTS.GREEN) ||
    shot.results.includes(SHOT_RESULTS.MADE)
  ) return '#4CAF50';
  if (shot.results.includes(SHOT_RESULTS.OB) || shot.results.includes(SHOT_RESULTS.HAZARD)) return '#F44336';
  if (shot.results.includes(SHOT_RESULTS.SAND)) return '#F4B400';
  if (shot.type === SHOT_TYPES.PENALTY) return '#F44336';
  return '#FF9800';
}

function shotIcon(type: string): string {
  if (type === SHOT_TYPES.TEE_SHOT) return 'golf-course';
  if (type === SHOT_TYPES.PENALTY) return 'warning';
  return 'flag';
}

const HoleSummaryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropT>();
  const { holeId, roundId } = route.params || {};
  const { toastConfig, showToast, hideToast } = useToast();

  const [hole, setHole] = useState<Hole | null>(null);
  const [_round, setRound] = useState<Round | null>(null);
  const [totalHoles, setTotalHoles] = useState(18);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [aiSummary, setAiSummary] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [sendingSms, setSendingSms] = useState(false);

  // Load data
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const h = await database.collections.get<Hole>('holes').find(holeId);
        if (!mounted) return;
        setHole(h);
        const r = await database.collections.get<Round>('rounds').find(roundId);
        if (!mounted) return;
        setRound(r);

        const allHoles: Hole[] = await r.holes.fetch();
        if (!mounted) return;
        setTotalHoles(allHoles.length);

        // Load media
        const media = await MediaService.getMediaForHole(roundId, h.holeNumber);
        if (!mounted) return;
        setMediaItems(media);

        // AI analysis
        const golfHole = holeToGolfHole(h);
        setIsAnalyzing(true);
        try {
          const summary = await aiService.analyzeHoleWithMedia(golfHole, media);
          if (!mounted) return;
          setAiSummary(summary);
        } catch {
          if (!mounted) return;
          setAiSummary(aiService.generateBasicSummary(golfHole, media));
        } finally {
          if (mounted) setIsAnalyzing(false);
        }
      } catch (err) {
        if (!mounted) return;
        setError(err as Error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();

    return () => { mounted = false; };
  }, [holeId, roundId]);

  const regenerateAI = useCallback(async () => {
    if (!hole) return;
    setIsAnalyzing(true);
    const golfHole = holeToGolfHole(hole);
    try {
      const summary = await aiService.analyzeHoleWithMedia(golfHole, mediaItems);
      setAiSummary(summary);
    } catch {
      setAiSummary(aiService.generateBasicSummary(golfHole, mediaItems));
    } finally {
      setIsAnalyzing(false);
    }
  }, [hole, mediaItems]);

  const handleSendSMS = useCallback(async () => {
    if (!hole) return;
    setSendingSms(true);
    try {
      const golfHole = holeToGolfHole(hole);
      const mediaCounts = await MediaService.getMediaCount(roundId, hole.holeNumber);
      const runningStats = await calculateRunningRoundStats(roundId);
      const runningText = formatRunningStatsForSMS(runningStats);

      const result = await SMSService.sendHoleSummary(
        golfHole,
        aiSummary,
        mediaCounts,
        undefined,
        runningText,
      );

      if (result.success && result.sent) {
        showToast('Message opened', 'success');
      } else if (!result.success) {
        showToast(result.errors.join(', ') || 'Failed to send', 'error');
      }
    } catch {
      showToast('Failed to send SMS', 'error');
    } finally {
      setSendingSms(false);
    }
  }, [hole, roundId, aiSummary, showToast]);

  const handleNextHole = useCallback(() => {
    navigation.navigate('RoundTracker', { roundId });
  }, [navigation, roundId]);

  const handleFinishRound = useCallback(() => {
    navigation.navigate('RoundSummary', { roundId });
  }, [navigation, roundId]);

  if (loading) return <LoadingScreen message="Loading hole summary..." />;
  if (error || !hole) {
    return <ErrorScreen error={error || new Error('Hole not found')} onRetry={() => navigation.goBack()} />;
  }

  const scoreInfo = getScoreDisplay(hole.strokes, hole.par);
  const shotData = parseShotData(hole.shotData);
  const stats = shotData ? deriveHoleStats(shotData, hole.par) : null;
  const isLastHole = hole.holeNumber >= totalHoles;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll}>
        {/* Score header */}
        <View style={[styles.header, { backgroundColor: scoreInfo.color, paddingTop: insets.top + 10 }]}>
          <Text style={styles.holeNum}>Hole {hole.holeNumber}</Text>
          <Text style={styles.parText}>Par {hole.par}</Text>
          <Text style={styles.scoreValue}>{hole.strokes}</Text>
          <Text style={styles.scoreLabel}>{scoreInfo.text}</Text>
        </View>

        {/* Stats row */}
        {stats && (
          <View style={styles.statsRow}>
            {stats.fairwayHit !== undefined && (
              <View style={styles.statChip}>
                <Icon name="golf-course" size={16} color={stats.fairwayHit ? '#4CAF50' : '#F44336'} />
                <Text style={styles.statChipText}>FW {stats.fairwayHit ? 'Hit' : 'Miss'}</Text>
              </View>
            )}
            <View style={styles.statChip}>
              <Icon name="flag" size={16} color={stats.greenInRegulation ? '#4CAF50' : '#F44336'} />
              <Text style={styles.statChipText}>GIR {stats.greenInRegulation ? 'Yes' : 'No'}</Text>
            </View>
            <View style={styles.statChip}>
              <FontAwesome5 name="golf-ball" size={14} color="#333" />
              <Text style={styles.statChipText}>{stats.puttsCount} Putts</Text>
            </View>
            {stats.firstPuttDistanceFeet !== undefined && (
              <View style={styles.statChip}>
                <Text style={styles.statChipText}>{stats.firstPuttDistanceFeet} ft 1st</Text>
              </View>
            )}
          </View>
        )}

        {/* Shot breakdown */}
        {shotData && shotData.shots.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Shot Breakdown</Text>
            {shotData.shots.map((shot, i) => (
              <View key={i} style={styles.shotRow}>
                <Icon name={shotIcon(shot.type)} size={20} color={shotColor(shot)} />
                <View style={styles.shotInfo}>
                  <Text style={styles.shotType}>{shot.type}</Text>
                  <Text style={styles.shotResult}>
                    {shot.results.map(getResultLabel).join(', ')}
                    {shot.puttDistance ? ` (${shot.puttDistance})` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* AI Summary */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="robot" size={18} color="#4CAF50" />
            <Text style={styles.cardTitle}>AI Summary</Text>
            <TouchableOpacity
              onPress={regenerateAI}
              style={styles.refreshBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Regenerate AI summary"
              accessibilityRole="button"
            >
              <Ionicons name="refresh" size={18} color="#666" />
            </TouchableOpacity>
          </View>
          {isAnalyzing ? (
            <ActivityIndicator size="small" color="#4CAF50" />
          ) : (
            <Text style={styles.aiText}>{aiSummary}</Text>
          )}
        </View>

        {/* Media gallery */}
        {mediaItems.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Captured Media</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.mediaRow}>
                {mediaItems.map((m) => (
                  <View key={m.id} style={styles.thumb}>
                    {m.type === 'photo' ? (
                      <Image source={{ uri: m.uri }} style={styles.thumbImg} />
                    ) : (
                      <View style={styles.videoThumb}>
                        <Icon name="play-circle-outline" size={32} color="#fff" />
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Send SMS Update"
            onPress={handleSendSMS}
            loading={sendingSms}
            style={styles.smsBtn}
          />
          <View style={styles.navRow}>
            <Button
              title="Back"
              variant="secondary"
              onPress={() => navigation.goBack()}
              style={styles.navBtn}
            />
            {isLastHole ? (
              <Button title="Finish Round" onPress={handleFinishRound} style={styles.navBtn} />
            ) : (
              <Button title="Next Hole" onPress={handleNextHole} style={styles.navBtn} />
            )}
          </View>
        </View>
      </ScrollView>

      <Toast
        visible={toastConfig.visible}
        message={toastConfig.message}
        type={toastConfig.type}
        onHide={hideToast}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { flex: 1 },
  header: { padding: 24, alignItems: 'center' },
  holeNum: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  parText: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  scoreValue: { fontSize: 48, fontWeight: 'bold', color: '#fff', marginTop: 8 },
  scoreLabel: { fontSize: 18, fontWeight: '600', color: '#fff', marginTop: 2 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statChipText: { fontSize: 13, fontWeight: '600', color: '#333' },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 14,
    marginBottom: 12,
    padding: 14,
    borderRadius: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1, marginLeft: 8, marginBottom: 8 },
  refreshBtn: { padding: 4 },
  shotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  shotInfo: { marginLeft: 12, flex: 1 },
  shotType: { fontSize: 13, fontWeight: '600', color: '#666' },
  shotResult: { fontSize: 15, color: '#333', marginTop: 1 },
  aiText: { fontSize: 15, color: '#333', lineHeight: 22 },
  mediaRow: { flexDirection: 'row', gap: 10 },
  thumb: { width: 90, height: 90, borderRadius: 8, overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%' },
  videoThumb: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: { padding: 16, gap: 10 },
  smsBtn: { borderRadius: 10 },
  navRow: { flexDirection: 'row', gap: 10 },
  navBtn: { flex: 1, borderRadius: 10 },
});

export default HoleSummaryScreen;
