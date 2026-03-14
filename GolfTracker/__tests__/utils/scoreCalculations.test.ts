import {
  formatScoreVsPar,
  calculateScoreBreakdown,
} from '../../src/utils/scoreCalculations';

describe('formatScoreVsPar', () => {
  it('formats positive scores with a plus sign', () => {
    expect(formatScoreVsPar(3)).toBe('+3');
    expect(formatScoreVsPar(1)).toBe('+1');
  });

  it('formats zero as E (even)', () => {
    expect(formatScoreVsPar(0)).toBe('E');
  });

  it('formats negative scores as-is', () => {
    expect(formatScoreVsPar(-2)).toBe('-2');
    expect(formatScoreVsPar(-1)).toBe('-1');
  });
});

describe('calculateScoreBreakdown', () => {
  it('returns all zeros for an empty array', () => {
    expect(calculateScoreBreakdown([])).toEqual({
      eagles: 0,
      birdies: 0,
      pars: 0,
      bogeys: 0,
      doublePlus: 0,
    });
  });

  it('counts a mix of score types correctly', () => {
    const holes = [
      { strokes: 2, par: 4 }, // eagle (-2)
      { strokes: 3, par: 4 }, // birdie (-1)
      { strokes: 4, par: 4 }, // par (0)
      { strokes: 5, par: 4 }, // bogey (+1)
      { strokes: 6, par: 4 }, // double bogey (+2)
      { strokes: 7, par: 4 }, // triple bogey (+3)
    ];
    expect(calculateScoreBreakdown(holes)).toEqual({
      eagles: 1,
      birdies: 1,
      pars: 1,
      bogeys: 1,
      doublePlus: 2,
    });
  });

  it('skips holes with strokes <= 0', () => {
    const holes = [
      { strokes: 0, par: 4 },
      { strokes: -1, par: 3 },
      { strokes: 4, par: 4 }, // only this one counts (par)
    ];
    expect(calculateScoreBreakdown(holes)).toEqual({
      eagles: 0,
      birdies: 0,
      pars: 1,
      bogeys: 0,
      doublePlus: 0,
    });
  });

  it('counts multiple eagles for very low scores', () => {
    const holes = [
      { strokes: 1, par: 4 }, // -3 -> eagle
      { strokes: 2, par: 5 }, // -3 -> eagle
    ];
    expect(calculateScoreBreakdown(holes).eagles).toBe(2);
  });
});
