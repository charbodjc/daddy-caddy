import { getNextShotOptions, getResultsForType } from '../../src/utils/shotStateMachine';
import { SHOT_TYPES, SHOT_RESULTS, TrackedShot } from '../../src/types';

// Helper to build a TrackedShot
function shot(stroke: number, type: string, result: string, extra?: Partial<TrackedShot>): TrackedShot {
  return { stroke, type, results: [result], ...extra };
}

// Helper to extract result values from options
function resultValues(options: { value: string }[]): string[] {
  return options.map(o => o.value);
}

describe('shotStateMachine', () => {
  describe('getNextShotOptions', () => {
    // ── Tee shot options by par ──────────────────────────────

    it('par 3 shot 1: has On Green, no Fairway', () => {
      const opts = getNextShotOptions({ par: 3, shotNumber: 1, previousShots: [] });
      const values = resultValues(opts.resultOptions);

      expect(opts.recommendedType).toBe(SHOT_TYPES.TEE_SHOT);
      expect(values).toContain(SHOT_RESULTS.GREEN);
      expect(values).not.toContain(SHOT_RESULTS.CENTER); // no Fairway
    });

    it('par 4 shot 1: has Fairway AND On Green (driveable par 4s)', () => {
      const opts = getNextShotOptions({ par: 4, shotNumber: 1, previousShots: [] });
      const values = resultValues(opts.resultOptions);

      expect(opts.recommendedType).toBe(SHOT_TYPES.TEE_SHOT);
      expect(values).toContain(SHOT_RESULTS.CENTER); // Fairway
      expect(values).toContain(SHOT_RESULTS.GREEN);  // On Green
    });

    it('par 5 shot 1: has Fairway, no On Green', () => {
      const opts = getNextShotOptions({ par: 5, shotNumber: 1, previousShots: [] });
      const values = resultValues(opts.resultOptions);

      expect(opts.recommendedType).toBe(SHOT_TYPES.TEE_SHOT);
      expect(values).toContain(SHOT_RESULTS.CENTER); // Fairway
      expect(values).not.toContain(SHOT_RESULTS.GREEN); // no On Green
    });

    // ── Auto-advance logic ───────────────────────────────────

    it('after tee shot → fairway: recommends APPROACH', () => {
      const previousShots = [shot(1, SHOT_TYPES.TEE_SHOT, SHOT_RESULTS.CENTER)];
      const opts = getNextShotOptions({ par: 4, shotNumber: 2, previousShots });

      expect(opts.recommendedType).toBe(SHOT_TYPES.APPROACH);
    });

    it('after tee shot → green: recommends PUTT', () => {
      const previousShots = [shot(1, SHOT_TYPES.TEE_SHOT, SHOT_RESULTS.GREEN)];
      const opts = getNextShotOptions({ par: 3, shotNumber: 2, previousShots });

      expect(opts.recommendedType).toBe(SHOT_TYPES.PUTT);
    });

    it('after approach miss: stays APPROACH', () => {
      const previousShots = [
        shot(1, SHOT_TYPES.TEE_SHOT, SHOT_RESULTS.CENTER),
        shot(2, SHOT_TYPES.APPROACH, SHOT_RESULTS.LEFT),
      ];
      const opts = getNextShotOptions({ par: 4, shotNumber: 3, previousShots });

      expect(opts.recommendedType).toBe(SHOT_TYPES.APPROACH);
    });

    it('after approach → green: recommends PUTT', () => {
      const previousShots = [
        shot(1, SHOT_TYPES.TEE_SHOT, SHOT_RESULTS.CENTER),
        shot(2, SHOT_TYPES.APPROACH, SHOT_RESULTS.GREEN),
      ];
      const opts = getNextShotOptions({ par: 4, shotNumber: 3, previousShots });

      expect(opts.recommendedType).toBe(SHOT_TYPES.PUTT);
    });

    it('after penalty: recommends APPROACH', () => {
      const previousShots = [
        shot(1, SHOT_TYPES.TEE_SHOT, SHOT_RESULTS.OB),
        shot(2, SHOT_TYPES.PENALTY, SHOT_RESULTS.OB, { penaltyStrokes: 1 }),
      ];
      const opts = getNextShotOptions({ par: 4, shotNumber: 3, previousShots });

      expect(opts.recommendedType).toBe(SHOT_TYPES.APPROACH);
    });

    it('putt missed: stays PUTT', () => {
      const previousShots = [
        shot(1, SHOT_TYPES.TEE_SHOT, SHOT_RESULTS.GREEN),
        shot(2, SHOT_TYPES.PUTT, SHOT_RESULTS.MISSED),
      ];
      const opts = getNextShotOptions({ par: 3, shotNumber: 3, previousShots });

      expect(opts.recommendedType).toBe(SHOT_TYPES.PUTT);
    });

    // ── Previous-shot-aware approach options ──────────────────

    it('approach from sand: shows sand-specific options', () => {
      const previousShots = [
        shot(1, SHOT_TYPES.TEE_SHOT, SHOT_RESULTS.SAND),
      ];
      const opts = getNextShotOptions({ par: 4, shotNumber: 2, previousShots });
      const values = resultValues(opts.resultOptions);

      expect(opts.recommendedType).toBe(SHOT_TYPES.APPROACH);
      expect(values).toContain(SHOT_RESULTS.GREEN);
      expect(values).toContain(SHOT_RESULTS.SAND); // can stay in sand
      expect(values).not.toContain(SHOT_RESULTS.HAZARD); // not relevant from sand
    });

    it('approach from rough: shows rough-specific options', () => {
      const previousShots = [
        shot(1, SHOT_TYPES.TEE_SHOT, SHOT_RESULTS.ROUGH),
      ];
      const opts = getNextShotOptions({ par: 4, shotNumber: 2, previousShots });
      const values = resultValues(opts.resultOptions);

      expect(opts.recommendedType).toBe(SHOT_TYPES.APPROACH);
      expect(values).toContain(SHOT_RESULTS.GREEN);
      expect(values).toContain(SHOT_RESULTS.ROUGH);
      expect(values).toContain(SHOT_RESULTS.SAND);
    });

    it('approach from fairway: shows standard options', () => {
      const previousShots = [
        shot(1, SHOT_TYPES.TEE_SHOT, SHOT_RESULTS.CENTER),
      ];
      const opts = getNextShotOptions({ par: 4, shotNumber: 2, previousShots });
      const values = resultValues(opts.resultOptions);

      expect(values).toContain(SHOT_RESULTS.GREEN);
      expect(values).toContain(SHOT_RESULTS.HAZARD);
      expect(values).toContain(SHOT_RESULTS.SAND);
    });

    // ── Available types ──────────────────────────────────────

    it('penalty is always available as manual override', () => {
      const opts = getNextShotOptions({ par: 4, shotNumber: 1, previousShots: [] });
      expect(opts.availableTypes).toContain(SHOT_TYPES.PENALTY);
    });

    it('putt is available when on approach (for chip-close situations)', () => {
      const previousShots = [shot(1, SHOT_TYPES.TEE_SHOT, SHOT_RESULTS.CENTER)];
      const opts = getNextShotOptions({ par: 4, shotNumber: 2, previousShots });

      expect(opts.availableTypes).toContain(SHOT_TYPES.APPROACH);
      expect(opts.availableTypes).toContain(SHOT_TYPES.PUTT);
      expect(opts.availableTypes).toContain(SHOT_TYPES.PENALTY);
    });

    // ── Edge cases ───────────────────────────────────────────

    it('shot 7 on a par 3: still works correctly', () => {
      const previousShots = [
        shot(1, SHOT_TYPES.TEE_SHOT, SHOT_RESULTS.LEFT),
        shot(2, SHOT_TYPES.APPROACH, SHOT_RESULTS.RIGHT),
        shot(3, SHOT_TYPES.APPROACH, SHOT_RESULTS.SAND),
        shot(4, SHOT_TYPES.APPROACH, SHOT_RESULTS.GREEN),
        shot(5, SHOT_TYPES.PUTT, SHOT_RESULTS.MISSED),
        shot(6, SHOT_TYPES.PUTT, SHOT_RESULTS.MISSED),
      ];
      const opts = getNextShotOptions({ par: 3, shotNumber: 7, previousShots });

      expect(opts.recommendedType).toBe(SHOT_TYPES.PUTT);
      expect(resultValues(opts.resultOptions)).toContain(SHOT_RESULTS.MADE);
    });

    it('approach after penalty skips the penalty for context', () => {
      const previousShots = [
        shot(1, SHOT_TYPES.TEE_SHOT, SHOT_RESULTS.SAND),
        shot(2, SHOT_TYPES.PENALTY, SHOT_RESULTS.OB, { penaltyStrokes: 1 }),
      ];
      const opts = getNextShotOptions({ par: 4, shotNumber: 3, previousShots });

      // Should use the tee shot (sand) as context, not the penalty
      expect(opts.recommendedType).toBe(SHOT_TYPES.APPROACH);
    });
  });

  describe('getResultsForType', () => {
    it('returns par-aware tee shot options', () => {
      const ctx3 = { par: 3, shotNumber: 1, previousShots: [] };
      const ctx5 = { par: 5, shotNumber: 1, previousShots: [] };

      const par3Values = resultValues(getResultsForType(ctx3, SHOT_TYPES.TEE_SHOT));
      const par5Values = resultValues(getResultsForType(ctx5, SHOT_TYPES.TEE_SHOT));

      expect(par3Values).toContain(SHOT_RESULTS.GREEN);
      expect(par3Values).not.toContain(SHOT_RESULTS.CENTER);

      expect(par5Values).toContain(SHOT_RESULTS.CENTER);
      expect(par5Values).not.toContain(SHOT_RESULTS.GREEN);
    });

    it('returns context-aware approach options', () => {
      const fromSand = {
        par: 4,
        shotNumber: 2,
        previousShots: [shot(1, SHOT_TYPES.TEE_SHOT, SHOT_RESULTS.SAND)],
      };
      const sandValues = resultValues(getResultsForType(fromSand, SHOT_TYPES.APPROACH));

      expect(sandValues).toContain(SHOT_RESULTS.SAND);
      expect(sandValues).not.toContain(SHOT_RESULTS.HAZARD);
    });

    it('returns putt options regardless of context', () => {
      const ctx = { par: 4, shotNumber: 3, previousShots: [] };
      const values = resultValues(getResultsForType(ctx, SHOT_TYPES.PUTT));

      expect(values).toEqual([SHOT_RESULTS.MADE, SHOT_RESULTS.MISSED]);
    });

    it('returns penalty options regardless of context', () => {
      const ctx = { par: 4, shotNumber: 2, previousShots: [] };
      const values = resultValues(getResultsForType(ctx, SHOT_TYPES.PENALTY));

      expect(values).toContain(SHOT_RESULTS.OB);
      expect(values).toContain(SHOT_RESULTS.HAZARD);
    });
  });
});
