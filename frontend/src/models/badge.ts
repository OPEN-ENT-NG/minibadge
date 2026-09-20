import { BadgeType } from '~/models/badgeType';
import { MinibadgeUser } from '~/models/user';

/** Shape of the private `BadgeCounts.toJson()` nested class in `Badge.java`. */
export interface BadgeCounts {
  assigned: number;
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
  badgeType: BadgeType;
  owner?: MinibadgeUser;
}
