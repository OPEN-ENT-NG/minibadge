import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  BadgeAssignedFilters,
  assignBadge,
  getBadgesAssignedAll,
  getBadgesGiven,
  revokeBadgeAssigned,
} from '~/services/api/badgeAssigned';

/**
 * Query keys are nested under a common `'assigned'` root — `['assigned', 'given', ...]`
 * / `['assigned', 'all', ...]` — rather than flattened into a single string like
 * `'assigned-given'`, specifically so that `queryClient.invalidateQueries({ queryKey:
 * ['assigned'] })` (see the mutations below, mirroring MUTATION_PATTERN) invalidates
 * both lists via React Query's prefix matching. A flattened key would not match that
 * invalidation call at all.
 */
export const badgesGivenQueryOptions = (filters: BadgeAssignedFilters = {}) =>
  queryOptions({
    queryKey: [
      'assigned',
      'given',
      filters.query,
      filters.startDate,
      filters.endDate,
      filters.sortBy,
      filters.sortAsc,
    ],
    queryFn: () => getBadgesGiven(filters),
  });

export const useBadgesGiven = (filters: BadgeAssignedFilters = {}) => {
  const result = useQuery(badgesGivenQueryOptions(filters));
  return { badgesGiven: result.data, query: result };
};

export const badgesAssignedAllQueryOptions = (filters: BadgeAssignedFilters = {}) =>
  queryOptions({
    queryKey: [
      'assigned',
      'all',
      filters.query,
      filters.startDate,
      filters.endDate,
      filters.sortBy,
      filters.sortAsc,
    ],
    queryFn: () => getBadgesAssignedAll(filters),
  });

export const useBadgesAssignedAll = (filters: BadgeAssignedFilters = {}) => {
  const result = useQuery(badgesAssignedAllQueryOptions(filters));
  return { badgesAssignedAll: result.data, query: result };
};

/**
 * REVIEW FIX (react-reviewer, HIGH): assigning/revoking a badge also changes
 * `Badge.counts.assigned` and `BadgeType.countAssigned` server-side (see
 * `backend/.../model/BadgeType.java`'s `countAssigned` field), so the
 * `['badges']` and `['badgeTypes']` query-key roots (from `services/queries/
 * badges.ts` / `badgeTypes.ts`) must be invalidated alongside `['assigned']`,
 * or any screen reading those caches would show stale counts after an
 * assign/revoke.
 */
export const useRevokeBadgeAssigned = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (badgeId: number) => revokeBadgeAssigned(badgeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assigned'] });
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      queryClient.invalidateQueries({ queryKey: ['badgeTypes'] });
    },
  });
};

export const useAssignBadge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ typeId, ownerIds }: { typeId: number; ownerIds: string[] }) =>
      assignBadge(typeId, ownerIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assigned'] });
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      queryClient.invalidateQueries({ queryKey: ['badgeTypes'] });
    },
  });
};
