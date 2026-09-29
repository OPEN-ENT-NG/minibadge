import { BadgeType } from '~/models/badgeType';
import { MinibadgeUser } from '~/models/user';

/** Shape of the private `BadgeCounts.toJson()` nested class in `Badge.java`. */
export interface BadgeCounts {
  /** Non-revoked assignments of this badge, expired ones included. */
  assigned: number;
  /**
   * How many of `assigned` are still active (not expired). `0` means every assignment of this badge
   * has expired: the badge stays listed but is shown as expired (see `isExpiredBadge`). `null` (Java
   * serializes a missing count as `null`) or absent is never treated as expired.
   */
  active?: number | null;
}

/**
 * Shape of `Badge.toJson()` (backend `fr.openent.minibadge.model.Badge`).
 * Field names verified against `Field.java` (camelCase).
 */
export interface Badge {
  id: number;
  structureId?: string;
  badgeTypeId: number;
  ownerId: string;
  privatizedAt?: string;
  refusedAt?: string;
  disabledAt?: string;
  counts: BadgeCounts;
  /** Latest expiry among the non-revoked assignments; absent/null as soon as one of them is permanent. */
  maxExpiresAt?: string | null;
  badgeType: BadgeType;
  owner?: MinibadgeUser;
}
