import { queryOptions, useQuery } from '@tanstack/react-query';

import { getBadgeCategories } from '~/services/api/badgeCategories';

export const badgeCategoriesQueryOptions = () =>
  queryOptions({
    queryKey: ['badgeCategories'],
    queryFn: () => getBadgeCategories(),
  });

export const useBadgeCategories = () => {
  const result = useQuery(badgeCategoriesQueryOptions());
  return { categories: result.data, query: result };
};
