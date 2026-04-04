import {
  ShotData, ShotDataV2, isShotDataV2,
  SHOT_TYPES, SHOT_RESULTS, SHOT_OUTCOMES, LIE_TYPES,
} from '../types';
import type { MissDirection } from '../types';
import { database } from '../database/watermelon/database';
import Round from '../database/watermelon/models/Round';
import Hole from '../database/watermelon/models/Hole';

/**
 * Calculate total strokes for a set of tracked shots.
 * Total = number of shots + any extra penalty strokes.
 * Penalty shots record the shot itself (1 entry) plus additional penaltyStrokes (1 or 2).
 */
export function calculateTotalStrokes(shots: ShotData['shots']): number {
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
  chipMissedLeft: number;
  chipMissedRight: number;
  chipMissedShort: number;
  chipMissedLong: number;
  totalPenaltyStrokes: number;
  totalSandSaves: number;
  totalSandSaveAttempts: number;
  totalUpAndDowns: number;
  totalUpAndDownAttempts: number;

  // ── V2 stats (populated only from ShotDataV2 holes) ──────
  // Approach shots by distance bucket
  approach50to100: number;
  approach50to100Green: number;
  approach50to100MissedLeft: number;
  approach50to100MissedRight: number;
  approach50to100MissedShort: number;
  approach50to100MissedLong: number;
  approach100to150: number;
  approach100to150Green: number;
  approach100to150MissedLeft: number;
  approach100to150MissedRight: number;
  approach100to150MissedShort: number;
  approach100to150MissedLong: number;
  approach150to200: number;
  approach150to200Green: number;
  approach150to200MissedLeft: number;
  approach150to200MissedRight: number;
  approach150to200MissedShort: number;
  approach150to200MissedLong: number;
  approach200plus: number;
  approach200plusGreen: number;
  approach200plusMissedLeft: number;
  approach200plusMissedRight: number;
  approach200plusMissedShort: number;
  approach200plusMissedLong: number;
  totalApproachDistance: number;
  approachShotCount: number;
  // Pitch/chip (< 50 yds, non-green)
  pitchChipAttempts: number;
  pitchChipMissedLeft: number;
  pitchChipMissedRight: number;
  pitchChipMissedShort: number;
  pitchChipMissedLong: number;
  // Greenside bunker (sand lie, < 50 yds)
  greensideBunkerAttempts: number;
  greensideBunkerHitGreen: number;
  // Putt miss analysis — combined distance + break categories
  puttMissedLongHigh: number;
  puttMissedLongLow: number;
  puttMissedShortHigh: number;
  puttMissedShortLow: number;
  puttMissedLong: number;   // long only (no break info)
  puttMissedShort: number;  // short only (no break info)
  puttMissedHigh: number;   // high only (no distance info)
  puttMissedLow: number;    // low only (no distance info)
  puttMissedLeft: number;
  puttMissedRight: number;

  // ── Course & driving stats ────────────────────────────────────
  totalCourseLength: number;
  holesWithTeeDistance: number;
  totalDriveDistance: number;
  driveCount: number;
  longestDrive: number;

  // ── GIR approach distance ─────────────────────────────────────
  totalGirApproachDistance: number;
  girApproachCount: number;
}

/**
 * Parse the JSON shotData string into V1 or V2 format.
 * Returns null if unparseable. Use isShotDataV2() to narrow the result.
 */
export function parseShotData(shotData: unknown): ShotData | ShotDataV2 | null {
  if (!shotData) return null;
  try {
    const data = typeof shotData === 'string' ? JSON.parse(shotData) : shotData;
    if (data && Array.isArray(data.shots)) {
      return data as ShotData | ShotDataV2;
    }
  } catch (e) {
    console.error('Error parsing shot data:', e);
  }
  return null;
}

/**
 * Derive hole-level stats from parsed shot data.
 */
