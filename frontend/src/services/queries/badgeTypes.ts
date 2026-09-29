import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  BadgeTypeCreatePayload,
  createBadgeType,
  getBadgeType,
  getBadgeTypeAssigners,
  getBadgeTypeReceivers,
  getBadgeTypes,
} from '~/services/api/badgeTypes';

export const badgeTypesQueryOptions = (
  offset: number,
  limit?: number,
  query?: string,
  categoryId?: number,
) =>
  queryOptions({
    queryKey: ['badgeTypes', offset, limit, query, categoryId],
    queryFn: () => getBadgeTypes(offset, limit, query, categoryId),
  });

export const useBadgeTypes = (
  offset: number,
  limit?: number,
  query?: string,
  categoryId?: number,
) => {
  const result = useQuery(badgeTypesQueryOptions(offset, limit, query, categoryId));
  return { badgeTypes: result.data, query: result };
};

export const badgeTypeQueryOptions = (typeId: number) =>
  queryOptions({
    queryKey: ['badgeType', typeId],
    queryFn: () => getBadgeType(typeId),
  });

export const useBadgeType = (typeId: number) => {
  const result = useQuery(badgeTypeQueryOptions(typeId));
  return { badgeType: result.data, query: result };
};

export const badgeTypeAssignersQueryOptions = (
  typeId: number,
  page?: number,
  limit?: number,
) =>
  queryOptions({
    queryKey: ['badgeTypeAssigners', typeId, page, limit],
    queryFn: () => getBadgeTypeAssigners(typeId, page, limit),
  });

export const useBadgeTypeAssigners = (typeId: number, page?: number, limit?: number) => {
  const result = useQuery(badgeTypeAssignersQueryOptions(typeId, page, limit));
  return { assigners: result.data, query: result };
};

export const badgeTypeReceiversQueryOptions = (
  typeId: number,
  page?: number,
  limit?: number,
) =>
  queryOptions({
    queryKey: ['badgeTypeReceivers', typeId, page, limit],
    queryFn: () => getBadgeTypeReceivers(typeId, page, limit),
  });

export const useBadgeTypeReceivers = (typeId: number, page?: number, limit?: number) => {
  const result = useQuery(badgeTypeReceiversQueryOptions(typeId, page, limit));
  return { receivers: result.data, query: result };
};

/**
 * Creating a badge type makes it appear in the library for everyone in the establishment, so the
 * whole `['badgeTypes']` query-key root is invalidated — React Query's prefix matching then reaches
 * every paginated/filtered list variant under it. The singular `['badgeType', id]` root is NOT a
 * prefix of it and needs no invalidation here: a type that has just been created has no detail view
 * cached yet.
 */
export const useCreateBadgeType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BadgeTypeCreatePayload) => createBadgeType(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badgeTypes'] });
    },
  });
};
