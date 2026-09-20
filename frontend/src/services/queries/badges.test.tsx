import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { fakeBadge } from '~/mocks/handlers';
import { server } from '~/mocks/server';
import { ApiError } from '~/services/api/http';
import {
  useBadges,
  usePrivatizeBadge,
  usePublishBadge,
  useRefuseBadge,
} from '~/services/queries/badges';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    Wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
    queryClient,
  };
}

describe('useBadges', () => {
  it('resolves the mocked badge list, typed', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useBadges(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    expect(result.current.badges).toEqual([fakeBadge]);
  });

  /**
   * REGRESSION (http.ts central fix): `odeServices.http().get(...)` rejects
   * on any non-2xx response (axios's default `validateStatus`), so before
   * `request()` wrapped every `services/api/*.ts` call site, the raw
   * rejected axios error (not a stable `ApiError`) reached this hook's
   * `error` field unchanged. Proves the GET path now normalizes a non-2xx
   * MSW response into a real `ApiError` with the right `.code`.
   */
  it('surfaces a real ApiError with code "error" when the badges GET fails with a 500', async () => {
    server.use(http.get('/minibadge/badges', () => new HttpResponse(null, { status: 500 })));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useBadges(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.query.isError).toBe(true));

    expect(result.current.query.error).toBeInstanceOf(ApiError);
    expect((result.current.query.error as ApiError).code).toBe('error');
  });

  it('surfaces a real ApiError with code "notfound" when the badges GET returns a 404', async () => {
    server.use(http.get('/minibadge/badges', () => new HttpResponse(null, { status: 404 })));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useBadges(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.query.isError).toBe(true));

    expect(result.current.query.error).toBeInstanceOf(ApiError);
    expect((result.current.query.error as ApiError).code).toBe('notfound');
  });
});

describe('usePublishBadge / usePrivatizeBadge / useRefuseBadge', () => {
  it('publishes a badge and invalidates the badges query', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => usePublishBadge(), { wrapper: Wrapper });

    result.current.mutate(fakeBadge.badgeTypeId);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['badges'] });
  });

  it('privatizes a badge and invalidates the badges query', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => usePrivatizeBadge(), { wrapper: Wrapper });

    result.current.mutate(fakeBadge.badgeTypeId);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['badges'] });
  });

  it('refuses a badge and invalidates the badges query', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRefuseBadge(), { wrapper: Wrapper });

    result.current.mutate(fakeBadge.badgeTypeId);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['badges'] });
  });
});
