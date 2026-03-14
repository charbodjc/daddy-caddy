/**
 * dateFormatting.ts
 *
 * Shared date formatting utilities to replace scattered toLocaleDateString
 * calls across the codebase with a consistent API.
 */

/**
 * Standard display format: "Saturday, March 14, 2026"
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Abbreviated format: "Mar 14, 2026"
 */
export function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Date range for tournaments: "Mar 14 - Mar 16, 2026"
 * If both dates are in the same year, the year is shown only on the end date.
 */
export function formatDateRange(start: Date, end: Date): string {
  const startStr = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const endStr = end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${startStr} - ${endStr}`;
}
