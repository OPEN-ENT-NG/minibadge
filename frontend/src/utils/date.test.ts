import { describe, expect, it } from 'vitest';

import { formatIsoDateFr, toIsoDate, todayIsoDate } from '~/utils/date';

describe('date helpers (Epic C additions)', () => {
  it('formats an ISO date, or a timestamp starting with one, as DD/MM/YYYY', () => {
    expect(formatIsoDateFr('2027-06-30')).toBe('30/06/2027');
    expect(formatIsoDateFr('2027-07-01T00:00:00.000')).toBe('01/07/2027');
    expect(formatIsoDateFr(undefined)).toBe('');
    expect(formatIsoDateFr(null)).toBe('');
  });

  it("gives today's local date in the native date input format", () => {
    expect(todayIsoDate()).toBe(toIsoDate(new Date()));
    expect(todayIsoDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
