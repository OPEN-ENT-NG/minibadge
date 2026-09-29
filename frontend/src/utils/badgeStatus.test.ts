import { describe, expect, it } from 'vitest';

import { fakeBadge, fakeBadgeAssigned, fakeBadgeType } from '~/mocks/handlers';
import { Badge } from '~/models/badge';
import {
  isBadgeTypeExpired,
  isExpiredAssignment,
  isExpiredBadge,
  isPrivatizedBadge,
  isPublicBadge,
  isRefusedBadge,
} from '~/utils/badgeStatus';

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

/**
 * Epic C: expiry is an overlay on top of the three exclusive statuses above, never a fourth one.
 */
describe('badge expiry', () => {
  const expired = (overrides: Partial<Badge> = {}): Badge =>
    withDates({ counts: { assigned: 2, active: 0 }, maxExpiresAt: '2026-07-01T00:00:00.000', ...overrides });

  it('treats a received badge as expired only once none of its assignments is active', () => {
    expect(isExpiredBadge(expired())).toBe(true);
    expect(isExpiredBadge(withDates({ counts: { assigned: 2, active: 1 } }))).toBe(false);
  });

  it('never treats a payload without an active count as expired', () => {
    expect(isExpiredBadge(withDates({ counts: { assigned: 3 } }))).toBe(false);
  });

  it('leaves the public/privatized/refused split unchanged for an expired badge', () => {
    const publicExpired = expired();
    const privatizedExpired = expired({ privatizedAt: '2024-01-01 10:00:00.000' });
    const refusedExpired = expired({ refusedAt: '2024-01-02 10:00:00.000' });

    for (const badge of [publicExpired, privatizedExpired, refusedExpired]) {
      const statuses = [isPublicBadge(badge), isPrivatizedBadge(badge), isRefusedBadge(badge)];
      expect(statuses.filter(Boolean)).toHaveLength(1);
      expect(isExpiredBadge(badge)).toBe(true);
    }
    expect(isPublicBadge(publicExpired)).toBe(true);
    expect(isPrivatizedBadge(privatizedExpired)).toBe(true);
    expect(isRefusedBadge(refusedExpired)).toBe(true);
  });

  it('reads an assignment row from the server-computed flag, and a revoked row is never "expired"', () => {
    expect(isExpiredAssignment({ ...fakeBadgeAssigned, isExpired: true })).toBe(true);
    expect(isExpiredAssignment({ ...fakeBadgeAssigned, isExpired: false })).toBe(false);
    expect(isExpiredAssignment(fakeBadgeAssigned)).toBe(false);
    expect(
      isExpiredAssignment({ ...fakeBadgeAssigned, isExpired: true, revokedAt: '2024-01-15 10:00:00.000' }),
    ).toBe(false);
  });

  it('treats a badge type as expired from the day AFTER its end date', () => {
    const withValidUntil = (validUntil: string | null) => ({
      ...fakeBadgeType,
      setting: { ...fakeBadgeType.setting, validUntil },
    });

    expect(isBadgeTypeExpired(withValidUntil('2026-09-28'), '2026-09-29')).toBe(true);
    expect(isBadgeTypeExpired(withValidUntil('2026-09-29'), '2026-09-29')).toBe(false);
    expect(isBadgeTypeExpired(withValidUntil('2026-10-01'), '2026-09-29')).toBe(false);
    expect(isBadgeTypeExpired(withValidUntil(null), '2026-09-29')).toBe(false);
    expect(isBadgeTypeExpired(fakeBadgeType, '2026-09-29')).toBe(false);
  });

  it('trusts the server-computed flag over the browser clock when it is present', () => {
    const withSetting = (validUntil: string | null, isExpired: boolean) => ({
      ...fakeBadgeType,
      setting: { ...fakeBadgeType.setting, validUntil, isExpired },
    });

    // The browser thinks it is already the 30th, the server (database clock) still says the 29th.
    expect(isBadgeTypeExpired(withSetting('2026-09-29', false), '2026-09-30')).toBe(false);
    // And the other way round: the server already says expired, whatever the browser clock says.
    expect(isBadgeTypeExpired(withSetting('2026-09-29', true), '2026-09-29')).toBe(true);
  });
});
