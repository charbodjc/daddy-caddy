import { parseGolfVoice } from '../../src/utils/golfVoiceParser';
import { SHOT_TYPES, SHOT_RESULTS, TrackedShot } from '../../src/types';
import type { ShotContext } from '../../src/utils/shotStateMachine';

function shot(stroke: number, type: string, result: string): TrackedShot {
  return { stroke, type, results: [result] };
}

// Contexts for testing
const teeContext: ShotContext = { par: 4, shotNumber: 1, previousShots: [] };
const approachContext: ShotContext = {
  par: 4,
  shotNumber: 2,
  previousShots: [shot(1, SHOT_TYPES.TEE_SHOT, SHOT_RESULTS.CENTER)],
};
const puttContext: ShotContext = {
  par: 4,
  shotNumber: 3,
  previousShots: [
    shot(1, SHOT_TYPES.TEE_SHOT, SHOT_RESULTS.CENTER),
    shot(2, SHOT_TYPES.APPROACH, SHOT_RESULTS.GREEN),
  ],
};

describe('golfVoiceParser', () => {
  describe('tee shot context', () => {
    it('"fairway" → CENTER', () => {
      const result = parseGolfVoice('fairway', teeContext);
      expect(result).not.toBeNull();
      expect(result!.result).toBe(SHOT_RESULTS.CENTER);
      expect(result!.shotType).toBe(SHOT_TYPES.TEE_SHOT);
    });

    it('"left rough" → LEFT', () => {
      const result = parseGolfVoice('left rough', teeContext);
      expect(result).not.toBeNull();
      expect(result!.result).toBe(SHOT_RESULTS.LEFT);
    });

    it('"right" → RIGHT', () => {
      const result = parseGolfVoice('right', teeContext);
      expect(result).not.toBeNull();
      expect(result!.result).toBe(SHOT_RESULTS.RIGHT);
    });

    it('"on the green" → GREEN', () => {
      const result = parseGolfVoice('on the green', teeContext);
      expect(result).not.toBeNull();
      expect(result!.result).toBe(SHOT_RESULTS.GREEN);
    });

    it('"rough" → ROUGH', () => {
      const result = parseGolfVoice('rough', teeContext);
      expect(result).not.toBeNull();
      expect(result!.result).toBe(SHOT_RESULTS.ROUGH);
    });
  });

  describe('sand synonyms', () => {
    it.each(['sand', 'bunker', 'trap', 'beach'])(
      '"%s" → SAND',
      (word) => {
        const result = parseGolfVoice(word, teeContext);
        expect(result).not.toBeNull();
        expect(result!.result).toBe(SHOT_RESULTS.SAND);
      },
    );
  });

  describe('approach context', () => {
    it('"on green" → GREEN', () => {
      const result = parseGolfVoice('on green', approachContext);
      expect(result).not.toBeNull();
      expect(result!.result).toBe(SHOT_RESULTS.GREEN);
      expect(result!.shotType).toBe(SHOT_TYPES.APPROACH);
    });

    it('"hazard" → HAZARD', () => {
      const result = parseGolfVoice('hazard', approachContext);
      expect(result).not.toBeNull();
      expect(result!.result).toBe(SHOT_RESULTS.HAZARD);
    });

    it('"water" → HAZARD', () => {
      const result = parseGolfVoice('water', approachContext);
      expect(result).not.toBeNull();
      expect(result!.result).toBe(SHOT_RESULTS.HAZARD);
    });
  });

  describe('putt context', () => {
    it('"made it" → MADE', () => {
      const result = parseGolfVoice('made it', puttContext);
      expect(result).not.toBeNull();
      expect(result!.result).toBe(SHOT_RESULTS.MADE);
      expect(result!.shotType).toBe(SHOT_TYPES.PUTT);
    });

    it('"missed" → MISSED', () => {
      const result = parseGolfVoice('missed', puttContext);
      expect(result).not.toBeNull();
      expect(result!.result).toBe(SHOT_RESULTS.MISSED);
    });

    it('"sank it" → MADE', () => {
      const result = parseGolfVoice('sank it', puttContext);
      expect(result).not.toBeNull();
      expect(result!.result).toBe(SHOT_RESULTS.MADE);
    });

    it('"lipped out" → MISSED', () => {
      const result = parseGolfVoice('lipped out', puttContext);
      expect(result).not.toBeNull();
      expect(result!.result).toBe(SHOT_RESULTS.MISSED);
    });

    it('extracts putt distance: "8 feet" → puttDistance "8 ft"', () => {
      const result = parseGolfVoice('missed 8 feet', puttContext);
      expect(result).not.toBeNull();
      expect(result!.puttDistance).toBe('8 ft');
    });

    it('extracts putt distance: "25 ft" → puttDistance "25 ft"', () => {
      const result = parseGolfVoice('made it 25 ft', puttContext);
      expect(result).not.toBeNull();
      expect(result!.puttDistance).toBe('25 ft');
    });

    it('context-aware: "left" while putting → MISSED (not LEFT)', () => {
      const result = parseGolfVoice('left', puttContext);
      expect(result).not.toBeNull();
      expect(result!.result).toBe(SHOT_RESULTS.MISSED);
      expect(result!.shotType).toBe(SHOT_TYPES.PUTT);
    });

    it('distance with unit infers MISSED: "2 feet"', () => {
      const result = parseGolfVoice('2 feet', puttContext);
      expect(result).not.toBeNull();
      expect(result!.result).toBe(SHOT_RESULTS.MISSED);
      expect(result!.puttDistance).toBe('2 ft');
      expect(result!.confidence).toBe('low');
    });

    it('bare number without unit does NOT parse as distance: "7"', () => {
      // Prevents "hole 7" or "par 3" from being parsed as putt distances
      const result = parseGolfVoice('7', puttContext);
      expect(result).toBeNull();
    });
  });

  describe('penalty detection', () => {
    it('"ob" → penalty with OB result', () => {
      const result = parseGolfVoice('ob', teeContext);
      expect(result).not.toBeNull();
      expect(result!.result).toBe(SHOT_RESULTS.OB);
    });

    it('"out of bounds" → OB', () => {
      const result = parseGolfVoice('out of bounds', teeContext);
      expect(result).not.toBeNull();
      expect(result!.result).toBe(SHOT_RESULTS.OB);
    });

    it('"lost ball" → penalty with OB', () => {
      const result = parseGolfVoice('lost ball', teeContext);
      expect(result).not.toBeNull();
      expect(result!.shotType).toBe(SHOT_TYPES.PENALTY);
      expect(result!.penaltyStrokes).toBe(1);
    });

    it('"penalty 2 stroke" → 2 penalty strokes', () => {
      const result = parseGolfVoice('penalty 2 stroke', teeContext);
      expect(result).not.toBeNull();
      expect(result!.shotType).toBe(SHOT_TYPES.PENALTY);
      expect(result!.penaltyStrokes).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('empty string → null', () => {
      expect(parseGolfVoice('', teeContext)).toBeNull();
    });

    it('unrecognized input → null', () => {
      expect(parseGolfVoice('hello world', teeContext)).toBeNull();
    });

    it('case insensitive: "FAIRWAY" → CENTER', () => {
      const result = parseGolfVoice('FAIRWAY', teeContext);
      expect(result).not.toBeNull();
      expect(result!.result).toBe(SHOT_RESULTS.CENTER);
    });

    it('"good shot fairway" → CENTER (noise words ignored)', () => {
      const result = parseGolfVoice('good shot fairway', teeContext);
      expect(result).not.toBeNull();
      expect(result!.result).toBe(SHOT_RESULTS.CENTER);
    });
  });
});
