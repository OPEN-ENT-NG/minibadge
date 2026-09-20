import { odeServices } from '@edifice.io/client';

import { BadgeAssigned } from '~/models/badgeAssigned';
import { request } from '~/services/api/http';

/**
 * Shared query params for `/assigned/given` and `/assigned/all` — verified in
 * `BadgeAssignedController.java#get` and `#getAll`: both read the exact same
 * four params (`Request.QUERY/START_DATE/END_DATE/SORTBY/SORTASC`).
 *
 * This confirms the plan's "à confirmer" note for `/assigned/all`: it does use
 * the same params as `/assigned/given` (query, startDate, endDate, sortBy, sortAsc).
 */
export interface BadgeAssignedFilters {
  query?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortAsc?: boolean;
}

/**
 * GET /assigned/given — verified in `BadgeAssignedController.java#get`.
 * Response wrapped in `{ all: BadgeAssigned[] }`.
 */
export const getBadgesGiven = async (
  filters: BadgeAssignedFilters = {},
): Promise<BadgeAssigned[]> => {
  const response = await request(() =>
    odeServices.http().get<{ all: BadgeAssigned[] }>('/minibadge/assigned/given', {
      queryParams: { ...filters },
      disableNotifications: true,
    }),
  );
  return response.all;
};

/**
 * GET /minibadge/assigned/all — verified in `BadgeAssignedController.java#getAll` (AdminRight).
 * Same params and response shape as `getBadgesGiven`.
 */
export const getBadgesAssignedAll = async (
  filters: BadgeAssignedFilters = {},
): Promise<BadgeAssigned[]> => {
  const response = await request(() =>
    odeServices.http().get<{ all: BadgeAssigned[] }>('/minibadge/assigned/all', {
      queryParams: { ...filters },
      disableNotifications: true,
    }),
  );
  return response.all;
};

/**
 * PUT /minibadge/revoked/given/:badgeId — verified in `BadgeAssignedController.java#revoke`,
 * which just does `response().setStatusCode(200).end()`: no body at all, so this
 * resolves `void` (per the plan's explicit gotcha for this exact endpoint).
 */
export const revokeBadgeAssigned = async (badgeId: number): Promise<void> => {
  await request(() => odeServices.http().put<void>(`/minibadge/revoked/given/${badgeId}`));
};

/**
 * POST /minibadge/types/:typeId/assign — verified in `BadgeAssignedController.java#assign`.
 * Body is `{ ownerIds: string[] }` (`Field.OWNERIDS`). Renders an empty JSON
 * object on success: no usable body, resolves `void`.
 */
export const assignBadge = async (typeId: number, ownerIds: string[]): Promise<void> => {
  await request(() => odeServices.http().post<void>(`/minibadge/types/${typeId}/assign`, { ownerIds }));
};
