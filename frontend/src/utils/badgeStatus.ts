import { Badge } from '~/models/badge';

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
