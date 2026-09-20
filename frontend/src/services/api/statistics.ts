import { odeServices } from '@edifice.io/client';

import { Statistics } from '~/models/statistics';
import { request } from '~/services/api/http';

/**
 * GET /statistics. Accepts an optional `minDate` query param (`yyyy-MM-dd`,
 * silently ignored if unparsable) to scope statistics from that date onward.
 */
export const getStatistics = async (minDate?: string): Promise<Statistics> => {
  const response = await request(() =>
    odeServices.http().get<Statistics>('/minibadge/statistics', {
      queryParams: { minDate },
      disableNotifications: true,
    }),
  );
  return response;
};

/**
 * GET /statistics/synchronize. Always resolves `{ message: string }` (an
 * i18n-translated message), with HTTP 200 in both the "synchronized" and the
 * "nothing to synchronize" case.
 */
export const synchronizeStatistics = async (): Promise<{ message: string }> => {
  const response = await request(() =>
    odeServices.http().get<{ message: string }>('/minibadge/statistics/synchronize', {
      disableNotifications: true,
    }),
  );
  return response;
};
