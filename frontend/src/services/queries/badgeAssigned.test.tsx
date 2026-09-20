import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { fakeBadgeAssigned } from '~/mocks/handlers';
import { server } from '~/mocks/server';
import { ApiError } from '~/services/api/http';
import {
  useAssignBadge,
  useBadgesAssignedAll,
  useBadgesGiven,
  useRevokeBadgeAssigned,
} from '~/services/queries/badgeAssigned';

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

describe('useBadgesGiven / useBadgesAssignedAll', () => {
  it('resolves the mocked given badges list', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useBadgesGiven(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    expect(result.current.badgesGiven).toEqual([fakeBadgeAssigned]);
  });

  it('resolves the mocked all-assigned badges list', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useBadgesAssignedAll(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    expect(result.current.badgesAssignedAll).toEqual([fakeBadgeAssigned]);
  });

  it('sends the given-list query param and gets an empty list back when nothing matches', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useBadgesGiven({ query: 'no-such-assignor' }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    expect(result.current.badgesGiven).toEqual([]);
  });

  it('sends the all-assigned-list query param and gets a matching result back', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useBadgesAssignedAll({ query: fakeBadgeAssigned.assignorDisplayName }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    expect(result.current.badgesAssignedAll).toEqual([fakeBadgeAssigned]);
  });

  /**
   * REGRESSION (http.ts central fix): `odeServices.http().get(...)` rejects
   * on any non-2xx response, so before `request()` wrapped this GET call
   * site, the hook's `error` would have been the raw rejected axios error
   * instead of a stable `ApiError`.
   */
  it('surfaces a real ApiError when the given-badges GET fails with a 401', async () => {
    server.use(http.get('/minibadge/assigned/given', () => new HttpResponse(null, { status: 401 })));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useBadgesGiven(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.query.isError).toBe(true));

    expect(result.current.query.error).toBeInstanceOf(ApiError);
    expect((result.current.query.error as ApiError).code).toBe('unauthorized');
  });
});

describe('useRevokeBadgeAssigned', () => {
  it('revokes a badge and invalidates every `assigned` query (given + all)', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRevokeBadgeAssigned(), { wrapper: Wrapper });

    result.current.mutate(fakeBadgeAssigned.id);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['assigned'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['badges'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['badgeTypes'] });
  });

  /**
   * REGRESSION (http.ts central fix): `odeServices.http().put(...)` rejects
   * on any non-2xx response, so before `request()` wrapped this mutation's
   * call site, the hook's `error` would have been the raw rejected axios
   * error instead of a stable `ApiError`.
   */
  it('surfaces a real ApiError when the revoke PUT fails with a 404', async () => {
    server.use(
      http.put('/minibadge/revoked/given/:badgeId', () => new HttpResponse(null, { status: 404 })),
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRevokeBadgeAssigned(), { wrapper: Wrapper });

    result.current.mutate(fakeBadgeAssigned.id);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).code).toBe('notfound');
  });
});

describe('useAssignBadge', () => {
  it('assigns a badge to owners and invalidates the assigned, badges and badgeTypes queries', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useAssignBadge(), { wrapper: Wrapper });

    result.current.mutate({ typeId: 10, ownerIds: ['a1b2c3d4'] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['assigned'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['badges'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['badgeTypes'] });
  });
});
