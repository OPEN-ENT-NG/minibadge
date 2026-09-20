/**
 * Shape of `BadgeCategory.toJson()` (backend `fr.openent.minibadge.model.BadgeCategory`).
 * Returned by `GET /categories` (plain array, not wrapped in `{ all }`).
 */
export interface BadgeCategory {
  id: number;
  name: string;
  slug: string;
  iconName: string;
  iconCssClass: string;
}
