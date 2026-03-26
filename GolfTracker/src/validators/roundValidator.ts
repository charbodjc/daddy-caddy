import { z } from 'zod';

export const holeSchema = z.object({
  holeNumber: z.number().min(1).max(18),
  par: z.number().min(3).max(5),
  strokes: z.number().min(0).max(20),
  fairwayHit: z.boolean().optional(),
  greenInRegulation: z.boolean().optional(),
  putts: z.number().min(0).max(10).optional(),
  notes: z.string().max(500).optional(),
  shotData: z.string().optional(), // JSON string
});

export const roundSchema = z.object({
  courseName: z.string().min(1, 'Course name is required').max(100),
  date: z.date(),
  holes: z.array(holeSchema).length(18, 'A round must have exactly 18 holes'),
  tournamentId: z.string().optional(),
  tournamentName: z.string().optional(),
  totalScore: z.number().optional(),
  totalPutts: z.number().optional(),
  fairwaysHit: z.number().min(0).max(14).optional(),
  greensInRegulation: z.number().min(0).max(18).optional(),
  isFinished: z.boolean().optional(),
});

export const createRoundSchema = z.object({
  courseName: z.string().min(1).max(100),
  date: z.date().optional(),
  golferId: z.string().optional(),
  tournamentId: z.string().optional(),
  tournamentName: z.string().optional(),
});

export type HoleData = z.infer<typeof holeSchema>;
export type RoundData = z.infer<typeof roundSchema>;
export type CreateRoundData = z.infer<typeof createRoundSchema>;

// ── V2 Shot Data Validators ──────────────────────────────────

const lieTypeSchema = z.enum(['tee', 'fairway', 'rough', 'sand', 'green', 'trouble']);
const swingTypeSchema = z.enum(['free', 'restricted']);
const missDirectionSchema = z.enum([
  'left', 'right', 'short', 'long',
  'short_left', 'short_right', 'long_left', 'long_right',
]);
const shotOutcomeSchema = z.enum(['on_target', 'missed', 'holed', 'penalty']);
const penaltyTypeSchema = z.enum(['ob', 'hazard', 'lost']);
const puttMissDistanceSchema = z.enum(['long', 'short']);
const puttMissBreakSchema = z.enum(['high', 'low']);

export const trackedShotV2Schema = z.object({
  stroke: z.number().min(1).max(20),
  lie: lieTypeSchema,
  distanceToHole: z.number().min(0).max(700).optional(),
  distanceUnit: z.enum(['yds', 'ft']),
  swing: swingTypeSchema,
  outcome: shotOutcomeSchema,
  missDirection: missDirectionSchema.optional(),
  puttMissDistance: puttMissDistanceSchema.optional(),
  puttMissBreak: puttMissBreakSchema.optional(),
  resultLie: lieTypeSchema.optional(),
  penaltyType: penaltyTypeSchema.optional(),
  penaltyStrokes: z.number().min(0).max(2).optional(),
});

export const shotDataV2Schema = z.object({
  version: z.literal(2),
  par: z.number().min(3).max(5),
  shots: z.array(trackedShotV2Schema),
  currentStroke: z.number().min(1),
});

export type TrackedShotV2Data = z.infer<typeof trackedShotV2Schema>;
export type ShotDataV2Data = z.infer<typeof shotDataV2Schema>;

export const safeValidateShotDataV2 = (data: unknown): { success: boolean; data?: ShotDataV2Data; error?: string } => {
  const result = shotDataV2Schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.issues[0].message };
};

export const validateHole = (data: unknown): HoleData => {
  return holeSchema.parse(data);
};

export const validateRound = (data: unknown): RoundData => {
  return roundSchema.parse(data);
};

export const validateCreateRound = (data: unknown): CreateRoundData => {
  return createRoundSchema.parse(data);
};

// Helper function for safe validation with error handling
export const safeValidateHole = (data: unknown): { success: boolean; data?: HoleData; error?: string } => {
  const result = holeSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.issues[0].message };
};

export const safeValidateRound = (data: unknown): { success: boolean; data?: RoundData; error?: string } => {
  const result = roundSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.issues[0].message };
};

