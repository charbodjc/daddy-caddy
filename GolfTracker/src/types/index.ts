// ── Shot type and result constants ──────────────────────────────
// Single source of truth for all shot type/result string literals.
// Use these constants instead of bare strings to prevent mismatches.

export const SHOT_TYPES = {
  TEE_SHOT: 'Tee Shot',
  APPROACH: 'Approach',
  CHIP: 'Chip',
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
  LOST: 'lost',
  MADE: 'made',
  MISSED: 'missed',
  SHORT: 'short',
  LONG: 'long',
  LONG_LEFT: 'long_left',
  LONG_RIGHT: 'long_right',
  SHORT_LEFT: 'short_left',
  SHORT_RIGHT: 'short_right',
  FAIRWAY: 'fairway',
  WATER: 'water',
  BBD: 'bbd',
} as const;

export type ShotResult = typeof SHOT_RESULTS[keyof typeof SHOT_RESULTS];

// ── Shot data structures (V1 — legacy) ────────────────────────
// Original format stored by the compass-first scoring UI.

export interface TrackedShot {
  stroke: number;
  type: string; // ShotType at write time, but historical data may have variants
  results: string[]; // ShotResult at write time, but historical data may have variants
  puttDistance?: string;
  /** Distance remaining after this shot, in yards (e.g. "150 yds"). Off-green only. */
  distance?: string;
  /** Extra strokes added by a penalty (1 for OB/lost ball, 2 for stroke-and-distance). 0 or undefined for normal shots. */
  penaltyStrokes?: number;
}

export interface ShotData {
  par: number;
  shots: TrackedShot[];
  currentStroke: number;
}

// ── Shot data structures (V2 — telephone scoring) ─────────────
// Structured per-shot data with explicit lie, distance, swing, and result fields.

export const LIE_TYPES = {
  TEE: 'tee',
  FAIRWAY: 'fairway',
  ROUGH: 'rough',
  SAND: 'sand',
  GREEN: 'green',
  TROUBLE: 'trouble',
} as const;

export type LieType = typeof LIE_TYPES[keyof typeof LIE_TYPES];

export const SWING_TYPES = {
  FREE: 'free',
  RESTRICTED: 'restricted',
} as const;

export type SwingType = typeof SWING_TYPES[keyof typeof SWING_TYPES];

export const MISS_DIRECTIONS = {
  LEFT: 'left',
  RIGHT: 'right',
  SHORT: 'short',
  LONG: 'long',
  SHORT_LEFT: 'short_left',
  SHORT_RIGHT: 'short_right',
  LONG_LEFT: 'long_left',
  LONG_RIGHT: 'long_right',
} as const;

export type MissDirection = typeof MISS_DIRECTIONS[keyof typeof MISS_DIRECTIONS];

export const SHOT_OUTCOMES = {
  ON_TARGET: 'on_target',
  MISSED: 'missed',
  HOLED: 'holed',
  PENALTY: 'penalty',
} as const;

export type ShotOutcome = typeof SHOT_OUTCOMES[keyof typeof SHOT_OUTCOMES];

export const PENALTY_TYPES = {
  OB: 'ob',
  HAZARD: 'hazard',
  LOST: 'lost',
} as const;

export type PenaltyType = typeof PENALTY_TYPES[keyof typeof PENALTY_TYPES];

export const PUTT_MISS_DISTANCE = {
  LONG: 'long',
  SHORT: 'short',
} as const;

export type PuttMissDistance = typeof PUTT_MISS_DISTANCE[keyof typeof PUTT_MISS_DISTANCE];

export const PUTT_MISS_BREAK = {
  HIGH: 'high',
  LOW: 'low',
} as const;

export type PuttMissBreak = typeof PUTT_MISS_BREAK[keyof typeof PUTT_MISS_BREAK];

export type DistanceUnit = 'yds' | 'ft';

export interface TrackedShotV2 {
  stroke: number;

  // Starting conditions
  lie: LieType;
  distanceToHole?: number;
  distanceUnit: DistanceUnit;
  swing: SwingType;

  // Result
  outcome: ShotOutcome;
  missDirection?: MissDirection;
  puttMissDistance?: PuttMissDistance;
  puttMissBreak?: PuttMissBreak;
  resultLie?: LieType;
  penaltyType?: PenaltyType;
  penaltyStrokes?: number;
}

export interface ShotDataV2 {
  version: 2;
  par: number;
  shots: TrackedShotV2[];
  currentStroke: number;
}

/** Type guard: returns true if parsed shot data is V2 format. */
export function isShotDataV2(data: ShotData | ShotDataV2): data is ShotDataV2 {
  return 'version' in data && data.version === 2;
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
  shotData?: ShotData | ShotDataV2;
}

export interface SmsContact {
  id: string;
  name: string;
  phoneNumber: string;
}

/** Lightweight golfer display info for UI components (avatars, labels). */
export interface GolferInfo {
  id: string;
  name: string;
  color: string;
  emoji?: string;
}

export interface Golfer {
  id: string;
  name: string;
  handicap?: number;
  color: string;
  isDefault: boolean;
  smsContacts: SmsContact[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GolfRound {
  id: string;
  name?: string;
  golferId?: string;
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
