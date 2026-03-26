/**
 * shotDataV2Helpers.ts
 *
 * Shared display helpers for V2 shot data.
 * Used by ShotLogBar, HoleSummaryScreen, HoleDetailsScreen, SMS, and AI services.
 */

import type { TrackedShotV2, LieType } from '../types';
import { LIE_TYPES, SHOT_OUTCOMES } from '../types';

// ── Lie display ──────────────────────────────────────────────

const LIE_LABELS: Record<LieType, string> = {
  tee: 'Tee',
  fairway: 'Fairway',
  rough: 'Rough',
  sand: 'Bunker',
  green: 'Green',
  trouble: 'Trouble',
};

const LIE_COLORS: Record<LieType, string> = {
  tee: '#4CAF50',
  fairway: '#4CAF50',
  rough: '#8BC34A',
  sand: '#F4B400',
  green: '#2E7D32',
  trouble: '#F44336',
};

const LIE_ICONS: Record<LieType, string> = {
  tee: 'golf-course',
  fairway: 'grass',
  rough: 'grass',
  sand: 'beach-access',
  green: 'flag',
  trouble: 'warning',
};

export function lieLabel(lie: LieType): string {
  return LIE_LABELS[lie] ?? lie;
}

export function lieColor(lie: LieType): string {
  return LIE_COLORS[lie] ?? '#666';
}

export function lieIcon(lie: LieType): string {
  return LIE_ICONS[lie] ?? 'help-outline';
}

// ── Shot summary label ───────────────────────────────────────

export function shotLabelV2(shot: TrackedShotV2): string {
  const parts: string[] = [];

  // Lie + distance
  const lieName = lieLabel(shot.lie);
  if (shot.distanceToHole !== undefined) {
    parts.push(`${lieName} ${shot.distanceToHole} ${shot.distanceUnit}`);
  } else {
    parts.push(lieName);
  }

  // Result
  if (shot.outcome === SHOT_OUTCOMES.HOLED) {
    parts.push('→ Holed');
  } else if (shot.outcome === SHOT_OUTCOMES.ON_TARGET) {
    const target = shot.resultLie ? lieLabel(shot.resultLie) : 'on target';
    parts.push(`→ ${target}`);
  } else if (shot.outcome === SHOT_OUTCOMES.PENALTY) {
    const penaltyLabel = shot.penaltyType?.toUpperCase() ?? 'Penalty';
    parts.push(`→ ${penaltyLabel}`);
  } else if (shot.outcome === SHOT_OUTCOMES.MISSED) {
    if (shot.lie === LIE_TYPES.GREEN) {
      // Putt miss: long/short + high/low, or left/right for straight putts
      const distPart = shot.puttMissDistance ?? '';
      const breakPart = shot.puttMissBreak ?? '';
      const sidePart = shot.missDirection?.replace('_', ' ') ?? '';
      const missDesc = [distPart, breakPart, sidePart].filter(Boolean).join(' ');
      parts.push(`→ missed ${missDesc || 'putt'}`);
    } else {
      // Off-green miss: direction + result lie
      const dir = shot.missDirection?.replace('_', ' ') ?? '';
      const resultLieName = shot.resultLie ? lieLabel(shot.resultLie) : '';
      parts.push(`→ ${dir} ${resultLieName}`.trim());
    }
  }

  return parts.join(' ');
}

// ── Shot color (for shot log dots / icons) ───────────────────

export function shotColorV2(shot: TrackedShotV2): string {
  if (shot.outcome === SHOT_OUTCOMES.HOLED) return '#FFD700';
  if (shot.outcome === SHOT_OUTCOMES.ON_TARGET) {
    if (shot.resultLie === LIE_TYPES.GREEN) return '#4CAF50';
    if (shot.resultLie === LIE_TYPES.FAIRWAY) return '#4CAF50';
    return '#8BC34A';
  }
  if (shot.outcome === SHOT_OUTCOMES.PENALTY) return '#F44336';
  // missed
  if (shot.resultLie === LIE_TYPES.SAND) return '#F4B400';
  if (shot.resultLie === LIE_TYPES.TROUBLE) return '#F44336';
  return '#FF9800';
}

// ── Shot icon name (MaterialIcons) ───────────────────────────

export function shotIconV2(shot: TrackedShotV2): string {
  if (shot.outcome === SHOT_OUTCOMES.HOLED) return 'sports-golf';
  if (shot.lie === LIE_TYPES.GREEN) return 'flag';
  if (shot.lie === LIE_TYPES.TEE) return 'golf-course';
  if (shot.outcome === SHOT_OUTCOMES.PENALTY) return 'error-outline';
  return 'sports-golf';
}

// ── Derive shot type label (for display, not stored) ─────────

export function derivedShotTypeV2(shot: TrackedShotV2): string {
  if (shot.lie === LIE_TYPES.TEE) return 'Tee Shot';
  if (shot.lie === LIE_TYPES.GREEN) return 'Putt';
  if (shot.distanceToHole !== undefined && shot.distanceToHole < 50 && shot.distanceUnit === 'yds') {
    return shot.lie === LIE_TYPES.SAND ? 'Bunker Shot' : 'Chip';
  }
  return 'Approach';
}

// ── Total strokes for V2 shots ───────────────────────────────

export function calculateTotalStrokesV2(shots: TrackedShotV2[]): number {
  const penaltyExtra = shots.reduce((sum, s) => sum + (s.penaltyStrokes ?? 0), 0);
  return shots.length + penaltyExtra;
}
