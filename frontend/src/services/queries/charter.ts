import { odeServices } from '@edifice.io/client';
import { useUser } from '@edifice.io/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ChartPreference } from '~/models/chart';
import {
  acceptCharter,
  getCharterRevokedStatus,
  getUserChart,
  refuseCharter,
  revokeCharter,
  saveUserChart,
} from '~/services/api/charter';

export const useAcceptCharter = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => acceptCharter(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['charter'] }),
  });
};

export const useRefuseCharter = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => refuseCharter(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['charter'] }),
  });
};

export const useRevokeCharter = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userIds: string[]) => revokeCharter(userIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['charter'] }),
  });
};

export const useCharterRevokedStatus = () => {
  const result = useQuery({
    queryKey: ['charter', 'revoked'],
    queryFn: () => getCharterRevokedStatus(),
  });
  return { revokedStatus: result.data, query: result };
};

/**
 * Reads the "minibadge chart" user preference (see the deviation note on
 * `getUserChart` in `~/services/api/charter.ts`). Under the same `['charter']`
 * key prefix as the other charter queries so `useAcceptCharter`/
 * `useRefuseCharter`/`useRevokeCharter`'s `invalidateQueries({ queryKey:
 * ['charter'] })` also refreshes this one.
 */
export const useUserChart = () => {
  const result = useQuery({
    queryKey: ['charter', 'chart'],
    queryFn: () => getUserChart(),
  });
  return { chart: result.data, query: result };
};

/**
 * SOURCE: `backend/.../ts/core/constants/rights.const.ts`. These are ENT
 * Core workflow rights (`hasWorkflow`), not `/minibadge/*` endpoints — there
 * is nothing to fetch, only a boolean check against the connected user's
 * `authorizedActions` (see `Chart.canAssign`/`canReceive` in
 * `chart.model.ts`, which combine this with `acceptAssign`/`acceptReceive`
 * below).
 */
export const MINIBADGE_WORKFLOW_RIGHTS = {
  assign: 'fr.openent.minibadge.controller.FakeRight|assign',
  receive: 'fr.openent.minibadge.controller.FakeRight|receive',
  admin: 'fr.openent.minibadge.controller.FakeRight|admin',
  // Phase 6 (`/statistics` route + `AppNavbar`'s last item): two INDEPENDENT
  // rights, verified in `rights.const.ts`. `statisticsView` gates the whole
  // route (mirrors `admin` above); `statisticsViewAllStructures` only gates
  // extra sections/columns INSIDE that already-accessible screen (the
  // "établissements les plus actifs" block, the structure name column in the
  // user grids) — it never gates a route or a distinct server call on its
  // own. A user can have `statisticsView` without `statisticsViewAllStructures`
  // (the reverse is possible in principle too — these are not modeled as
  // implying one another).
  statisticsView: 'fr.openent.minibadge.controller.FakeRight|statisticsView',
  statisticsViewAllStructures: 'fr.openent.minibadge.controller.FakeRight|statisticsViewAllStructures',
} as const;

/**
 * PLAN GAP FILLED (Task 4 risk: "le droit canReceive() n'a pas encore de hook
 * dédié en Phase 1"): confirmed absent — Phase 1 only shipped
 * `useGlobalSettings`/`useCharterRevokedStatus`, neither of which computes
 * `canReceive()`/`canAssign()`. This hook mirrors `Chart.canAssign`/
 * `canReceive` (`chart.model.ts`) and the gate calculation in
 * `main.ts#initInfos` (`main.ts:140-163`) exactly:
 *
 * - `isAllowedToUseMinibadge = hasWorkflow(assign) || hasWorkflow(receive)`
 * - `canAssign = hasWorkflow(assign) && !!chart.acceptAssign`
 * - `canReceive = hasWorkflow(receive) && !!chart.acceptReceive`
 * - `isChartLightboxOpen = isAllowedToUseMinibadge && !chart.readChart && !chart.acceptChart`
 *
 * `odeServices.session().hasWorkflow({ workflowName, user })` (verified in
 * `node_modules/@edifice.io/client/dist/session/Service.d.ts`) is the
 * `@edifice.io/client` equivalent of the AngularJS `model.me.hasWorkflow`.
 */
