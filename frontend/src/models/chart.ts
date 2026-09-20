/**
 * Shape of the "minibadge chart" user preference — NOT a `/minibadge/*`
 * response. Verified in the real AngularJS frontend
 * (`backend/src/main/resources/public/ts/models/chart.model.ts` +
 * `services/chart.service.ts`): the user's charter/consent state is stored
 * as an ENT Core generic user preference (`Me.preference('minibadge.chart')`,
 * i.e. `GET/PUT /userbook/preference/minibadge.chart`), not fetched from any
 * minibadge backend endpoint. There is no Java controller action that reads
 * or writes it — confirmed by grepping `MinibadgeController.java`, which only
 * exposes `/accept`, `/refuse`, `/revoke` and `/revoked` (see
 * `~/services/api/charter.ts`).
 *
 * Every field is an ISO date string set the moment the corresponding
 * acceptance happened, absent otherwise (`IChartResponse` in the source).
 */
export interface ChartPreference {
  acceptChart?: string;
  acceptAssign?: string;
  acceptReceive?: string;
  readChart?: string;
  validateChart?: string;
}

/** The generic ENT Core preference key this app stores its chart under. */
export const MINIBADGE_CHART_PREFERENCE_KEY = 'minibadge.chart';
