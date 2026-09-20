import { odeServices } from '@edifice.io/client';

import { BadgeAssigned } from '~/models/badgeAssigned';
import { request } from '~/services/api/http';

/**
 * Shared query params for `/assigned/given` and `/assigned/all`: both read
 * the same four params (query, startDate, endDate, sortBy, sortAsc).
 */
export interface BadgeAssignedFilters {
  query?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortAsc?: boolean;
}

/**
 * GET /assigned/given. Response wrapped in `{ all: BadgeAssigned[] }`.
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
 * GET /minibadge/assigned/all (admin only). Same params and response shape
 * as `getBadgesGiven`.
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
 * PUT /minibadge/revoked/given/:badgeId — the response has no body, so this
 * resolves `void`.
 */
export const revokeBadgeAssigned = async (badgeId: number): Promise<void> => {
  await request(() => odeServices.http().put<void>(`/minibadge/revoked/given/${badgeId}`));
};

/**
 * POST /minibadge/types/:typeId/assign. Body is `{ ownerIds: string[] }`.
 * Renders an empty JSON object on success, so this resolves `void`.
 */
export const assignBadge = async (typeId: number, ownerIds: string[]): Promise<void> => {
  await request(() => odeServices.http().post<void>(`/minibadge/types/${typeId}/assign`, { ownerIds }));
};
