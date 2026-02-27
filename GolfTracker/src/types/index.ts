// ── Shot type and result constants ──────────────────────────────
// Single source of truth for all shot type/result string literals.
// Use these constants instead of bare strings to prevent mismatches.

export const SHOT_TYPES = {
  TEE_SHOT: 'Tee Shot',
  APPROACH: 'Approach',
  PUTT: 'Putt',
  PENALTY: 'Penalty',
} as const;

export type ShotType = typeof SHOT_TYPES[keyof typeof SHOT_TYPES];

export const SHOT_RESULTS = {
  LEFT: 'left',
  RIGHT: 'right',
  CENTER: 'center',
  GREEN: 'green',
  ROUGH: 'rough',
  SAND: 'sand',
  HAZARD: 'hazard',
  OB: 'ob',
  MADE: 'made',
  MISSED: 'missed',
} as const;

export type ShotResult = typeof SHOT_RESULTS[keyof typeof SHOT_RESULTS];

// ── Shot data structures ───────────────────────────────────────
// This is the actual format stored by ShotTrackingScreen in the DB.

export interface TrackedShot {
  stroke: number;
  type: string; // ShotType at write time, but historical data may have variants
  results: string[]; // ShotResult at write time, but historical data may have variants
  puttDistance?: string;
}

export interface ShotData {
  par: number;
  shots: TrackedShot[];
  currentStroke: number;
}

// ── Core domain interfaces ─────────────────────────────────────

export interface GolfHole {
  holeNumber: number;
  par: number;
  strokes: number;
  fairwayHit?: boolean;
  greenInRegulation?: boolean;
  putts?: number;
  notes?: string;
  mediaUrls?: string[];
  shotData?: ShotData;
}

export interface GolfRound {
  id: string;
  name?: string;
  tournamentId?: string;
  tournamentName?: string;
  courseName: string;
  date: Date;
  holes: GolfHole[];
  totalScore?: number;
  totalPutts?: number;
  fairwaysHit?: number;
  greensInRegulation?: number;
  aiAnalysis?: string;
  mediaUrls?: string[];
  createdAt: Date;
  updatedAt: Date;
  isFinished?: boolean;
}

export interface Tournament {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  courseName: string;
  rounds: GolfRound[];
  createdAt: Date;
  updatedAt: Date;
  isComplete?: boolean;
}

export interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  isActive: boolean;
}

export interface MediaItem {
  id: string;
  uri: string;
  type: 'photo' | 'video';
  roundId?: string;
  holeNumber?: number;
  timestamp: Date;
  description?: string;
}

export interface Statistics {
  averageScore: number;
  averagePutts: number;
  fairwayAccuracy: number;
  girPercentage: number;
  bestScore: number;
  worstScore: number;
  totalRounds: number;
  eaglesOrBetter: number;
  birdies: number;
  pars: number;
  bogeys: number;
  doubleBogeyOrWorse: number;
}
