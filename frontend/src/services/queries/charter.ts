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
 * Reads the "minibadge chart" user preference. Under the same `['charter']`
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
 * These are ENT Core workflow rights (`hasWorkflow`), not `/minibadge/*`
 * endpoints — there is nothing to fetch, only a boolean check against the
 * connected user's `authorizedActions`.
 */
export const MINIBADGE_WORKFLOW_RIGHTS = {
  assign: 'fr.openent.minibadge.controller.FakeRight|assign',
  receive: 'fr.openent.minibadge.controller.FakeRight|receive',
  admin: 'fr.openent.minibadge.controller.FakeRight|admin',
  // `statisticsView` gates the whole `/statistics` route (like `admin`
  // above); `statisticsViewAllStructures` only gates extra sections/columns
  // INSIDE that already-accessible screen — it never gates a route or a
  // distinct server call on its own. A user can have `statisticsView`
  // without `statisticsViewAllStructures` (and vice versa) — these are
  // independent rights, not one implying the other.
  statisticsView: 'fr.openent.minibadge.controller.FakeRight|statisticsView',
  statisticsViewAllStructures: 'fr.openent.minibadge.controller.FakeRight|statisticsViewAllStructures',
} as const;

export const useMinibadgeAccess = () => {
  const { user } = useUser();
  const { chart, query: chartQuery } = useUserChart();
  const { revokedStatus, query: revokedQuery } = useCharterRevokedStatus();

  const hasAssignWorkflow = !!user
    && odeServices.session().hasWorkflow({ workflowName: MINIBADGE_WORKFLOW_RIGHTS.assign, user });
  const hasReceiveWorkflow = !!user
    && odeServices.session().hasWorkflow({ workflowName: MINIBADGE_WORKFLOW_RIGHTS.receive, user });
  // Unlike `canAssign`/`canReceive` above, this right alone gates the
  // screen — no charter acceptance is required.
  const hasAdminWorkflow = !!user
    && odeServices.session().hasWorkflow({ workflowName: MINIBADGE_WORKFLOW_RIGHTS.admin, user });
  const hasStatisticsViewWorkflow = !!user
    && odeServices.session().hasWorkflow({ workflowName: MINIBADGE_WORKFLOW_RIGHTS.statisticsView, user });
  // Purely a display gate INSIDE the statistics screen, never a route guard.
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
 * Marks the chart as "seen" without accepting it, called whenever the
 * lightbox is dismissed. Only writes when `readChart` isn't already set.
 * Spreads the existing chart (`{...chart, readChart: ...}`) so
 * previously-saved fields (`acceptChart`, `acceptAssign`, …) survive the
 * write.
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
 * Only the RECEIVE workflow ever triggers `/accept` or `/refuse` below — an
 * assign-only user validating the charter only updates the preference,
 * never calls either endpoint. That asymmetry is intentional.
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
