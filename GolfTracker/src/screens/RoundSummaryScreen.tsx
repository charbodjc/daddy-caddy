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
import { AppNavigationProp } from '../types/navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { database } from '../database/watermelon/database';
import { ScreenHeader } from '../components/common/ScreenHeader';
import Round from '../database/watermelon/models/Round';
import Hole from '../database/watermelon/models/Hole';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ErrorScreen } from '../components/common/ErrorScreen';
import { Button } from '../components/common/Button';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { format } from 'date-fns';
import { formatScoreVsPar, calculateScoreBreakdown } from '../utils/scoreCalculations';
import { calculateRunningRoundStats, formatRunningStatsForSMS, RunningRoundStats, parseShotData } from '../utils/roundStats';
import { isShotDataV2, ShotData } from '../types';

// ── Approach bucket config ──────────────────────────────────────

const APPROACH_BUCKETS = [
  { key: '200plus', label: '200+ yds' },
  { key: '150to200', label: '150–200 yds' },
  { key: '100to150', label: '100–150 yds' },
  { key: '50to100', label: '50–100 yds' },
] as const;

type BucketKey = typeof APPROACH_BUCKETS[number]['key'];
type BucketSuffix = '' | 'Green' | 'MissedLeft' | 'MissedRight' | 'MissedShort' | 'MissedLong';
type BucketStatKey = `approach${BucketKey}${BucketSuffix}`;

function getBucketStat(stats: RunningRoundStats, key: BucketKey, suffix: BucketSuffix): number {
  const statKey: BucketStatKey = `approach${key}${suffix}`;
  return stats[statKey];
}

// ── Helpers ─────────────────────────────────────────────────────

