// Types are defined inline to avoid circular dependencies between the module
// and the app's src/ directory. Values MUST match the enums in src/types/index.ts.

export type ScoringPhaseV2 =
  | 'awaiting_distance'
  | 'awaiting_result'
  | 'awaiting_result_lie'
  | 'hole_complete';

export type LieType = 'tee' | 'fairway' | 'rough' | 'sand' | 'green' | 'trouble';
export type SwingType = 'free' | 'restricted';
export type MissDirection = 'left' | 'right' | 'short' | 'long' | 'short_left' | 'short_right' | 'long_left' | 'long_right';
export type PenaltyType = 'ob' | 'hazard' | 'lost';
export type PuttMissDistance = 'long' | 'short';
export type PuttMissBreak = 'high' | 'low';
export type DistanceUnit = 'yds' | 'ft';
export type ShotOutcome = 'on_target' | 'missed' | 'holed' | 'penalty';

export interface TrackedShotV2 {
  stroke: number;
  lie: LieType;
  distanceToHole?: number;
  distanceUnit: DistanceUnit;
  swing: SwingType;
  outcome: ShotOutcome;
  missDirection?: MissDirection;
  puttMissDistance?: PuttMissDistance;
  puttMissBreak?: PuttMissBreak;
  resultLie?: LieType;
  penaltyType?: PenaltyType;
  penaltyStrokes?: number;
}

// ── Phone → Watch (Application Context) ─────────────────────

export interface WatchHoleScore {
  number: number;
  par: number;
  strokes: number;
  holeId: string;
}

export interface WatchScoringState {
  phase: ScoringPhaseV2;
  shots: TrackedShotV2[];
  currentStroke: number;
  par: number;
  currentLie: LieType;
  isOnGreen: boolean;
  pendingDistance: number | null;
  pendingDistanceUnit: DistanceUnit;
  pendingSwing: SwingType;
  pendingMissDirection: MissDirection | null;
}

export interface WatchRoundContext {
  roundId: string;
  courseName: string;
  currentHoleNumber: number;
  currentHoleId: string;
  totalHoles: number;
  totalScore: number;
  scoreVsPar: number;
  holesCompleted: number;
  scoring: WatchScoringState;
  holes: WatchHoleScore[];
}

// ── Watch → Phone (Events) ──────────────────────────────────

export type WatchScoringActionPayload =
  | { type: 'SUBMIT_DISTANCE'; value: number }
  | { type: 'SKIP_DISTANCE' }
  | { type: 'TOGGLE_SWING' }
  | { type: 'SET_LIE'; lie: LieType }
  | { type: 'TAP_CENTER_RESULT'; result: 'fairway' | 'green' | 'hole' }
  | { type: 'TAP_DIRECTION'; direction: MissDirection }
  | { type: 'TAP_RESULT_LIE'; lie: LieType }
  | { type: 'TAP_PENALTY_LIE'; penaltyType: PenaltyType }
  | { type: 'TAP_PUTT_MADE' }
  | { type: 'TAP_PUTT_MISS'; distance: PuttMissDistance; break: PuttMissBreak };

export interface WatchScoringActionEvent {
  messageId: string;
  roundId: string;
  holeId: string;
  action: WatchScoringActionPayload;
}

export interface WatchNavigateHoleEvent {
  messageId: string;
  roundId: string;
  holeNumber: number;
  holeId: string;
}

export interface WatchReachabilityEvent {
  reachable: boolean;
}
