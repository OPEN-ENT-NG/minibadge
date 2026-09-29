import { Badge } from '~/models/badge';
import { BadgeAssigned } from '~/models/badgeAssigned';
import { BadgeType } from '~/models/badgeType';
import { todayIsoDate } from '~/utils/date';

/**
 * Pure mirror of `Badge`'s status getters (backend AngularJS frontend,
 * `backend/src/main/resources/public/ts/models/badge.model.ts:89-93`):
 *
 * ```ts
 * isPublic = (): boolean => !this.privatizedAt && !this.refusedAt && !this.disabledAt;
 * isPrivatized = (): boolean => !!this.privatizedAt && !this.refusedAt && !this.disabledAt;
 * isRefused = (): boolean => !!this.refusedAt || !!this.disabledAt;
 * ```
 *
 * These three are mutually exclusive and exhaustive over every combination of
 * `privatizedAt`/`refusedAt`/`disabledAt` — verified by the test file.
 */
export const isPublicBadge = (badge: Badge): boolean =>
  !badge.privatizedAt && !badge.refusedAt && !badge.disabledAt;

export const isPrivatizedBadge = (badge: Badge): boolean =>
  !!badge.privatizedAt && !badge.refusedAt && !badge.disabledAt;

export const isRefusedBadge = (badge: Badge): boolean =>
  !!badge.refusedAt || !!badge.disabledAt;

/**
 * Expiry (Epic C) is deliberately NOT a fourth value of the public/privatized/refused set above: that
 * set is the owner's visibility choice, while expiry is a property of the assignments. An expired
 * badge is still exactly one of public/privatized/refused, and is shown with an extra "Expiré"
 * indicator on top of that — hence separate predicates.
 */

/**
 * "Mes badges reçus" is one row per badge type: expired means every non-revoked assignment of it has
 * expired (`counts.active === 0`). An older payload without `active` is never treated as expired.
 */
export const isExpiredBadge = (badge: Badge): boolean => badge.counts?.active === 0;

/** One assignment row (`/assigned/given`, `/assigned/all`). A revoked row is shown as revoked, not expired. */
export const isExpiredAssignment = (badgeAssigned: BadgeAssigned): boolean =>
  !badgeAssigned.revokedAt && !!badgeAssigned.isExpired;

/**
 * A badge type whose end date is past can no longer be awarded. The server decides it
 * (`setting.isExpired`, computed by SQL against the database's `CURRENT_DATE`), so the browser clock
 * never has a say — it may be off, or in another timezone than the server.
 *
 * The client-side comparison below is only a fallback for a payload without the flag (an older
 * backend): the end date is inclusive, so a type is still awardable ON its end date, and `YYYY-MM-DD`
 * strings compare correctly as plain strings.
 */
export const isBadgeTypeExpired = (badgeType: Pick<BadgeType, 'setting'>, today: string = todayIsoDate()): boolean => {
  const serverFlag = badgeType.setting?.isExpired;
  if (typeof serverFlag === 'boolean') return serverFlag;
  const validUntil = badgeType.setting?.validUntil;
  return !!validUntil && validUntil.slice(0, 10) < today;
};