/** Hermes-safe thousands separator (toLocaleString is unreliable on Android). */
function formatWithCommas(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ── Shot outcome formatter ──────────────────────────────────────

function formatShotOutcome(
  outcome: string,
  missDirection?: string,
  resultLie?: string,
  penaltyType?: string,
): string {
  switch (outcome) {
    case 'holed':
      return 'Holed';
    case 'on_target': {
      const lie = resultLie ? resultLie.charAt(0).toUpperCase() + resultLie.slice(1) : 'On target';
      return `→ ${lie}`;
    }
    case 'missed': {
      const dir = missDirection
        ? missDirection.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        : 'Missed';
      return `Missed ${dir}`;
    }
    case 'penalty': {
      const type = penaltyType
        ? penaltyType.toUpperCase()
        : 'Penalty';
      return type;
    }
    default:
      return outcome;
  }
}

// ── Route params ────────────────────────────────────────────────

interface RouteParams {
  roundId: string;
}

const RoundSummaryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute();
  const { roundId } = (route.params as RouteParams) || {};

  const [round, setRound] = useState<Round | null>(null);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [roundStats, setRoundStats] = useState<RunningRoundStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadRound depends on roundId
  }, [roundId]);

  const loadRound = async () => {
    if (!roundId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const roundData = await database.collections.get<Round>('rounds').find(roundId);
      const holesData = await roundData.holes.fetch();

      const stats = await calculateRunningRoundStats(roundId);
      setRound(roundData);
      setHoles(holesData);
      setRoundStats(stats);
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

    const statsBlock = roundStats ? formatRunningStatsForSMS(roundStats) : '';

    const message = `
🏌️ Golf Round Summary

📍 ${round.courseName}
📅 ${format(round.date, 'EEEE, MMM d, yyyy')}
${round.tournamentName ? `🏆 ${round.tournamentName}\n` : ''}
⛳ Score: ${totalStrokes} (${scoreDisplay})
${statsBlock}

Played with Daddy Caddy ⛳
    `.trim();

    try {
      await Share.share({ message });
    } catch (shareError) {
      console.error('Share failed:', shareError);
    }
  }, [round, holes, roundStats]);

  const handleEditRound = useCallback(() => {
    if (!roundId) return;
    navigation.navigate('Scoring', {
      screen: 'RoundTracker',
      params: { roundId },
    });
  }, [navigation, roundId]);

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

  // Short game section visibility (V2 pitchChip* or V1 chipMissed*)
  const chipMissTotal = roundStats ? (
    roundStats.chipMissedLeft + roundStats.chipMissedRight +
    roundStats.chipMissedShort + roundStats.chipMissedLong
  ) : 0;
  const showShortGame = roundStats && (
    roundStats.pitchChipAttempts > 0 ||
    roundStats.greensideBunkerAttempts > 0 ||
    roundStats.totalUpAndDownAttempts > 0 ||
    roundStats.totalSandSaveAttempts > 0 ||
    chipMissTotal > 0
  );

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
      <ScreenHeader
        title="Round Summary"
        subtitle={round.courseName}
        leftAction="back"
        rightContent={
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={handleEditRound}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Edit round"
              accessibilityRole="button"
            >
              <Icon name="edit" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={handleShare}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Share round"
              accessibilityRole="button"
            >
              <Icon name="share" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        }
      />

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

      {/* ── Course & Driving ────────────────────────────────────── */}
      {roundStats && roundStats.holesWithTeeDistance > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">Course & Driving</Text>
          <View style={styles.detailedStatsList}>
            <DetailedStatRow
              label="Course Length"
              value={`${formatWithCommas(Math.round(roundStats.totalCourseLength))} yds`}
            />
            {roundStats.driveCount > 0 && (
              <>
                <DetailedStatRow
                  label="Avg Drive Distance"
                  value={`${Math.round(roundStats.totalDriveDistance / roundStats.driveCount)} yds`}
                />
                <DetailedStatRow
                  label="Longest Drive"
                  value={`${Math.round(roundStats.longestDrive)} yds`}
                />
              </>
            )}
          </View>
        </View>
      )}

      {/* ── Tee Shots ──────────────────────────────────────────── */}
      {roundStats && roundStats.totalFairwayHoles > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">Tee Shots</Text>

          <View style={styles.statsGrid}>
            <StatItem
              icon={<Icon name="flag" size={20} color="#2E7D32" />}
              label="Fairways Hit"
              value={`${roundStats.totalFairwaysHit}/${roundStats.totalFairwayHoles}`}
              percentage={Math.round((roundStats.totalFairwaysHit / roundStats.totalFairwayHoles) * 100)}
            />
          </View>

          {(roundStats.teeShotsMissedLeft > 0 || roundStats.teeShotsMissedRight > 0) && (
            <View style={[styles.detailedStatsList, styles.detailedStatsListSpaced]}>
              {roundStats.teeShotsMissedLeft > 0 && (
                <DetailedStatRow label="Missed Left" value={`${roundStats.teeShotsMissedLeft}`} />
              )}
              {roundStats.teeShotsMissedRight > 0 && (
                <DetailedStatRow label="Missed Right" value={`${roundStats.teeShotsMissedRight}`} />
              )}
            </View>
          )}
        </View>
      )}

      {/* ── Approach Shots ─────────────────────────────────────── */}
      {roundStats && roundStats.totalHolesPlayed > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">Approach Shots</Text>

          <View style={styles.statsGrid}>
            <StatItem
              icon={<Icon name="adjust" size={20} color="#2E7D32" />}
              label="Greens in Regulation"
              value={`${roundStats.totalGIR}/${roundStats.totalHolesPlayed}`}
              percentage={Math.round((roundStats.totalGIR / roundStats.totalHolesPlayed) * 100)}
            />
          </View>

          {(roundStats.approachShotCount > 0 || roundStats.girApproachCount > 0) && (
            <View style={[styles.detailedStatsList, styles.detailedStatsListSpaced]}>
              {roundStats.approachShotCount > 0 && (
                <DetailedStatRow
                  label="Avg Approach Distance"
                  value={`${Math.round(roundStats.totalApproachDistance / roundStats.approachShotCount)} yds`}
                />
              )}
              {roundStats.girApproachCount > 0 && (
                <DetailedStatRow
                  label="Avg GIR Approach Distance"
                  value={`${Math.round(roundStats.totalGirApproachDistance / roundStats.girApproachCount)} yds`}
                />
              )}
            </View>
          )}

          {/* Distance buckets (collapsible) */}
          {APPROACH_BUCKETS.map(({ key, label }) => {
            const total = getBucketStat(roundStats, key, '');
            if (total === 0) return null;
            const green = getBucketStat(roundStats, key, 'Green');
            const missedLeft = getBucketStat(roundStats, key, 'MissedLeft');
            const missedRight = getBucketStat(roundStats, key, 'MissedRight');
            const missedShort = getBucketStat(roundStats, key, 'MissedShort');
            const missedLong = getBucketStat(roundStats, key, 'MissedLong');

            return (
              <CollapsibleSection
                key={key}
                title={`${label} (${total} shots)`}
              >
                <DetailedStatRow label="Hit Green" value={`${green}`} />
                {missedLeft > 0 && <DetailedStatRow label="Missed Left" value={`${missedLeft}`} />}
                {missedRight > 0 && <DetailedStatRow label="Missed Right" value={`${missedRight}`} />}
                {missedShort > 0 && <DetailedStatRow label="Missed Short" value={`${missedShort}`} />}
                {missedLong > 0 && <DetailedStatRow label="Missed Long" value={`${missedLong}`} />}
              </CollapsibleSection>
            );
          })}
        </View>
      )}

      {/* ── Short Game ─────────────────────────────────────────── */}
      {showShortGame && roundStats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">Short Game</Text>
          <View style={styles.detailedStatsList}>
            {roundStats.pitchChipAttempts > 0 && (
              <DetailedStatRow label="Pitch/Chip Attempts" value={`${roundStats.pitchChipAttempts}`} />
            )}
            {/* V2 pitch/chip miss directions (preferred) or V1 chip miss fallback */}
            {roundStats.pitchChipAttempts > 0 ? (
              <>
                {roundStats.pitchChipMissedLeft > 0 && (
                  <DetailedStatRow label="Pitch Missed Left" value={`${roundStats.pitchChipMissedLeft}`} />
                )}
                {roundStats.pitchChipMissedRight > 0 && (
                  <DetailedStatRow label="Pitch Missed Right" value={`${roundStats.pitchChipMissedRight}`} />
                )}
                {roundStats.pitchChipMissedShort > 0 && (
                  <DetailedStatRow label="Pitch Missed Short" value={`${roundStats.pitchChipMissedShort}`} />
                )}
                {roundStats.pitchChipMissedLong > 0 && (
                  <DetailedStatRow label="Pitch Missed Long" value={`${roundStats.pitchChipMissedLong}`} />
                )}
              </>
            ) : (
              <>
                {roundStats.chipMissedLeft > 0 && (
                  <DetailedStatRow label="Chip Missed Left" value={`${roundStats.chipMissedLeft}`} />
                )}
                {roundStats.chipMissedRight > 0 && (
                  <DetailedStatRow label="Chip Missed Right" value={`${roundStats.chipMissedRight}`} />
                )}
                {roundStats.chipMissedShort > 0 && (
                  <DetailedStatRow label="Chip Missed Short" value={`${roundStats.chipMissedShort}`} />
                )}
                {roundStats.chipMissedLong > 0 && (
                  <DetailedStatRow label="Chip Missed Long" value={`${roundStats.chipMissedLong}`} />
                )}
              </>
            )}
            {roundStats.greensideBunkerAttempts > 0 && (
              <DetailedStatRow label="Greenside Bunker Shots" value={`${roundStats.greensideBunkerAttempts}`} />
            )}
            {roundStats.totalUpAndDownAttempts > 0 && (
              <DetailedStatRow label="Up & Downs" value={`${roundStats.totalUpAndDowns}/${roundStats.totalUpAndDownAttempts}`} />
            )}
            {roundStats.totalSandSaveAttempts > 0 && (
              <DetailedStatRow label="Sand Saves" value={`${roundStats.totalSandSaves}/${roundStats.totalSandSaveAttempts}`} />
            )}
          </View>
        </View>
      )}

      {/* ── Putting ────────────────────────────────────────────── */}
      {roundStats && roundStats.totalPutts > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">Putting</Text>
          <View style={styles.detailedStatsList}>
            <DetailedStatRow label="Total Putts" value={`${roundStats.totalPutts}`} />
            <DetailedStatRow label="Total Putt Feet Made" value={`${Math.round(roundStats.totalPuttFeetMade)} ft`} />
            {roundStats.birdiePuttCount > 0 && (
              <DetailedStatRow label="Avg Putt Length (Birdie)" value={`${roundStats.avgBirdiePuttDistance} ft`} />
            )}
            {roundStats.parPuttCount > 0 && (
              <DetailedStatRow label="Avg Putt Length (Par)" value={`${roundStats.avgParPuttDistance} ft`} />
            )}
            <DetailedStatRow label="1-Putts" value={`${roundStats.totalOnePutts}`} />
            <DetailedStatRow label="3-Putts" value={`${roundStats.totalThreePutts}`} />
            {roundStats.puttMissedLong > 0 && (
              <DetailedStatRow label="Putts Missed Long" value={`${roundStats.puttMissedLong}`} />
            )}
            {roundStats.puttMissedShort > 0 && (
              <DetailedStatRow label="Putts Missed Short" value={`${roundStats.puttMissedShort}`} />
            )}
            {roundStats.puttMissedHigh > 0 && (
              <DetailedStatRow label="Putts Missed High" value={`${roundStats.puttMissedHigh}`} />
            )}
            {roundStats.puttMissedLow > 0 && (
              <DetailedStatRow label="Putts Missed Low" value={`${roundStats.puttMissedLow}`} />
            )}
            {roundStats.puttMissedLeft > 0 && (
              <DetailedStatRow label="Putts Missed Left" value={`${roundStats.puttMissedLeft}`} />
            )}
            {roundStats.puttMissedRight > 0 && (
              <DetailedStatRow label="Putts Missed Right" value={`${roundStats.puttMissedRight}`} />
            )}
          </View>
        </View>
      )}

      {/* ── Penalties ──────────────────────────────────────────── */}
      {roundStats && roundStats.totalPenaltyStrokes > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">Penalties</Text>
          <View style={styles.detailedStatsList}>
            <DetailedStatRow label="Penalty Strokes" value={`${roundStats.totalPenaltyStrokes}`} />
          </View>
        </View>
      )}

      {/* Scoring Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle} accessibilityRole="header">Scoring Breakdown</Text>

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

      {/* ── Shot-by-Shot Breakdown ───────────────────────────── */}
      {completedHoles.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">Shot-by-Shot Breakdown</Text>
          {[...completedHoles]
            .sort((a, b) => a.holeNumber - b.holeNumber)
            .map(hole => {
              const parsed = parseShotData(hole.shotData);
              if (!parsed || parsed.shots.length === 0) return null;

              const scoreToPar = hole.strokes - hole.par;
              const scoreLabel = scoreToPar === 0 ? 'E' : scoreToPar > 0 ? `+${scoreToPar}` : `${scoreToPar}`;

              return (
                <CollapsibleSection
                  key={hole.holeNumber}
                  title={`Hole ${hole.holeNumber}  (Par ${hole.par}) — ${hole.strokes} (${scoreLabel})`}
                >
                  {isShotDataV2(parsed)
                    ? parsed.shots.map((shot, i) => {
                        const distLabel = shot.distanceToHole !== undefined
                          ? `${shot.distanceToHole} ${shot.distanceUnit}`
                          : '';
                        const lieLabel = shot.lie.charAt(0).toUpperCase() + shot.lie.slice(1);
                        const outcomeLabel = formatShotOutcome(shot.outcome, shot.missDirection, shot.resultLie, shot.penaltyType);

                        return (
                          <View key={i} style={styles.shotRow}>
                            <Text style={styles.shotStroke}>{shot.stroke}</Text>
                            <View style={styles.shotDetails}>
                              <Text style={styles.shotLie}>{lieLabel}{distLabel ? `, ${distLabel}` : ''}</Text>
                              <Text style={styles.shotResult}>{outcomeLabel}</Text>
                            </View>
                          </View>
                        );
                      })
                    : (parsed as ShotData).shots.map((shot, i) => {
                        const distLabel = shot.distance || '';
                        return (
                          <View key={i} style={styles.shotRow}>
                            <Text style={styles.shotStroke}>{shot.stroke}</Text>
                            <View style={styles.shotDetails}>
                              <Text style={styles.shotLie}>{shot.type}{distLabel ? `, ${distLabel}` : ''}</Text>
                              <Text style={styles.shotResult}>{shot.results.join(', ')}</Text>
                            </View>
                          </View>
                        );
                      })
                  }
                </CollapsibleSection>
              );
            })}
        </View>
      )}

      {/* AI Analysis */}
      {round.aiAnalysis && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">AI Analysis</Text>
          <View style={styles.aiCard}>
            <Icon name="psychology" size={24} color="#2E7D32" style={styles.aiIcon} />
            <Text style={styles.aiText}>{round.aiAnalysis}</Text>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={[styles.actions, { paddingBottom: Math.max(30, insets.bottom + 10) }]}>
        <Button title="Share Round" onPress={handleShare} style={styles.actionButton} />
      </View>
    </ScrollView>
  );
};

