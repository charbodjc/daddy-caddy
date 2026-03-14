import {
  formatDate,
  formatDateShort,
  formatDateRange,
} from '../../src/utils/dateFormatting';

describe('formatDate', () => {
  it('includes the weekday, month, day, and year', () => {
    const date = new Date(2026, 2, 14); // March 14, 2026 (Saturday)
    const result = formatDate(date);
    expect(result).toContain('Saturday');
    expect(result).toContain('March');
    expect(result).toContain('14');
    expect(result).toContain('2026');
  });
});

describe('formatDateShort', () => {
  it('includes abbreviated month, day, and year', () => {
    const date = new Date(2026, 2, 14);
    const result = formatDateShort(date);
    expect(result).toContain('Mar');
    expect(result).toContain('14');
    expect(result).toContain('2026');
  });
});

describe('formatDateRange', () => {
  it('formats a range with start and end dates', () => {
    const start = new Date(2026, 2, 14);
    const end = new Date(2026, 2, 16);
    const result = formatDateRange(start, end);
    expect(result).toContain('Mar');
    expect(result).toContain('14');
    expect(result).toContain('16');
    expect(result).toContain('2026');
    expect(result).toContain(' - ');
  });

  it('handles ranges spanning different months', () => {
    const start = new Date(2026, 2, 30);
    const end = new Date(2026, 3, 2); // April 2
    const result = formatDateRange(start, end);
    expect(result).toContain('Mar');
    expect(result).toContain('Apr');
    expect(result).toContain(' - ');
  });
});