export function deriveHoleStats(shotData: ShotData, par: number) {
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
 * Derive hole-level stats from V2 shot data.
 */
export function deriveHoleStatsV2(shotData: ShotDataV2, par: number) {
  const shots = shotData.shots;
  const puttShots = shots.filter(s => s.lie === LIE_TYPES.GREEN);
  const puttsCount = puttShots.length;

  // Fairway hit: par > 3 AND tee shot outcome is on_target with resultLie fairway
  let fairwayHit: boolean | undefined;
  if (par > 3 && shots.length > 0) {
    const teeShot = shots[0];
    if (teeShot.lie === LIE_TYPES.TEE) {
      fairwayHit = teeShot.outcome === SHOT_OUTCOMES.ON_TARGET &&
        teeShot.resultLie === LIE_TYPES.FAIRWAY;
    }
  }

  // GIR: first putt stroke <= par - 1
  let greenInRegulation = false;
  if (puttShots.length > 0) {
    greenInRegulation = puttShots[0].stroke <= par - 1;
  }

  // First putt distance (from distanceToHole in feet)
  let firstPuttDistanceFeet: number | undefined;
  if (puttShots.length > 0 && puttShots[0].distanceToHole !== undefined) {
    firstPuttDistanceFeet = puttShots[0].distanceToHole;
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

// ── V2 approach bucket helper ────────────────────────────────

type ApproachBucket = '50to100' | '100to150' | '150to200' | '200plus';

function getApproachBucket(distance: number): ApproachBucket | null {
  if (distance >= 200) return '200plus';
  if (distance >= 150) return '150to200';
  if (distance >= 100) return '100to150';
  if (distance >= 50) return '50to100';
  return null; // < 50 is pitch/chip territory
}

function hasLeftComponent(dir: MissDirection | undefined): boolean {
  return dir === 'left' || dir === 'short_left' || dir === 'long_left';
}

function hasRightComponent(dir: MissDirection | undefined): boolean {
  return dir === 'right' || dir === 'short_right' || dir === 'long_right';
}

function hasShortComponent(dir: MissDirection | undefined): boolean {
  return dir === 'short' || dir === 'short_left' || dir === 'short_right';
}

function hasLongComponent(dir: MissDirection | undefined): boolean {
  return dir === 'long' || dir === 'long_left' || dir === 'long_right';
}

/**
 * Accumulate V2 shot data into running round stats for a single hole.
 */
function accumulateV2HoleStats(
  stats: RunningRoundStats,
  shotData: ShotDataV2,
  par: number,
  strokes: number,
): void {
  const shots = shotData.shots;
  const holeStats = deriveHoleStatsV2(shotData, par);

  stats.totalPutts += holeStats.puttsCount;
  stats.totalHolesPlayed += 1;

  if (par > 3) {
    stats.totalFairwayHoles += 1;
    if (holeStats.fairwayHit) stats.totalFairwaysHit += 1;
  }
  if (holeStats.greenInRegulation) stats.totalGIR += 1;

  if (holeStats.firstPuttDistanceFeet !== undefined) {
    stats.totalFirstPuttFeet += holeStats.firstPuttDistanceFeet;
    stats.holesWithFirstPuttData += 1;
  }
  if (holeStats.isOnePutt) stats.totalOnePutts += 1;
  if (holeStats.isThreePutt) stats.totalThreePutts += 1;

  // Putt analysis
  const puttShots = shots.filter(s => s.lie === LIE_TYPES.GREEN);

  if (holeStats.firstPuttDistanceFeet !== undefined && puttShots.length > 0) {
    const firstPuttStroke = puttShots[0].stroke;
    const girStroke = par - 1;
    if (firstPuttStroke <= girStroke) {
      stats.totalBirdiePuttFeet += holeStats.firstPuttDistanceFeet;
      stats.birdiePuttCount += 1;
    } else if (firstPuttStroke === girStroke + 1) {
      stats.totalParPuttFeet += holeStats.firstPuttDistanceFeet;
      stats.parPuttCount += 1;
    }
  }

  // Total feet of putts made + putt miss analysis
  for (const putt of puttShots) {
    if (putt.outcome === SHOT_OUTCOMES.HOLED && putt.distanceToHole !== undefined) {
      stats.totalPuttFeetMade += putt.distanceToHole;
    }
    if (putt.outcome === SHOT_OUTCOMES.MISSED) {
      // Combined distance + break categories
      if (putt.puttMissDistance && putt.puttMissBreak) {
        if (putt.puttMissDistance === 'long' && putt.puttMissBreak === 'high') stats.puttMissedLongHigh += 1;
        if (putt.puttMissDistance === 'long' && putt.puttMissBreak === 'low') stats.puttMissedLongLow += 1;
        if (putt.puttMissDistance === 'short' && putt.puttMissBreak === 'high') stats.puttMissedShortHigh += 1;
        if (putt.puttMissDistance === 'short' && putt.puttMissBreak === 'low') stats.puttMissedShortLow += 1;
      } else {
        // Only one dimension available
        if (putt.puttMissDistance === 'long') stats.puttMissedLong += 1;
        if (putt.puttMissDistance === 'short') stats.puttMissedShort += 1;
        if (putt.puttMissBreak === 'high') stats.puttMissedHigh += 1;
        if (putt.puttMissBreak === 'low') stats.puttMissedLow += 1;
      }
      // Left/Right misses (straight putts via TAP_PUTT_MISS_SIDE)
      if (putt.missDirection === 'left') stats.puttMissedLeft += 1;
      if (putt.missDirection === 'right') stats.puttMissedRight += 1;
    }
  }

  // Tee shot miss direction (exclude par 3s for tee accuracy)
  if (par > 3 && shots.length > 0 && shots[0].lie === LIE_TYPES.TEE) {
    const teeShot = shots[0];
    if (teeShot.outcome === SHOT_OUTCOMES.MISSED) {
      if (hasLeftComponent(teeShot.missDirection)) stats.teeShotsMissedLeft += 1;
      if (hasRightComponent(teeShot.missDirection)) stats.teeShotsMissedRight += 1;
    }
  }

  // Course length: tee shot distance = hole length
  if (shots.length > 0 && shots[0].lie === LIE_TYPES.TEE &&
      shots[0].distanceToHole !== undefined && shots[0].distanceUnit === 'yds') {
    stats.totalCourseLength += shots[0].distanceToHole;
    stats.holesWithTeeDistance += 1;
  }

  // Drive distance: par 4/5, non-penalty tee shot
  if (par > 3 && shots.length >= 2 && shots[0].lie === LIE_TYPES.TEE &&
      shots[0].outcome !== SHOT_OUTCOMES.PENALTY &&
      shots[0].distanceToHole !== undefined && shots[0].distanceUnit === 'yds') {
    // Find the next non-penalty shot with distance data
    const nextShot = shots.slice(1).find(s =>
      s.outcome !== SHOT_OUTCOMES.PENALTY &&
      s.distanceToHole !== undefined
    );
    if (nextShot && nextShot.distanceToHole !== undefined) {
      // Convert next shot distance to yards if in feet
      const nextDistYds = nextShot.distanceUnit === 'ft'
        ? nextShot.distanceToHole / 3
        : nextShot.distanceToHole;
      const driveYards = shots[0].distanceToHole - nextDistYds;
      if (driveYards > 0) {
        stats.totalDriveDistance += driveYards;
        stats.driveCount += 1;
        if (driveYards > stats.longestDrive) stats.longestDrive = driveYards;
      }
    }
  }

  // GIR approach distance: last non-green shot before first putt on GIR holes
  // Exclude par 3s — the tee shot IS the approach, which conflates driver/iron stats
  if (holeStats.greenInRegulation && par > 3) {
    const lastApproachToGreen = shots
      .filter(s => s.lie !== LIE_TYPES.GREEN && s.outcome !== SHOT_OUTCOMES.PENALTY)
      .pop();
    if (lastApproachToGreen?.distanceToHole !== undefined) {
      const distYds = lastApproachToGreen.distanceUnit === 'ft'
        ? lastApproachToGreen.distanceToHole / 3
        : lastApproachToGreen.distanceToHole;
      stats.totalGirApproachDistance += distYds;
      stats.girApproachCount += 1;
    }
  }

  // Non-green shots: penalties, approach buckets, pitch/chip, bunker
  for (const shot of shots) {
    if (shot.lie === LIE_TYPES.GREEN) continue;

    // Penalty strokes
    if (shot.penaltyStrokes) stats.totalPenaltyStrokes += shot.penaltyStrokes;

    // Skip shots without distance for bucket analysis
    if (shot.distanceToHole === undefined || shot.distanceUnit !== 'yds') continue;

    const dist = shot.distanceToHole;

    // Approach shots: non-tee shots >= 50 yds, or par 3 tee shots
    // Exclude tee shots on par 4/5 (drives) and penalty shots
    const isApproach = shot.outcome !== SHOT_OUTCOMES.PENALTY && (
      shot.lie === LIE_TYPES.TEE
        ? par === 3
        : dist >= 50
    );
    if (isApproach) {
      const bucket = getApproachBucket(dist);
      if (bucket) {
        const prefix = `approach${bucket}` as const;
        stats[prefix] += 1;
        stats.totalApproachDistance += dist;
        stats.approachShotCount += 1;

        if (shot.outcome === SHOT_OUTCOMES.ON_TARGET && shot.resultLie === LIE_TYPES.GREEN) {
          stats[`${prefix}Green`] += 1;
        } else if (shot.outcome === SHOT_OUTCOMES.MISSED && shot.missDirection) {
          if (hasLeftComponent(shot.missDirection)) stats[`${prefix}MissedLeft`] += 1;
          if (hasRightComponent(shot.missDirection)) stats[`${prefix}MissedRight`] += 1;
          if (hasShortComponent(shot.missDirection)) stats[`${prefix}MissedShort`] += 1;
          if (hasLongComponent(shot.missDirection)) stats[`${prefix}MissedLong`] += 1;
        }
      }

      // Also count approach miss L/R for the existing aggregate stats
      if (shot.outcome === SHOT_OUTCOMES.MISSED) {
        if (hasLeftComponent(shot.missDirection)) stats.approachMissedLeft += 1;
        if (hasRightComponent(shot.missDirection)) stats.approachMissedRight += 1;
      }
    }

    // Pitch/chip (< 50 yds, non-green, non-tee, non-penalty)
    if (dist < 50 && shot.lie !== LIE_TYPES.TEE && shot.outcome !== SHOT_OUTCOMES.PENALTY) {
      if (shot.lie === LIE_TYPES.SAND) {
        stats.greensideBunkerAttempts += 1;
        if (shot.outcome === SHOT_OUTCOMES.ON_TARGET && shot.resultLie === LIE_TYPES.GREEN) {
          stats.greensideBunkerHitGreen += 1;
        }
      } else {
        stats.pitchChipAttempts += 1;
        if (shot.outcome === SHOT_OUTCOMES.MISSED && shot.missDirection) {
          if (hasLeftComponent(shot.missDirection)) stats.pitchChipMissedLeft += 1;
          if (hasRightComponent(shot.missDirection)) stats.pitchChipMissedRight += 1;
          if (hasShortComponent(shot.missDirection)) stats.pitchChipMissedShort += 1;
          if (hasLongComponent(shot.missDirection)) stats.pitchChipMissedLong += 1;
        }
      }
    }
  }

  // Up & down: missed GIR but made par or better
  if (!holeStats.greenInRegulation) {
    stats.totalUpAndDownAttempts += 1;
    if (strokes <= par) stats.totalUpAndDowns += 1;
  }

  // Sand save: any shot from sand lie < 50 yds, then made par or better
  const hadGreensideBunker = shots.some(s =>
    s.lie === LIE_TYPES.SAND &&
    s.distanceToHole !== undefined &&
    s.distanceToHole < 50 &&
    s.distanceUnit === 'yds'
  );
  if (hadGreensideBunker) {
    stats.totalSandSaveAttempts += 1;
    if (strokes <= par) stats.totalSandSaves += 1;
  }
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
    chipMissedLeft: 0,
    chipMissedRight: 0,
    chipMissedShort: 0,
    chipMissedLong: 0,
    totalPenaltyStrokes: 0,
    totalSandSaves: 0,
    totalSandSaveAttempts: 0,
    totalUpAndDowns: 0,
    totalUpAndDownAttempts: 0,
    // V2 stats
    approach50to100: 0, approach50to100Green: 0,
    approach50to100MissedLeft: 0, approach50to100MissedRight: 0,
    approach50to100MissedShort: 0, approach50to100MissedLong: 0,
    approach100to150: 0, approach100to150Green: 0,
    approach100to150MissedLeft: 0, approach100to150MissedRight: 0,
    approach100to150MissedShort: 0, approach100to150MissedLong: 0,
    approach150to200: 0, approach150to200Green: 0,
    approach150to200MissedLeft: 0, approach150to200MissedRight: 0,
    approach150to200MissedShort: 0, approach150to200MissedLong: 0,
    approach200plus: 0, approach200plusGreen: 0,
    approach200plusMissedLeft: 0, approach200plusMissedRight: 0,
    approach200plusMissedShort: 0, approach200plusMissedLong: 0,
    totalApproachDistance: 0, approachShotCount: 0,
    pitchChipAttempts: 0,
    pitchChipMissedLeft: 0, pitchChipMissedRight: 0,
    pitchChipMissedShort: 0, pitchChipMissedLong: 0,
    greensideBunkerAttempts: 0, greensideBunkerHitGreen: 0,
    puttMissedLongHigh: 0, puttMissedLongLow: 0,
    puttMissedShortHigh: 0, puttMissedShortLow: 0,
    puttMissedLong: 0, puttMissedShort: 0,
    puttMissedHigh: 0, puttMissedLow: 0,
    puttMissedLeft: 0, puttMissedRight: 0,
    // Course & driving
    totalCourseLength: 0, holesWithTeeDistance: 0,
    totalDriveDistance: 0, driveCount: 0, longestDrive: 0,
    // GIR approach
    totalGirApproachDistance: 0, girApproachCount: 0,
  };

  let round: Round;
  try {
    round = await database.get<Round>('rounds').find(roundId);
  } catch (e) {
    console.warn(`Failed to load round ${roundId} for stats:`, e);
    return stats;
  }
  const holes: Hole[] = await round.holes.fetch();

  for (const hole of holes) {
   try {
    if (hole.strokes <= 0) continue;

    const shotData = parseShotData(hole.shotData);
    if (!shotData || shotData.shots.length === 0) continue;

    // Dispatch to V2 or V1 stat accumulation
    if (isShotDataV2(shotData)) {
      accumulateV2HoleStats(stats, shotData, hole.par, hole.strokes);
      continue;
    }

    // ── V1 path (unchanged) ──────────────────────────────────
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

    // Putt analysis: birdie/par putt distances and total feet made
    const puttShots = shotData.shots.filter(
      s => s.type?.toLowerCase() === SHOT_TYPES.PUTT.toLowerCase()
    );

    if (holeStats.firstPuttDistanceFeet !== undefined && puttShots.length > 0) {
      const firstPuttStroke = puttShots[0].stroke;
      const girStroke = hole.par - 1;
      if (firstPuttStroke <= girStroke) {
        stats.totalBirdiePuttFeet += holeStats.firstPuttDistanceFeet;
        stats.birdiePuttCount += 1;
      } else if (firstPuttStroke === girStroke + 1) {
        stats.totalParPuttFeet += holeStats.firstPuttDistanceFeet;
        stats.parPuttCount += 1;
      }
    }

    for (const putt of puttShots) {
      if (putt.results.includes(SHOT_RESULTS.MADE) && putt.puttDistance) {
        const distStr = putt.puttDistance.replace(/\s*(ft|feet)\s*$/i, '').trim();
        const parsed = parseFloat(distStr);
        if (!isNaN(parsed) && parsed > 0) {
          stats.totalPuttFeetMade += parsed;
        }
      }
    }

    if (hole.par > 3) {
      const teeShot = shotData.shots.find(
        s => s.type === SHOT_TYPES.TEE_SHOT || s.type?.toLowerCase() === 'tee'
      );
      if (teeShot) {
        if (teeShot.results.includes(SHOT_RESULTS.LEFT)) stats.teeShotsMissedLeft += 1;
        if (teeShot.results.includes(SHOT_RESULTS.RIGHT)) stats.teeShotsMissedRight += 1;
      }
    }

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
      const r = approach.results;
      if (r.includes(SHOT_RESULTS.LEFT) || r.includes(SHOT_RESULTS.LONG_LEFT) || r.includes(SHOT_RESULTS.SHORT_LEFT)) {
        stats.approachMissedLeft += 1;
      }
      if (r.includes(SHOT_RESULTS.RIGHT) || r.includes(SHOT_RESULTS.LONG_RIGHT) || r.includes(SHOT_RESULTS.SHORT_RIGHT)) {
        stats.approachMissedRight += 1;
      }
    }

    const chipShots = shotData.shots.filter(s => s.type === SHOT_TYPES.CHIP);
    for (const chip of chipShots) {
      const r = chip.results;
      const isShort = r.includes(SHOT_RESULTS.SHORT) || r.includes(SHOT_RESULTS.SHORT_LEFT) || r.includes(SHOT_RESULTS.SHORT_RIGHT);
      const isLong = r.includes(SHOT_RESULTS.LONG) || r.includes(SHOT_RESULTS.LONG_LEFT) || r.includes(SHOT_RESULTS.LONG_RIGHT);
      const isLeft = r.includes(SHOT_RESULTS.LEFT);
      const isRight = r.includes(SHOT_RESULTS.RIGHT);

      if (isShort) stats.chipMissedShort += 1;
      else if (isLong) stats.chipMissedLong += 1;
      else if (isLeft) stats.chipMissedLeft += 1;
      else if (isRight) stats.chipMissedRight += 1;
    }

    for (const shot of shotData.shots) {
      if (shot.penaltyStrokes) {
        stats.totalPenaltyStrokes += shot.penaltyStrokes;
      }
    }

    if (!holeStats.greenInRegulation) {
      stats.totalUpAndDownAttempts += 1;
      if (hole.strokes <= hole.par) {
        stats.totalUpAndDowns += 1;
      }
    }

    const wasInSand = shotData.shots.some(s => {
      if (!s.results.includes(SHOT_RESULTS.SAND)) return false;
      if (s.type === SHOT_TYPES.TEE_SHOT) return hole.par === 3;
      return true;
    });
    if (wasInSand) {
      stats.totalSandSaveAttempts += 1;
      if (hole.strokes <= hole.par) {
        stats.totalSandSaves += 1;
      }
    }
   } catch (e) {
    console.warn(`Skipping hole ${hole.holeNumber} in stats: ${e}`);
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

  // V2: average approach distance is derived, not stored
  // (accessed via totalApproachDistance / approachShotCount by consumers)

  return stats;
}

/**
 * Format running round stats as an SMS text block.
 */
export function formatRunningStatsForSMS(stats: RunningRoundStats): string {
  if (stats.totalHolesPlayed === 0) return '';

  let text = '\n--- Round Stats ---\n';
  if (stats.holesWithTeeDistance > 0) {
    text += `Course Length: ${Math.round(stats.totalCourseLength)} yds\n`;
  }
  if (stats.driveCount > 0) {
    text += `Avg Drive: ${Math.round(stats.totalDriveDistance / stats.driveCount)} yds\n`;
    text += `Longest Drive: ${Math.round(stats.longestDrive)} yds\n`;
  }
  text += `Putts: ${stats.totalPutts}\n`;
  text += `Total Putt Feet Made: ${Math.round(stats.totalPuttFeetMade)} ft\n`;
  if (stats.totalFairwayHoles > 0) {
    text += `Fairways: ${stats.totalFairwaysHit}/${stats.totalFairwayHoles}\n`;
  }
  text += `GIR: ${stats.totalGIR}/${stats.totalHolesPlayed}\n`;
  if (stats.holesWithFirstPuttData > 0) {
    text += `Avg Putt Length: ${stats.avgFirstPuttDistance} ft\n`;
  }
  if (stats.birdiePuttCount > 0) {
    text += `Avg Putt Length (Birdie): ${stats.avgBirdiePuttDistance} ft\n`;
  }
  if (stats.parPuttCount > 0) {
    text += `Avg Putt Length (Par): ${stats.avgParPuttDistance} ft\n`;
  }
  text += `1-Putts: ${stats.totalOnePutts}\n`;
  text += `3-Putts: ${stats.totalThreePutts}\n`;
  if (stats.totalUpAndDownAttempts > 0) {
    text += `Up & Downs: ${stats.totalUpAndDowns}/${stats.totalUpAndDownAttempts}\n`;
  }
  if (stats.totalSandSaveAttempts > 0) {
    text += `Sand Saves: ${stats.totalSandSaves}/${stats.totalSandSaveAttempts}\n`;
  }
  text += `Tee Missed L/R: ${stats.teeShotsMissedLeft}/${stats.teeShotsMissedRight}\n`;
  text += `Approach Missed L/R: ${stats.approachMissedLeft}/${stats.approachMissedRight}\n`;
  const pitchMissTotal = stats.pitchChipMissedLeft + stats.pitchChipMissedRight + stats.pitchChipMissedShort + stats.pitchChipMissedLong;
  const chipMissTotal = stats.chipMissedLeft + stats.chipMissedRight + stats.chipMissedShort + stats.chipMissedLong;
  if (pitchMissTotal > 0) {
    text += `Pitch Miss S/L/R/Lg: ${stats.pitchChipMissedShort}/${stats.pitchChipMissedLeft}/${stats.pitchChipMissedRight}/${stats.pitchChipMissedLong}\n`;
  } else if (chipMissTotal > 0) {
    text += `Chip Miss S/L/R/Lg: ${stats.chipMissedShort}/${stats.chipMissedLeft}/${stats.chipMissedRight}/${stats.chipMissedLong}\n`;
  }
  text += `Penalty Strokes: ${stats.totalPenaltyStrokes}`;

  // V2 stats (only shown when data exists)
  if (stats.approachShotCount > 0) {
    const avgApproach = Math.round(stats.totalApproachDistance / stats.approachShotCount);
    text += `\nAvg Approach: ${avgApproach} yds`;
  }
  if (stats.girApproachCount > 0) {
    const avgGirApproach = Math.round(stats.totalGirApproachDistance / stats.girApproachCount);
    text += `\nAvg GIR Approach: ${avgGirApproach} yds`;
  }
  if (stats.pitchChipAttempts > 0) {
    text += `\nPitch/Chips: ${stats.pitchChipAttempts}`;
  }
  if (stats.greensideBunkerAttempts > 0) {
    text += `\nGreenside Bunker: ${stats.greensideBunkerAttempts}`;
  }
  const puttMissTotal = stats.puttMissedLongHigh + stats.puttMissedLongLow +
    stats.puttMissedShortHigh + stats.puttMissedShortLow +
    stats.puttMissedLong + stats.puttMissedShort +
    stats.puttMissedHigh + stats.puttMissedLow +
    stats.puttMissedLeft + stats.puttMissedRight;
  if (puttMissTotal > 0) {
    const parts: string[] = [];
    if (stats.puttMissedLongHigh > 0) parts.push(`Long-High: ${stats.puttMissedLongHigh}`);
    if (stats.puttMissedLongLow > 0) parts.push(`Long-Low: ${stats.puttMissedLongLow}`);
    if (stats.puttMissedShortHigh > 0) parts.push(`Short-High: ${stats.puttMissedShortHigh}`);
    if (stats.puttMissedShortLow > 0) parts.push(`Short-Low: ${stats.puttMissedShortLow}`);
    if (stats.puttMissedLong > 0) parts.push(`Long: ${stats.puttMissedLong}`);
    if (stats.puttMissedShort > 0) parts.push(`Short: ${stats.puttMissedShort}`);
    if (stats.puttMissedHigh > 0) parts.push(`High: ${stats.puttMissedHigh}`);
    if (stats.puttMissedLow > 0) parts.push(`Low: ${stats.puttMissedLow}`);
    if (stats.puttMissedLeft > 0) parts.push(`Left: ${stats.puttMissedLeft}`);
    if (stats.puttMissedRight > 0) parts.push(`Right: ${stats.puttMissedRight}`);
    text += `\nPutt Misses: ${parts.join(', ')}`;
  }

  return text;
}
