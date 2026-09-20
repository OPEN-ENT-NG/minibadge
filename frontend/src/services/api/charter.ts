import { odeServices } from '@edifice.io/client';

import { ChartPreference, MINIBADGE_CHART_PREFERENCE_KEY } from '~/models/chart';
import { request } from '~/services/api/http';

/**
 * PUT /accept — verified in `MinibadgeController.java#acceptBadge`.
 * Renders an empty JSON object: no usable body, resolves `void`.
 */
export const acceptCharter = async (): Promise<void> => {
  await request(() => odeServices.http().put<void>('/minibadge/accept'));
};

/**
 * PUT /minibadge/refuse — verified in `MinibadgeController.java#refuseMinibadge`.
 * No usable response body (see `acceptCharter`).
 */
export const refuseCharter = async (): Promise<void> => {
  await request(() => odeServices.http().put<void>('/minibadge/refuse'));
};

/**
 * PUT /minibadge/revoke — verified in `MinibadgeController.java#revokeUsersMinibadge` (AdminRight).
 * Body is `{ userIds: string[] }` (`Field.USERIDS`). No usable response body.
 */
export const revokeCharter = async (userIds: string[]): Promise<void> => {
  await request(() => odeServices.http().put<void>('/minibadge/revoke', { userIds }));
};

/**
 * Shape of the `GET /revoked` response — verified in
 * `MinibadgeController.java#getRevokedMinibadgeConsentStatus`: `revokedAt` is
 * only present in the JSON when `revoked` is `true`.
 */
export interface CharterRevokedStatus {
  revoked: boolean;
  revokedAt?: string;
}

/**
 * GET /revoked — verified in `MinibadgeController.java#getRevokedMinibadgeConsentStatus`.
 */
export const getCharterRevokedStatus = async (): Promise<CharterRevokedStatus> => {
  const response = await request(() =>
    odeServices.http().get<CharterRevokedStatus>('/minibadge/revoked', {
      disableNotifications: true,
    }),
  );
  return response;
};

/**
 * DEVIATION FROM PLAN: the plan's Task 4 expected a `getUserChart`-style call
 * to sit next to `accept`/`refuse`/`revoke`/`revoked` as if it were another
 * `/minibadge/*` endpoint. There is no such endpoint — verified by reading
 * `MinibadgeController.java` in full (only `view`/`accept`/`refuse`/`revoke`/
 * `revoked`) and the real AngularJS `chart.service.ts#getUserChart`, which
 * reads `Me.preference('minibadge.chart')` — ENT Core's generic per-user
 * preference store (`GET/PUT /userbook/preference/:key`), unrelated to this
 * module's own API. `odeServices.conf().getPreference`/`savePreference` is
 * the `@edifice.io/client` equivalent of `Me.preference`/`Me.savePreference`
 * (verified in `node_modules/@edifice.io/client/dist/configure/Service.d.ts`
 * and its implementation, which itself calls the same
 * `/userbook/preference/:key` route and JSON.parses the `preference` field).
 *
 * Mirrors `chartService.getUserChart()`'s own defensive `.catch()`: any
 * failure (preference never saved, malformed JSON, network error) resolves
 * to an empty chart rather than rejecting, since "no chart yet" is the
 * expected first-visit state, not an error.
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
 * PUT /userbook/preference/minibadge.chart — see the deviation note on
 * `getUserChart` above for why this is a generic ENT Core user preference
 * and not a `/minibadge/*` endpoint. Replaces the whole preference value,
 * mirroring `Me.savePreference(PREFERENCES.CHART)` (the AngularJS service
 * always writes back the full `IChartResponse`, never a partial patch).
 *
 * REVIEW FIX (typescript-reviewer, HIGH): this used to call
 * `odeServices.conf().savePreference(...)`, but that method has a real bug
 * in the installed `@edifice.io/client@2.2.4` — verified in
 * `node_modules/@edifice.io/client/dist/index.js`'s `ConfService`:
 *
 *   async savePreference(e, t) {
 *     this.http.putJson(`/userbook/preference/${e}`, t);
 *   }
 *
 * Note the missing `await`/`return`: the underlying `putJson()` call is
 * fire-and-forget. Calling `checkHttpResponse()` (which reads
 * `odeServices.http().latestResponse`) immediately after `await
 * odeServices.conf().savePreference(...)` therefore read a STALE response —
 * from whatever the previous request happened to be — not the outcome of
 * the save just issued, so this could never reliably throw on a failed
 * write (and could spuriously throw based on an unrelated prior request).
 * `getPreference()` does NOT have this bug (`async getPreference(e) { const
 * t = await this.http.get(...); return ...; }` — properly awaited, since it
 * needs the parsed value), so `getUserChart` above is left as-is.
 *
 * Fixed by bypassing `ConfService.savePreference` entirely and calling the
 * same underlying route directly and awaitably via `odeServices.http()` —
 * the same shared HTTP client every other `services/api/*.ts` call site in
 * this codebase already uses (see `acceptCharter`/`refuseCharter`/
 * `revokeCharter` above). This is a distinct bug from the generic
 * reject-on-non-2xx one `request()` (in `~/services/api/http.ts`) fixes
 * codebase-wide: `ConfService.savePreference`'s missing `await` means it
 * reads a *stale* `.latestResponse` regardless of what status code is
 * involved, whereas `request()`'s fix is about `.latestResponse` being
 * *current* but reached via a rejected promise. Both had to be understood
 * and fixed independently for this one call site.
 */
export const saveUserChart = async (chart: ChartPreference): Promise<void> => {
  await request(() =>
    odeServices.http().put<void>(`/userbook/preference/${MINIBADGE_CHART_PREFERENCE_KEY}`, chart),
  );
};
