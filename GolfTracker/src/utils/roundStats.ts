import { ShotData, SHOT_TYPES, SHOT_RESULTS } from '../types';
import { database } from '../database/watermelon/database';
import Round from '../database/watermelon/models/Round';
import Hole from '../database/watermelon/models/Hole';

type StoredShotData = ShotData;

/**
 * Calculate total strokes for a set of tracked shots.
 * Total = number of shots + any extra penalty strokes.
 * Penalty shots record the shot itself (1 entry) plus additional penaltyStrokes (1 or 2).
 */
export function calculateTotalStrokes(shots: StoredShotData['shots']): number {
  const penaltyExtra = shots.reduce((sum, s) => sum + (s.penaltyStrokes || 0), 0);
  return shots.length + penaltyExtra;
}

export interface RunningRoundStats {
  totalPutts: number;
  totalFairwaysHit: number;
  totalFairwayHoles: number;
  totalGIR: number;
  totalHolesPlayed: number;
  totalFirstPuttFeet: number;
  totalOnePutts: number;
  totalThreePutts: number;
  avgFirstPuttDistance: number;
  holesWithFirstPuttData: number;
  avgBirdiePuttDistance: number;
  birdiePuttCount: number;
  totalBirdiePuttFeet: number;
  avgParPuttDistance: number;
  parPuttCount: number;
  totalParPuttFeet: number;
  totalPuttFeetMade: number;
  teeShotsMissedLeft: number;
  teeShotsMissedRight: number;
  approachMissedLeft: number;
  approachMissedRight: number;
  totalPenaltyStrokes: number;
}

/**
 * Parse the JSON shotData string into the stored format.
 */
export function parseShotData(shotData: unknown): StoredShotData | null {
  if (!shotData) return null;
  try {
    const data = typeof shotData === 'string' ? JSON.parse(shotData) : shotData;
    if (data && Array.isArray(data.shots)) {
      return data as StoredShotData;
    }
  } catch (e) {
    console.error('Error parsing shot data:', e);
  }
  return null;
}

/**
 * Derive hole-level stats from parsed shot data.
 */
export function deriveHoleStats(shotData: StoredShotData, par: number) {
  // Match putts case-insensitively for backward compat with historical data
  const puttShots = shotData.shots.filter(s => s.type?.toLowerCase() === SHOT_TYPES.PUTT.toLowerCase());
  const puttsCount = puttShots.length;

  // Fairway hit: par > 3 AND tee shot result is 'center' (or legacy 'target')
  let fairwayHit: boolean | undefined;
  if (par > 3) {
    const teeShot = shotData.shots.find(s =>
      s.type === SHOT_TYPES.TEE_SHOT || s.type?.toLowerCase() === 'tee'
    );
    if (teeShot) {
      fairwayHit = teeShot.results.includes(SHOT_RESULTS.CENTER) || teeShot.results.includes('target');
    }
  }

  // GIR: first putt stroke number <= par - 1
  let greenInRegulation = false;
  if (puttShots.length > 0) {
    greenInRegulation = puttShots[0].stroke <= par - 1;
  }

  // First putt distance: parse numeric feet from string like "25 ft"
  let firstPuttDistanceFeet: number | undefined;
  if (puttShots.length > 0 && puttShots[0].puttDistance) {
    const distStr = puttShots[0].puttDistance.replace(/\s*(ft|feet)\s*$/i, '').trim();
    const parsed = parseFloat(distStr);
    if (!isNaN(parsed) && parsed > 0) {
      firstPuttDistanceFeet = parsed;
    }
  }

  return {
    puttsCount,
    fairwayHit,
    greenInRegulation,
    firstPuttDistanceFeet,
    isOnePutt: puttsCount === 1,
    isThreePutt: puttsCount >= 3,
  };
}

/**
 * Calculate running round stats from all completed holes in a round.
 */
