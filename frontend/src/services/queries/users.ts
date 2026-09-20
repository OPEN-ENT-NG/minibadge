import { useQuery } from '@tanstack/react-query';

import { searchUsersAdmin, searchUsersForType } from '~/services/api/users';

export const useSearchUsersForType = (typeId: number, query?: string) => {
  const result = useQuery({
    queryKey: ['users-search', typeId, query],
    queryFn: () => searchUsersForType(typeId, query),
    enabled: !!query,
  });
  return { users: result.data, query: result };
};

export const useSearchUsersAdmin = (query?: string) => {
  const result = useQuery({
    queryKey: ['users-search-admin', query],
    queryFn: () => searchUsersAdmin(query),
    enabled: !!query,
  });
  return { users: result.data, query: result };
};
