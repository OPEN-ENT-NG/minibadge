import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { fakeBadgeType, fakeUser } from '~/mocks/handlers';
import { server } from '~/mocks/server';
import {
  useBadgeType,
  useBadgeTypeAssigners,
  useBadgeTypeReceivers,
  useBadgeTypes,
  useCreateBadgeType,
} from '~/services/queries/badgeTypes';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useBadgeTypes', () => {
  it('resolves the mocked paginated badge type list', async () => {
    const { result } = renderHook(() => useBadgeTypes(0, 10), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    expect(result.current.badgeTypes).toEqual({
      all: [fakeBadgeType],
      limit: 10,
      offset: 0,
    });
  });

  it('sends the query param and gets a matching result back', async () => {
    const { result } = renderHook(() => useBadgeTypes(0, 10, fakeBadgeType.label), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    expect(result.current.badgeTypes?.all).toEqual([fakeBadgeType]);
  });

  it('sends the query param and gets an empty list back when nothing matches', async () => {
    const { result } = renderHook(() => useBadgeTypes(0, 10, 'no-such-badge'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    expect(result.current.badgeTypes?.all).toEqual([]);
  });
});

describe('useBadgeType', () => {
  it('resolves a single mocked badge type', async () => {
    const { result } = renderHook(() => useBadgeType(fakeBadgeType.id), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    expect(result.current.badgeType).toEqual(fakeBadgeType);
  });
});

describe('useBadgeTypeAssigners / useBadgeTypeReceivers', () => {
  it('resolves the mocked assigners page', async () => {
    const { result } = renderHook(() => useBadgeTypeAssigners(fakeBadgeType.id, 0, 10), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    expect(result.current.assigners).toEqual({
      all: [fakeUser],
      page: 0,
      pageCount: 1,
      userAssignersTotal: 1,
    });
  });

  it('resolves the mocked receivers page', async () => {
    const { result } = renderHook(() => useBadgeTypeReceivers(fakeBadgeType.id, 0, 10), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    expect(result.current.receivers).toEqual({
      all: [fakeUser],
      page: 0,
      pageCount: 1,
      receiversTotal: 1,
    });
  });
});

describe('useCreateBadgeType', () => {
  it('POSTs the payload and resolves the created badge type', async () => {
    let receivedBody: unknown;
    server.use(
      http.post('/minibadge/types', async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ ...fakeBadgeType, id: 99, label: 'Entraide' }, { status: 201 });
      }),
    );

    const { result } = renderHook(() => useCreateBadgeType(), { wrapper: createWrapper() });
    result.current.mutate({ label: 'Entraide', categoryIds: [1, 2] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(receivedBody).toEqual({ label: 'Entraide', categoryIds: [1, 2] });
    expect(result.current.data?.id).toBe(99);
  });

  /**
   * The new badge type must show up in the library immediately. `['badgeTypes']` is the ROOT of
   * every list variant's key, so invalidating it reaches them all through React Query's prefix
   * matching — invalidating a single fully-specified key would not.
   */
  it('invalidates the whole badgeTypes query-key root on success', async () => {
    server.use(http.post('/minibadge/types', () => HttpResponse.json(fakeBadgeType, { status: 201 })));

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateBadgeType(), { wrapper });
    result.current.mutate({ label: 'Entraide' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['badgeTypes'] });
  });

  it('surfaces a server rejection as a failed mutation', async () => {
    server.use(http.post('/minibadge/types', () => new HttpResponse(null, { status: 400 })));

    const { result } = renderHook(() => useCreateBadgeType(), { wrapper: createWrapper() });
    result.current.mutate({ label: 'Entraide' });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
