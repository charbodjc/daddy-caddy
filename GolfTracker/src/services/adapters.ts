import type { GolfRound, GolfHole } from '../types';
import type Round from '../database/watermelon/models/Round';
import type Hole from '../database/watermelon/models/Hole';
import { parseShotData } from '../utils/roundStats';

/**
 * Convert a WatermelonDB Hole model to the legacy GolfHole interface
 * used by AI and SMS services.
 */
export function holeToGolfHole(hole: Hole): GolfHole {
  return {
    holeNumber: hole.holeNumber,
    par: hole.par,
    strokes: hole.strokes,
    fairwayHit: hole.fairwayHit,
    greenInRegulation: hole.greenInRegulation,
    putts: hole.putts,
    notes: hole.notes,
    shotData: hole.shotData ? parseShotData(hole.shotData) ?? undefined : undefined,
  };
}

/**
 * Convert a WatermelonDB Round model + its holes to the legacy GolfRound
 * interface used by AI and SMS services.
 */
export function roundToGolfRound(round: Round, holes: Hole[]): GolfRound {
  return {
    id: round.id,
    courseName: round.courseName,
    golferId: round.golferId,
    tournamentId: round.tournamentId,
    tournamentName: round.tournamentName,
    date: round.date,
    holes: holes.map(holeToGolfHole),
    totalScore: round.totalScore,
    totalPutts: round.totalPutts,
    fairwaysHit: round.fairwaysHit,
    greensInRegulation: round.greensInRegulation,
    aiAnalysis: round.aiAnalysis,
    isFinished: round.isFinished,
    createdAt: round.createdAt,
    updatedAt: round.updatedAt,
  };
}
