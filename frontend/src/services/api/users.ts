import { odeServices } from '@edifice.io/client';

import { MinibadgeUser } from '~/models/user';
import { request } from '~/services/api/http';

/**
 * GET /minibadge/type/:typeId/users-search — verified in `UserController.java#searchUsers`
 * and confirmed against the shipping AngularJS frontend
 * (`backend/src/main/resources/public/ts/services/user.service.ts`), which calls
 * `/minibadge/type/${typeId}/users-search` (the backend `@Get` route string itself
 * has no leading slash — `"type/:typeId/users-search"` — but the served path is
 * still prefixed with the module name like every other route in this app).
 * Response wrapped in `{ all: MinibadgeUser[] }`.
 */
export const searchUsersForType = async (
  typeId: number,
  query?: string,
): Promise<MinibadgeUser[]> => {
  const response = await request(() =>
    odeServices.http().get<{ all: MinibadgeUser[] }>(`/minibadge/type/${typeId}/users-search`, {
      queryParams: { query },
      disableNotifications: true,
    }),
  );
  return response.all;
};

/**
 * GET /minibadge/admin/users-search — verified in `UserController.java#adminSearchUsers`.
 * Response wrapped in `{ all: MinibadgeUser[] }`.
 */
export const searchUsersAdmin = async (query?: string): Promise<MinibadgeUser[]> => {
  const response = await request(() =>
    odeServices.http().get<{ all: MinibadgeUser[] }>('/minibadge/admin/users-search', {
      queryParams: { query },
      disableNotifications: true,
    }),
  );
  return response.all;
};