// ── Helper Components ─────────────────────────────────────────────

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

const DetailedStatRow: React.FC<{
  label: string;
  value: string;
}> = React.memo(({ label, value }) => (
  <View style={styles.detailedStatRow}>
    <Text style={styles.detailedStatLabel}>{label}</Text>
    <Text style={styles.detailedStatValue}>{value}</Text>
  </View>
));

const CollapsibleSection: React.FC<{
  title: string;
  children: React.ReactNode;
}> = React.memo(({ title, children }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.collapsibleContainer}>
      <TouchableOpacity
        style={styles.collapsibleHeader}
        onPress={() => setExpanded(prev => !prev)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityHint={expanded ? 'Double tap to collapse' : 'Double tap to expand'}
      >
        <Text style={styles.collapsibleHeaderText}>{title}</Text>
        <Icon
          name={expanded ? 'expand-less' : 'expand-more'}
          size={22}
          color="#666"
        />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.collapsibleContent}>
          {children}
        </View>
      )}
    </View>
  );
});

ScoreDetailItem.displayName = 'ScoreDetailItem';
StatItem.displayName = 'StatItem';
BreakdownItem.displayName = 'BreakdownItem';
DetailedStatRow.displayName = 'DetailedStatRow';
CollapsibleSection.displayName = 'CollapsibleSection';

// ── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActionButton: {
    padding: 5,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#2E7D32',
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
    color: '#555',
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
    color: '#2E7D32',
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
    color: '#2E7D32',
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
  detailedStatsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailedStatsListSpaced: {
    marginTop: 12,
  },
  detailedStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailedStatLabel: {
    fontSize: 15,
    color: '#555',
    flex: 1,
  },
  detailedStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  collapsibleContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  collapsibleHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#444',
    flex: 1,
  },
  collapsibleContent: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  shotRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  shotStroke: {
    width: 28,
    fontSize: 14,
    fontWeight: '700',
    color: '#2E7D32',
    textAlign: 'center',
  },
  shotDetails: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 8,
  },
  shotLie: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  shotResult: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
});

export default RoundSummaryScreen;
