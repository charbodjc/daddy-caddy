/**
 * golfVoiceParser.ts
 *
 * Pure function that maps speech-to-text transcriptions to golf shot data.
 * No API calls — uses keyword matching with context-aware disambiguation.
 * Works entirely offline.
 */

import { SHOT_TYPES, SHOT_RESULTS } from '../types';
import { getNextShotOptions } from './shotStateMachine';
import type { ShotContext } from './shotStateMachine';

export interface VoiceParseResult {
  shotType: string;
  result: string;
  puttDistance?: string;
  penaltyStrokes?: number;
  confidence: 'high' | 'low';
}

// ── Keyword maps ───────────────────────────────────────────────

interface KeywordEntry {
  patterns: RegExp[];
  result: string;
}

const LOCATION_KEYWORDS: KeywordEntry[] = [
  { patterns: [/\bfairway\b/i], result: SHOT_RESULTS.CENTER },
  { patterns: [/\bon\s*(the\s*)?green\b/i, /\bhit\s*(the\s*)?green\b/i, /\b(on\s*)?green\b/i], result: SHOT_RESULTS.GREEN },
  { patterns: [/\bleft\s*rough\b/i, /\bleft\b/i], result: SHOT_RESULTS.LEFT },
  { patterns: [/\bright\s*rough\b/i, /\bright\b/i], result: SHOT_RESULTS.RIGHT },
  { patterns: [/\brough\b/i], result: SHOT_RESULTS.ROUGH },
  { patterns: [/\bsand\b/i, /\bbunker\b/i, /\btrap\b/i, /\bbeach\b/i], result: SHOT_RESULTS.SAND },
  { patterns: [/\bhazard\b/i, /\bwater\b/i, /\bpenalty\s*area\b/i], result: SHOT_RESULTS.HAZARD },
  { patterns: [/\bo\.?b\.?(?:\s|$|[^a-z])/i, /\bout\s*of\s*bounds\b/i], result: SHOT_RESULTS.OB },
];

const PUTT_KEYWORDS: KeywordEntry[] = [
  { patterns: [/\bmade\b/i, /\bmade\s*it\b/i, /\bin\s*(the\s*)?hole\b/i, /\bsank\b/i, /\bsunk\b/i, /\bdrained\b/i], result: SHOT_RESULTS.MADE },
  { patterns: [/\bmiss(ed)?\b/i, /\blip(ped)?\b/i, /\bburned?\s*(the\s*)?edge\b/i], result: SHOT_RESULTS.MISSED },
];

const PENALTY_KEYWORDS: KeywordEntry[] = [
  { patterns: [/\bo\.?b\.?(?:\s|$|[^a-z])/i, /\bout\s*of\s*bounds\b/i], result: SHOT_RESULTS.OB },
  { patterns: [/\bhazard\b/i, /\bwater\b/i, /\bpenalty\s*area\b/i], result: SHOT_RESULTS.HAZARD },
  { patterns: [/\blost\s*ball\b/i, /\blost\b/i], result: SHOT_RESULTS.OB },
];

// Distance pattern: "8 feet", "8 ft", "8 foot" — unit required to avoid matching stray numbers
const DISTANCE_PATTERN = /\b(\d+)\s*(?:feet|foot|ft)\b/i;

// Explicit penalty mention
const PENALTY_MENTION = /\bpenalty\b/i;

// ── Main parser ────────────────────────────────────────────────

/**
 * Parses a speech transcription into a golf shot result.
 * Returns null if the transcript can't be meaningfully parsed.
 */
export function parseGolfVoice(
  transcript: string,
  context: ShotContext,
): VoiceParseResult | null {
  if (!transcript || transcript.trim().length === 0) return null;

  const text = transcript.trim().toLowerCase();

  // Check for explicit penalty mention
  if (PENALTY_MENTION.test(text) || /\blost\s*ball\b/i.test(text)) {
    return parsePenalty(text);
  }

  // Context-aware parsing based on recommended shot type
  const { recommendedType } = getRecommendedType(context);

  if (recommendedType === SHOT_TYPES.PUTT) {
    return parsePuttInput(text, context);
  }

  if (recommendedType === SHOT_TYPES.TEE_SHOT || recommendedType === SHOT_TYPES.APPROACH) {
    return parseLocationInput(text, recommendedType);
  }

  return null;
}

// ── Sub-parsers ────────────────────────────────────────────────

function parsePuttInput(text: string, _context: ShotContext): VoiceParseResult | null {
  // Check for made/missed keywords first
  const puttResult = matchKeywords(text, PUTT_KEYWORDS);
  const distance = extractDistance(text);

  if (puttResult) {
    return {
      shotType: SHOT_TYPES.PUTT,
      result: puttResult,
      ...(distance ? { puttDistance: `${distance} ft` } : {}),
      confidence: 'high',
    };
  }

  // If just a distance with no made/missed, infer missed (still need to putt again)
  if (distance) {
    return {
      shotType: SHOT_TYPES.PUTT,
      result: SHOT_RESULTS.MISSED,
      puttDistance: `${distance} ft`,
      confidence: 'low',
    };
  }

  // In putting context, directional words map to missed
  const locationResult = matchKeywords(text, LOCATION_KEYWORDS);
  if (locationResult) {
    return {
      shotType: SHOT_TYPES.PUTT,
      result: SHOT_RESULTS.MISSED,
      confidence: 'low',
    };
  }

  return null;
}

function parseLocationInput(text: string, shotType: string): VoiceParseResult | null {
  const result = matchKeywords(text, LOCATION_KEYWORDS);

  if (result) {
    return {
      shotType,
      result,
      confidence: 'high',
    };
  }

  return null;
}

function parsePenalty(text: string): VoiceParseResult | null {
  const result = matchKeywords(text, PENALTY_KEYWORDS);

  // Check for "2 stroke" penalty
  const twoStroke = /\b2\s*stroke/i.test(text);

  return {
    shotType: SHOT_TYPES.PENALTY,
    result: result || SHOT_RESULTS.OB, // default to OB
    penaltyStrokes: twoStroke ? 2 : 1,
    confidence: result ? 'high' : 'low',
  };
}

// ── Helpers ────────────────────────────────────────────────────

function matchKeywords(text: string, keywords: KeywordEntry[]): string | null {
  for (const entry of keywords) {
    for (const pattern of entry.patterns) {
      if (pattern.test(text)) {
        return entry.result;
      }
    }
  }
  return null;
}

function extractDistance(text: string): number | null {
  const match = text.match(DISTANCE_PATTERN);
  if (match) {
    const num = parseInt(match[1], 10);
    // Sanity check: putt distances are typically 1-100 feet
    if (num >= 1 && num <= 100) {
      return num;
    }
  }
  return null;
}

function getRecommendedType(context: ShotContext): { recommendedType: string } {
  return { recommendedType: getNextShotOptions(context).recommendedType };
}