export async function calculateRunningRoundStats(
  roundId: string,
): Promise<RunningRoundStats> {
  const stats: RunningRoundStats = {
    totalPutts: 0,
    totalFairwaysHit: 0,
    totalFairwayHoles: 0,
    totalGIR: 0,
    totalHolesPlayed: 0,
    totalFirstPuttFeet: 0,
    totalOnePutts: 0,
    totalThreePutts: 0,
    avgFirstPuttDistance: 0,
    holesWithFirstPuttData: 0,
    avgBirdiePuttDistance: 0,
    birdiePuttCount: 0,
    totalBirdiePuttFeet: 0,
    avgParPuttDistance: 0,
    parPuttCount: 0,
    totalParPuttFeet: 0,
    totalPuttFeetMade: 0,
    teeShotsMissedLeft: 0,
    teeShotsMissedRight: 0,
    approachMissedLeft: 0,
    approachMissedRight: 0,
    totalPenaltyStrokes: 0,
  };

  let round: Round;
  try {
    round = await database.get<Round>('rounds').find(roundId);
  } catch {
    return stats;
  }
  const holes: Hole[] = await round.holes.fetch();

  for (const hole of holes) {
    if (hole.strokes <= 0) continue;

    const shotData = parseShotData(hole.shotData);
    if (!shotData || shotData.shots.length === 0) continue;

    const holeStats = deriveHoleStats(shotData, hole.par);

    stats.totalPutts += holeStats.puttsCount;
    stats.totalHolesPlayed += 1;

    if (hole.par > 3) {
      stats.totalFairwayHoles += 1;
      if (holeStats.fairwayHit) {
        stats.totalFairwaysHit += 1;
      }
    }

    if (holeStats.greenInRegulation) {
      stats.totalGIR += 1;
    }

    if (holeStats.firstPuttDistanceFeet !== undefined) {
      stats.totalFirstPuttFeet += holeStats.firstPuttDistanceFeet;
      stats.holesWithFirstPuttData += 1;
    }

    if (holeStats.isOnePutt) stats.totalOnePutts += 1;
    if (holeStats.isThreePutt) stats.totalThreePutts += 1;

    // Birdie/par putt distances (first putt distance on birdie/par holes)
    const holeScore = hole.strokes;
    const scoreToPar = holeScore - hole.par;
    if (holeStats.firstPuttDistanceFeet !== undefined) {
      if (scoreToPar === -1) {
        stats.totalBirdiePuttFeet += holeStats.firstPuttDistanceFeet;
        stats.birdiePuttCount += 1;
      } else if (scoreToPar === 0) {
        stats.totalParPuttFeet += holeStats.firstPuttDistanceFeet;
        stats.parPuttCount += 1;
      }
    }

    // Total feet of putts made
    const puttShots = shotData.shots.filter(
      s => s.type?.toLowerCase() === SHOT_TYPES.PUTT.toLowerCase()
    );
    for (const putt of puttShots) {
      if (putt.results.includes(SHOT_RESULTS.MADE) && putt.puttDistance) {
        const distStr = putt.puttDistance.replace(/\s*(ft|feet)\s*$/i, '').trim();
        const parsed = parseFloat(distStr);
        if (!isNaN(parsed) && parsed > 0) {
          stats.totalPuttFeetMade += parsed;
        }
      }
    }

    // Tee shot miss direction (exclude par 3s)
    if (hole.par > 3) {
      const teeShot = shotData.shots.find(
        s => s.type === SHOT_TYPES.TEE_SHOT || s.type?.toLowerCase() === 'tee'
      );
      if (teeShot) {
        if (teeShot.results.includes(SHOT_RESULTS.LEFT)) stats.teeShotsMissedLeft += 1;
        if (teeShot.results.includes(SHOT_RESULTS.RIGHT)) stats.teeShotsMissedRight += 1;
      }
    }

    // Approach miss direction (include par 3 tee shots as approaches)
    const approachShots = shotData.shots.filter(
      s => s.type === SHOT_TYPES.APPROACH
    );
    if (hole.par === 3) {
      const par3TeeShot = shotData.shots.find(
        s => s.type === SHOT_TYPES.TEE_SHOT || s.type?.toLowerCase() === 'tee'
      );
      if (par3TeeShot) approachShots.push(par3TeeShot);
    }
    for (const approach of approachShots) {
      if (approach.results.includes(SHOT_RESULTS.LEFT)) stats.approachMissedLeft += 1;
      if (approach.results.includes(SHOT_RESULTS.RIGHT)) stats.approachMissedRight += 1;
    }

    // Penalty strokes
    for (const shot of shotData.shots) {
      if (shot.penaltyStrokes) {
        stats.totalPenaltyStrokes += shot.penaltyStrokes;
      }
    }
  }

  if (stats.holesWithFirstPuttData > 0) {
    stats.avgFirstPuttDistance = Math.round(
      stats.totalFirstPuttFeet / stats.holesWithFirstPuttData
    );
  }

  if (stats.birdiePuttCount > 0) {
    stats.avgBirdiePuttDistance = Math.round(
      stats.totalBirdiePuttFeet / stats.birdiePuttCount
    );
  }

  if (stats.parPuttCount > 0) {
    stats.avgParPuttDistance = Math.round(
      stats.totalParPuttFeet / stats.parPuttCount
    );
  }

  return stats;
}

/**
 * Format running round stats as an SMS text block.
 */
export function formatRunningStatsForSMS(stats: RunningRoundStats): string {
  if (stats.totalHolesPlayed === 0) return '';

  let text = '\n--- Round Stats ---\n';
  text += `Putts: ${stats.totalPutts}\n`;
  text += `Total Putt Feet Made: ${Math.round(stats.totalPuttFeetMade)} ft\n`;
  if (stats.totalFairwayHoles > 0) {
    text += `Fairways: ${stats.totalFairwaysHit}/${stats.totalFairwayHoles}\n`;
  }
  text += `GIR: ${stats.totalGIR}/${stats.totalHolesPlayed}\n`;
  if (stats.holesWithFirstPuttData > 0) {
    text += `Avg 1st Putt: ${stats.avgFirstPuttDistance} ft\n`;
  }
  if (stats.birdiePuttCount > 0) {
    text += `Avg 1st Putt (Birdie): ${stats.avgBirdiePuttDistance} ft\n`;
  }
  if (stats.parPuttCount > 0) {
    text += `Avg 1st Putt (Par): ${stats.avgParPuttDistance} ft\n`;
  }
  text += `1-Putts: ${stats.totalOnePutts}\n`;
  text += `3-Putts: ${stats.totalThreePutts}\n`;
  text += `Tee Missed L/R: ${stats.teeShotsMissedLeft}/${stats.teeShotsMissedRight}\n`;
  text += `Approach Missed L/R: ${stats.approachMissedLeft}/${stats.approachMissedRight}\n`;
  text += `Penalty Strokes: ${stats.totalPenaltyStrokes}`;
  return text;
}
