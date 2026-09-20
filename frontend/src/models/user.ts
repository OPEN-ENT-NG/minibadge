/**
 * Shape of `User.toJson()` (backend `fr.openent.minibadge.model.User`).
 * Used wherever the API embeds a user: `Badge.owner`, `BadgeAssigned.assignor`,
 * `BadgeType.mostAssigningUsers`, `Statistics.topAssigningUsers/topReceivingUsers`,
 * and the `/type/:typeId/users-search` and `/admin/users-search` results.
 *
 * Field names verified against `Field.java` (camelCase) and `User.java#toJson()`.
 */
export interface MinibadgeUser {
  id: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  profile?: string;
  countAssigned?: number;
  badgeAssignedTotal?: number;
  structureIds: string[];
  structureNames: string[];
  /** Only present when the backend explicitly sets it (see `User.java#toJson()`). */
  minibadgeUserState?: string;
}