export const useMinibadgeAccess = () => {
  const { user } = useUser();
  const { chart, query: chartQuery } = useUserChart();
  const { revokedStatus, query: revokedQuery } = useCharterRevokedStatus();

  const hasAssignWorkflow = !!user
    && odeServices.session().hasWorkflow({ workflowName: MINIBADGE_WORKFLOW_RIGHTS.assign, user });
  const hasReceiveWorkflow = !!user
    && odeServices.session().hasWorkflow({ workflowName: MINIBADGE_WORKFLOW_RIGHTS.receive, user });
  // Phase 5 (`/admin` route + `AppNavbar`): mirrors `hasAdminViewRight()`
  // (`navbar.html:17-22`) / the `admin` route guard (`main.ts:82`), both
  // `hasWorkflow(rights.workflow.admin)` with no additional chart/preference
  // condition — unlike `canAssign`/`canReceive` above, this right alone
  // gates the screen (no charter acceptance involved).
  const hasAdminWorkflow = !!user
    && odeServices.session().hasWorkflow({ workflowName: MINIBADGE_WORKFLOW_RIGHTS.admin, user });
  // Phase 6 (`/statistics` route + `AppNavbar`): same pattern as
  // `hasAdminWorkflow` above — `hasStatisticsViewRight()`
  // (`navbar.html:23-28`) / the `/statistics` route guard (`main.ts:90-98`),
  // a plain `hasWorkflow(...)` check with no chart/preference condition.
  const hasStatisticsViewWorkflow = !!user
    && odeServices.session().hasWorkflow({ workflowName: MINIBADGE_WORKFLOW_RIGHTS.statisticsView, user });
  // `hasStatisticsViewAllStructuresRight()` (`statistics.controller.ts:88`) —
  // purely a display gate INSIDE the statistics screen, never a route guard.
  // Deliberately NOT derived from `hasStatisticsViewWorkflow` (these are two
  // independent rights, not one a subset of the other).
  const hasStatisticsViewAllStructuresWorkflow = !!user
    && odeServices.session().hasWorkflow({ workflowName: MINIBADGE_WORKFLOW_RIGHTS.statisticsViewAllStructures, user });

  const resolvedChart: ChartPreference = chart ?? {};
  const isAllowedToUseMinibadge = hasAssignWorkflow || hasReceiveWorkflow;

  return {
    isLoading: !user || chartQuery.isLoading || revokedQuery.isLoading,
    isAllowedToUseMinibadge,
    canAssign: hasAssignWorkflow && !!resolvedChart.acceptAssign,
    canReceive: hasReceiveWorkflow && !!resolvedChart.acceptReceive,
    isChartLightboxOpen:
      isAllowedToUseMinibadge && !resolvedChart.readChart && !resolvedChart.acceptChart,
    isRevoked: !!revokedStatus?.revoked,
    chart: resolvedChart,
    hasAssignWorkflow,
    hasReceiveWorkflow,
    isAdmin: hasAdminWorkflow,
    isStatisticsView: hasStatisticsViewWorkflow,
    isStatisticsViewAllStructures: hasStatisticsViewAllStructuresWorkflow,
  };
};

/**
 * Marks the chart as "seen" without accepting it — mirrors
 * `chartService.viewChart()` (`chart.service.ts:71-79`), called from
 * `resetChartValues()` whenever the lightbox is dismissed. Only writes when
 * `readChart` isn't already set (same guard as the source).
 *
 * DEVIATION FROM SOURCE: the original spreads incorrectly
 * (`Me.preferences[PREFERENCES.CHART] = {oldChart, readChart: ...}`, nesting
 * the old chart under an `oldChart` key instead of spreading its fields) —
 * that is a bug in the reference implementation, not a behavior worth
 * porting. This spreads the existing chart correctly (`{...chart, readChart:
 * ...}`) so previously-saved fields (`acceptChart`, `acceptAssign`, …)
 * survive the write, which is clearly the intent.
 */
export const useViewChart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chart: ChartPreference) =>
      chart.readChart ? Promise.resolve() : saveUserChart({ ...chart, readChart: new Date().toISOString() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['charter'] }),
  });
};

/**
 * Mirrors `chartService.saveChart(isChartAccepted, isMinibadgeAccepted)`
 * (`chart.service.ts:25-69`) exactly, including which HTTP endpoint (if any)
 * gets called: only the RECEIVE workflow ever triggers `/accept` or
 * `/refuse` — an assign-only user validating the charter only updates the
 * preference, never calls either endpoint. That asymmetry is in the real
 * source, not a mistake introduced here.
 */
export interface ValidateCharterInput {
  chart: ChartPreference;
  isChartAccepted: boolean;
  isMinibadgeAccepted: boolean;
  hasAssignWorkflow: boolean;
  hasReceiveWorkflow: boolean;
}

export const useValidateCharter = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      chart,
      isChartAccepted,
      isMinibadgeAccepted,
      hasAssignWorkflow,
      hasReceiveWorkflow,
    }: ValidateCharterInput) => {
      const isNewlyAccepted =
        isChartAccepted && isMinibadgeAccepted && (!chart.acceptChart || (!chart.acceptAssign && !chart.acceptReceive));
      const isChartNewlyAccepted = isChartAccepted && !chart.acceptChart;
      const isChartNewlyRefused = !isChartAccepted && !!chart.acceptChart;
      const isNewlyRefused = (!isChartAccepted || !isMinibadgeAccepted) && !!chart.acceptChart;
      const isReceivedNewlyRefused = isNewlyRefused && !!chart.acceptReceive;
      const isAssignNewlyRefused = isNewlyRefused && !!chart.acceptAssign;

      const now = new Date().toISOString();
      const newChart: ChartPreference = {
        acceptChart: isChartNewlyAccepted ? now : !isChartNewlyRefused ? chart.acceptChart : undefined,
        acceptAssign:
          isNewlyAccepted && hasAssignWorkflow ? now : !isAssignNewlyRefused ? chart.acceptAssign : undefined,
        acceptReceive:
          isNewlyAccepted && hasReceiveWorkflow ? now : !isReceivedNewlyRefused ? chart.acceptReceive : undefined,
        readChart: now,
        validateChart: now,
      };

      await saveUserChart(newChart);
      if (isNewlyAccepted && hasReceiveWorkflow) {
        await acceptCharter();
      } else if (isReceivedNewlyRefused) {
        await refuseCharter();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charter'] });
      queryClient.invalidateQueries({ queryKey: ['badges'] });
    },
  });
};
