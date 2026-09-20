import { Badge } from '~/models/badge';
import { MinibadgeUser } from '~/models/user';

/**
 * Shape of `BadgeAssigned.toJson()` (backend `fr.openent.minibadge.model.BadgeAssigned`).
 * Field names verified against `Field.java` (camelCase). Returned (wrapped in
 * `{ all }`) by `GET /assigned/given` and `GET /assigned/all`.
 */
export interface BadgeAssigned {
  id: number;
  assignorId: string;
  assignorDisplayName?: string;
  createdAt?: string;
  updatedAt?: string;
  revokedAt?: string;
  acceptedAt?: string;
  badge: Badge;
  assignor?: MinibadgeUser;
}
