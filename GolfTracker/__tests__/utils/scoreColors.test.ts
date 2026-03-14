import {
  getScoreColor,
  getScoreName,
  getScoreBackgroundColor,
} from '../../src/utils/scoreColors';

describe('getScoreColor', () => {
  it('returns gold for eagle or better (<= -2)', () => {
    expect(getScoreColor(-2)).toBe('#FFD700');
    expect(getScoreColor(-3)).toBe('#FFD700');
  });

  it('returns green for birdie (-1)', () => {
    expect(getScoreColor(-1)).toBe('#4CAF50');
  });

  it('returns dark grey for par (0)', () => {
    expect(getScoreColor(0)).toBe('#333333');
  });

  it('returns orange for bogey (+1)', () => {
    expect(getScoreColor(1)).toBe('#FF9800');
  });

  it('returns red for double bogey or worse (>= +2)', () => {
    expect(getScoreColor(2)).toBe('#f44336');
    expect(getScoreColor(3)).toBe('#f44336');
    expect(getScoreColor(4)).toBe('#f44336');
  });
});

describe('getScoreName', () => {
  it('returns Albatross for -3 or better', () => {
    expect(getScoreName(-3)).toBe('Albatross');
    expect(getScoreName(-4)).toBe('Albatross');
  });

  it('returns Eagle for -2', () => {
    expect(getScoreName(-2)).toBe('Eagle');
  });

  it('returns Birdie for -1', () => {
    expect(getScoreName(-1)).toBe('Birdie');
  });

  it('returns Par for 0', () => {
    expect(getScoreName(0)).toBe('Par');
  });

  it('returns Bogey for +1', () => {
    expect(getScoreName(1)).toBe('Bogey');
  });

  it('returns Double Bogey for +2', () => {
    expect(getScoreName(2)).toBe('Double Bogey');
  });

  it('returns Triple Bogey for +3', () => {
    expect(getScoreName(3)).toBe('Triple Bogey');
  });

  it('returns +N for +4 and beyond', () => {
    expect(getScoreName(4)).toBe('+4');
    expect(getScoreName(5)).toBe('+5');
  });
});

describe('getScoreBackgroundColor', () => {
  it('returns light gold for eagle or better', () => {
    expect(getScoreBackgroundColor(-2)).toBe('#FFF8E1');
    expect(getScoreBackgroundColor(-3)).toBe('#FFF8E1');
  });

  it('returns light green for birdie', () => {
    expect(getScoreBackgroundColor(-1)).toBe('#E8F5E9');
  });

  it('returns light grey for par', () => {
    expect(getScoreBackgroundColor(0)).toBe('#F5F5F5');
  });

  it('returns light orange for bogey', () => {
    expect(getScoreBackgroundColor(1)).toBe('#FFF3E0');
  });

  it('returns light red for double bogey or worse', () => {
    expect(getScoreBackgroundColor(2)).toBe('#FFEBEE');
    expect(getScoreBackgroundColor(3)).toBe('#FFEBEE');
    expect(getScoreBackgroundColor(4)).toBe('#FFEBEE');
  });
});
