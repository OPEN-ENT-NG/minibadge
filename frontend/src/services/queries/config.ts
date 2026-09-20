import { useQuery } from '@tanstack/react-query';

import { getConfig, getGlobalSettings } from '~/services/api/config';

export const useConfig = () => {
  const result = useQuery({
    queryKey: ['config'],
    queryFn: () => getConfig(),
  });
  return { config: result.data, query: result };
};

export const useGlobalSettings = () => {
  const result = useQuery({
    queryKey: ['global-settings'],
    queryFn: () => getGlobalSettings(),
  });
  return { globalSettings: result.data, query: result };
};
