export interface ShotResult {
  type: string;
  result: string;
}

export interface HoleShotData {
  par: 3 | 4 | 5;
  teeShot?: string;
  approach?: string;
  chip?: string;
  greensideBunker?: string;
  fairwayBunker?: string;
  troubleShot?: string;
  putts: string[];
}

export interface GolfHole {
  holeNumber: number;
  par: number;
  strokes: number;
  fairwayHit?: boolean;
  greenInRegulation?: boolean;
  putts?: number;
  notes?: string;
  mediaUrls?: string[];
  shotData?: HoleShotData;
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
  bestRound: number;
  worstRound: number;
  totalRounds: number;
  eaglesOrBetter: number;
  birdies: number;
  pars: number;
  bogeys: number;
  doubleBogeyOrWorse: number;
}

// Shot tracking options
export const TEE_SHOT_OPTIONS_PAR3 = [
  'Left', 'Right', 'Short', 'Long', 'On Green', 'Bunker'
];

export const TEE_SHOT_OPTIONS_PAR45 = [
  'Left', 'Fairway', 'Right', 'Bunker', 'Hazard'
];

export const APPROACH_OPTIONS = [
  'Left', 'Right', 'Green', 'Long', 'Short'
];

export const CHIP_OPTIONS = [
  'Left', 'Right', 'Long', 'Short', 'On Target'
];

export const BUNKER_OPTIONS = [
  'Long', 'Short', 'Right', 'Left', 'On Target'
];

export const TROUBLE_SHOT_OPTIONS = [
  'Long', 'Short', 'Left', 'Right', 'On Target'
];

export const PUTT_OPTIONS = [
  'Long', 'Short', 'High', 'Low', 'On Target', 'In Hole'
];