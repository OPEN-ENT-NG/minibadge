import { odeServices } from '@edifice.io/client';

import { ChartPreference, MINIBADGE_CHART_PREFERENCE_KEY } from '~/models/chart';
import { request } from '~/services/api/http';

/**
 * PUT /accept. Renders an empty JSON object: no usable body, resolves `void`.
 */
export const acceptCharter = async (): Promise<void> => {
  await request(() => odeServices.http().put<void>('/minibadge/accept'));
};

/**
 * PUT /minibadge/refuse. No usable response body (see `acceptCharter`).
 */
export const refuseCharter = async (): Promise<void> => {
  await request(() => odeServices.http().put<void>('/minibadge/refuse'));
};

/**
 * PUT /minibadge/revoke (admin only). Body is `{ userIds: string[] }`. No
 * usable response body.
 */
export const revokeCharter = async (userIds: string[]): Promise<void> => {
  await request(() => odeServices.http().put<void>('/minibadge/revoke', { userIds }));
};

/** Shape of the `GET /revoked` response: `revokedAt` is only present when `revoked` is `true`. */
export interface CharterRevokedStatus {
  revoked: boolean;
  revokedAt?: string;
}

export const getCharterRevokedStatus = async (): Promise<CharterRevokedStatus> => {
  const response = await request(() =>
    odeServices.http().get<CharterRevokedStatus>('/minibadge/revoked', {
      disableNotifications: true,
    }),
  );
  return response;
};

/**
 * The chart acceptance state is NOT a `/minibadge/*` endpoint — it's stored
 * in ENT Core's generic per-user preference store (`GET/PUT
 * /userbook/preference/:key`), read here via
 * `odeServices.conf().getPreference`.
 *
 * Any failure (preference never saved, malformed JSON, network error)
 * resolves to an empty chart rather than rejecting, since "no chart yet" is
 * the expected first-visit state, not an error.
 */
export const getUserChart = async (): Promise<ChartPreference> => {
  try {
    const preference = await request(() =>
      odeServices.conf().getPreference<ChartPreference>(MINIBADGE_CHART_PREFERENCE_KEY),
    );
    return preference ?? {};
  } catch {
    return {};
  }
};

/**
 * PUT /userbook/preference/minibadge.chart — replaces the whole preference
 * value (no partial patch).
 *
 * Deliberately calls `odeServices.http()` directly instead of
 * `odeServices.conf().savePreference(...)`: that method's underlying
 * `putJson()` call is fire-and-forget (missing `await`/`return`), so
 * `request()`'s error handling below would read a stale response from
 * whatever the previous request happened to be, not the outcome of this
 * save — it could never reliably throw on a failed write. `getPreference()`
 * (used by `getUserChart` above) doesn't have this bug, since it needs the
 * parsed value and is properly awaited internally.
 */
export const saveUserChart = async (chart: ChartPreference): Promise<void> => {
  await request(() =>
    odeServices.http().put<void>(`/userbook/preference/${MINIBADGE_CHART_PREFERENCE_KEY}`, chart),
  );
};
