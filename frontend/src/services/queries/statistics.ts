import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getStatistics, synchronizeStatistics } from '~/services/api/statistics';

export const statisticsQueryOptions = (minDate?: string) =>
  queryOptions({
    queryKey: ['statistics', minDate],
    queryFn: () => getStatistics(minDate),
  });

export const useStatistics = (minDate?: string) => {
  const result = useQuery(statisticsQueryOptions(minDate));
  return { statistics: result.data, query: result };
};

export const useSynchronizeStatistics = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => synchronizeStatistics(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['statistics'] }),
  });
};
