import { describe, expect, it } from 'vitest';

import { fakeBadge } from '~/mocks/handlers';
import { Badge } from '~/models/badge';
import { isPrivatizedBadge, isPublicBadge, isRefusedBadge } from '~/utils/badgeStatus';

const withDates = (overrides: Partial<Badge>): Badge => ({ ...fakeBadge, ...overrides });

describe('badgeStatus', () => {
  it('treats a badge with no privatizedAt/refusedAt/disabledAt as public', () => {
    const badge = withDates({ privatizedAt: undefined, refusedAt: undefined, disabledAt: undefined });

    expect(isPublicBadge(badge)).toBe(true);
    expect(isPrivatizedBadge(badge)).toBe(false);
    expect(isRefusedBadge(badge)).toBe(false);
  });

  it('treats a badge with only privatizedAt as privatized', () => {
    const badge = withDates({
      privatizedAt: '2024-01-01 10:00:00.000',
      refusedAt: undefined,
      disabledAt: undefined,
    });

    expect(isPublicBadge(badge)).toBe(false);
    expect(isPrivatizedBadge(badge)).toBe(true);
    expect(isRefusedBadge(badge)).toBe(false);
  });

  it('treats a badge with refusedAt as refused, regardless of privatizedAt', () => {
    const badge = withDates({
      privatizedAt: '2024-01-01 10:00:00.000',
      refusedAt: '2024-01-02 10:00:00.000',
      disabledAt: undefined,
    });

    expect(isPublicBadge(badge)).toBe(false);
    expect(isPrivatizedBadge(badge)).toBe(false);
    expect(isRefusedBadge(badge)).toBe(true);
  });

  it('treats a badge with disabledAt as refused, regardless of privatizedAt', () => {
    const badge = withDates({
      privatizedAt: '2024-01-01 10:00:00.000',
      refusedAt: undefined,
      disabledAt: '2024-01-03 10:00:00.000',
    });

    expect(isPublicBadge(badge)).toBe(false);
    expect(isPrivatizedBadge(badge)).toBe(false);
    expect(isRefusedBadge(badge)).toBe(true);
  });

  it('treats a badge with only disabledAt (no privatizedAt) as refused', () => {
    const badge = withDates({ privatizedAt: undefined, refusedAt: undefined, disabledAt: '2024-01-03 10:00:00.000' });

    expect(isPublicBadge(badge)).toBe(false);
    expect(isPrivatizedBadge(badge)).toBe(false);
    expect(isRefusedBadge(badge)).toBe(true);
  });

  it('treats a badge with both refusedAt and disabledAt as refused', () => {
    const badge = withDates({
      privatizedAt: undefined,
      refusedAt: '2024-01-02 10:00:00.000',
      disabledAt: '2024-01-03 10:00:00.000',
    });

    expect(isRefusedBadge(badge)).toBe(true);
    expect(isPublicBadge(badge)).toBe(false);
    expect(isPrivatizedBadge(badge)).toBe(false);
  });
});
