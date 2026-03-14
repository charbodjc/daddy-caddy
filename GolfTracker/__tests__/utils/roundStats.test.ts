import {
  calculateTotalStrokes,
  parseShotData,
  deriveHoleStats,
} from '../../src/utils/roundStats';

describe('calculateTotalStrokes', () => {
  it('returns 0 for an empty shots array', () => {
    expect(calculateTotalStrokes([])).toBe(0);
  });

  it('returns the number of shots when there are no penalties', () => {
    const shots = [
      { stroke: 1, type: 'Tee Shot', results: ['center'] },
      { stroke: 2, type: 'Approach', results: ['green'] },
      { stroke: 3, type: 'Putt', results: ['made'] },
    ] as any[];
    expect(calculateTotalStrokes(shots)).toBe(3);
  });

  it('adds penaltyStrokes to the total', () => {
    const shots = [
      { stroke: 1, type: 'Tee Shot', results: ['ob'], penaltyStrokes: 1 },
      { stroke: 2, type: 'Approach', results: ['green'] },
      { stroke: 3, type: 'Putt', results: ['made'] },
    ] as any[];
    expect(calculateTotalStrokes(shots)).toBe(4);
  });

  it('handles penaltyStrokes of 2', () => {
    const shots = [
      { stroke: 1, type: 'Penalty', results: ['ob'], penaltyStrokes: 2 },
      { stroke: 2, type: 'Approach', results: ['green'] },
    ] as any[];
    expect(calculateTotalStrokes(shots)).toBe(4);
  });

  it('sums multiple penalties correctly', () => {
    const shots = [
      { stroke: 1, type: 'Tee Shot', results: ['ob'], penaltyStrokes: 1 },
      { stroke: 2, type: 'Approach', results: ['hazard'], penaltyStrokes: 1 },
      { stroke: 3, type: 'Putt', results: ['made'] },
    ] as any[];
    expect(calculateTotalStrokes(shots)).toBe(5);
  });
});

describe('parseShotData', () => {
  it('returns null for null/undefined input', () => {
    expect(parseShotData(null)).toBeNull();
    expect(parseShotData(undefined)).toBeNull();
  });

  it('parses a valid JSON string with shots array', () => {
    const data = { par: 4, shots: [{ stroke: 1, type: 'Putt', results: [] }], currentStroke: 2 };
    const result = parseShotData(JSON.stringify(data));
    expect(result).toEqual(data);
  });

  it('accepts an already-parsed object', () => {
    const data = { par: 3, shots: [], currentStroke: 1 };
    expect(parseShotData(data)).toEqual(data);
  });

  it('returns null for invalid JSON', () => {
    expect(parseShotData('not valid json')).toBeNull();
  });

  it('returns null when shots is not an array', () => {
    expect(parseShotData(JSON.stringify({ par: 4, shots: 'nope' }))).toBeNull();
  });
});

describe('deriveHoleStats', () => {
  it('counts putts correctly', () => {
    const shotData = {
      par: 4,
      shots: [
        { stroke: 1, type: 'Tee Shot', results: ['center'] },
        { stroke: 2, type: 'Approach', results: ['green'] },
        { stroke: 3, type: 'Putt', results: ['missed'], puttDistance: '20 ft' },
        { stroke: 4, type: 'Putt', results: ['made'] },
      ],
      currentStroke: 5,
    };
    const stats = deriveHoleStats(shotData, 4);
    expect(stats.puttsCount).toBe(2);
  });

  it('detects fairwayHit when tee shot result is center on par 4+', () => {
    const shotData = {
      par: 4,
      shots: [
        { stroke: 1, type: 'Tee Shot', results: ['center'] },
        { stroke: 2, type: 'Putt', results: ['made'] },
      ],
      currentStroke: 3,
    };
    const stats = deriveHoleStats(shotData, 4);
    expect(stats.fairwayHit).toBe(true);
  });

  it('does not set fairwayHit on par 3s', () => {
    const shotData = {
      par: 3,
      shots: [
        { stroke: 1, type: 'Tee Shot', results: ['center'] },
        { stroke: 2, type: 'Putt', results: ['made'] },
      ],
      currentStroke: 3,
    };
    const stats = deriveHoleStats(shotData, 3);
    expect(stats.fairwayHit).toBeUndefined();
  });

  it('detects green in regulation when first putt stroke <= par - 1', () => {
    const shotData = {
      par: 4,
      shots: [
        { stroke: 1, type: 'Tee Shot', results: ['center'] },
        { stroke: 2, type: 'Approach', results: ['green'] },
        { stroke: 3, type: 'Putt', results: ['made'] },
      ],
      currentStroke: 4,
    };
    const stats = deriveHoleStats(shotData, 4);
    expect(stats.greenInRegulation).toBe(true);
  });

  it('detects non-GIR when first putt stroke > par - 1', () => {
    const shotData = {
      par: 4,
      shots: [
        { stroke: 1, type: 'Tee Shot', results: ['left'] },
        { stroke: 2, type: 'Approach', results: ['rough'] },
        { stroke: 3, type: 'Approach', results: ['green'] },
        { stroke: 4, type: 'Putt', results: ['made'] },
      ],
      currentStroke: 5,
    };
    const stats = deriveHoleStats(shotData, 4);
    expect(stats.greenInRegulation).toBe(false);
  });

  it('parses first putt distance in feet', () => {
    const shotData = {
      par: 4,
      shots: [
        { stroke: 1, type: 'Tee Shot', results: ['center'] },
        { stroke: 2, type: 'Approach', results: ['green'] },
        { stroke: 3, type: 'Putt', results: ['made'], puttDistance: '25 ft' },
      ],
      currentStroke: 4,
    };
    const stats = deriveHoleStats(shotData, 4);
    expect(stats.firstPuttDistanceFeet).toBe(25);
  });

  it('detects one-putt and three-putt', () => {
    const onePutt = {
      par: 4,
      shots: [
        { stroke: 1, type: 'Tee Shot', results: ['center'] },
        { stroke: 2, type: 'Approach', results: ['green'] },
        { stroke: 3, type: 'Putt', results: ['made'] },
      ],
      currentStroke: 4,
    };
    expect(deriveHoleStats(onePutt, 4).isOnePutt).toBe(true);
    expect(deriveHoleStats(onePutt, 4).isThreePutt).toBe(false);

    const threePutt = {
      par: 4,
      shots: [
        { stroke: 1, type: 'Tee Shot', results: ['center'] },
        { stroke: 2, type: 'Approach', results: ['green'] },
        { stroke: 3, type: 'Putt', results: ['missed'] },
        { stroke: 4, type: 'Putt', results: ['missed'] },
        { stroke: 5, type: 'Putt', results: ['made'] },
      ],
      currentStroke: 6,
    };
    expect(deriveHoleStats(threePutt, 4).isThreePutt).toBe(true);
    expect(deriveHoleStats(threePutt, 4).isOnePutt).toBe(false);
  });
});
