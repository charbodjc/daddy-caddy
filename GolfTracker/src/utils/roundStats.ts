import DatabaseService from '../services/database';

// Interface matching the actual shot data format stored in DB by ShotTrackingScreen
interface StoredShot {
  stroke: number;
  type: string;
  results: string[];
  puttDistance?: string;
}

interface StoredShotData {
  par: number;
  shots: StoredShot[];
  currentStroke: number;
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
}

/**
 * Parse the JSON shotData string into the stored format.
 */
export function parseShotData(shotData: any): StoredShotData | null {
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
  const puttShots = shotData.shots.filter(s => s.type === 'putt');
  const puttsCount = puttShots.length;

  // Fairway hit: par > 3 AND first tee shot result includes 'target'
  let fairwayHit: boolean | undefined = undefined;
  if (par > 3) {
    const teeShot = shotData.shots.find(s => s.type === 'tee');
    if (teeShot) {
      fairwayHit = teeShot.results.includes('target');
    }
  }

  // GIR: first putt stroke number <= par - 1
  let greenInRegulation = false;
  if (puttShots.length > 0) {
    greenInRegulation = puttShots[0].stroke <= par - 1;
  }

  // First putt distance: parse numeric feet from string like "25 ft"
  let firstPuttDistanceFeet: number | undefined = undefined;
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
  };

  const round = await DatabaseService.getRound(roundId);
  if (!round) return stats;

  for (const hole of round.holes) {
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
  }

  if (stats.holesWithFirstPuttData > 0) {
    stats.avgFirstPuttDistance = Math.round(
      stats.totalFirstPuttFeet / stats.holesWithFirstPuttData
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
  if (stats.totalFairwayHoles > 0) {
    text += `Fairways: ${stats.totalFairwaysHit}/${stats.totalFairwayHoles}\n`;
  }
  text += `GIR: ${stats.totalGIR}/${stats.totalHolesPlayed}\n`;
  if (stats.holesWithFirstPuttData > 0) {
    text += `Total 1st Putt Dist: ${Math.round(stats.totalFirstPuttFeet)} ft\n`;
    text += `Avg 1st Putt: ${stats.avgFirstPuttDistance} ft\n`;
  }
  text += `1-Putts: ${stats.totalOnePutts}\n`;
  text += `3-Putts: ${stats.totalThreePutts}`;
  return text;
}
