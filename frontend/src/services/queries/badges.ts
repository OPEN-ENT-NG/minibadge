import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getBadges,
  privatizeBadge,
  publishBadge,
  refuseBadge,
} from '~/services/api/badges';

export const badgesQueryOptions = (query?: string) =>
  queryOptions({
    queryKey: ['badges', query],
    queryFn: () => getBadges(query),
  });

export const useBadges = (query?: string) => {
  const result = useQuery(badgesQueryOptions(query));
  return { badges: result.data, query: result };
};

export const usePublishBadge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (typeId: number) => publishBadge(typeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['badges'] }),
  });
};

export const usePrivatizeBadge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (typeId: number) => privatizeBadge(typeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['badges'] }),
  });
};

export const useRefuseBadge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (typeId: number) => refuseBadge(typeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['badges'] }),
  });
};
