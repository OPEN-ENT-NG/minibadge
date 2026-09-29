import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  downloadCertificate,
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

export interface DownloadCertificateCallbacks {
  onSuccess?: (blob: Blob) => void;
  onError?: (error: Error) => void;
}

/**
 * Epic D: fetches the certificate PDF (nothing to invalidate — it is a read).
 *
 * The callbacks are the mutation's own, not `mutate()`'s: those are dropped once the calling component
 * unmounts, and a PDF can take long enough to generate for the user to navigate away meanwhile — the
 * file must still be saved, or the failure still reported.
 */
export const useDownloadCertificate = ({ onSuccess, onError }: DownloadCertificateCallbacks = {}) =>
  useMutation({
    mutationFn: () => downloadCertificate(),
    onSuccess: (blob) => onSuccess?.(blob),
    onError: (error) => onError?.(error),
  });
