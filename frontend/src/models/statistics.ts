import { BadgeType } from '~/models/badgeType';
import { MinibadgeUser } from '~/models/user';

/**
 * Shape of `Structure.toJson()` (backend `fr.openent.minibadge.model.Structure`).
 * Only ever seen nested in `Statistics.mostAssigningStructures`.
 */
export interface MinibadgeStructure {
  id: string;
  name: string;
  countAssigned: number;
  countActiveUsers: number;
}

/**
 * Shape of `Statistics.toJson()` (backend `fr.openent.minibadge.model.Statistics`).
 * Field names verified against `Field.java` (camelCase). Returned by `GET /statistics`.
 * Every field is only added to the JSON when non-null on the backend, hence optional here.
 */
export interface Statistics {
  countBadgeAssigned?: number;
  countActiveUsers?: number;
  mostAssignedTypes?: BadgeType[];
  lessAssignedTypes?: BadgeType[];
  mostRefusedTypes?: BadgeType[];
  mostAssigningStructures?: MinibadgeStructure[];
  topAssigningUsers?: MinibadgeUser[];
  topReceivingUsers?: MinibadgeUser[];
}
