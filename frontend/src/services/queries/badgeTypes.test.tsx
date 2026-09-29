import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { fakeBadgeType, fakeUser } from '~/mocks/handlers';
import { server } from '~/mocks/server';
import { ALL_BADGE_TYPES_MAX_PAGES, getAllBadgeTypes } from '~/services/api/badgeTypes';
import {
  useAllBadgeTypes,
  useBadgeType,
  useBadgeTypeAssigners,
  useBadgeTypeReceivers,
  useBadgeTypes,
  useCreateBadgeType,
  useUpdateBadgeTypeValidity,
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

describe('useAllBadgeTypes', () => {
  it('walks every page of GET /types, stopping at the first short page', async () => {
    const offsets: number[] = [];
    const types = Array.from({ length: 5 }, (_, index) => ({ ...fakeBadgeType, id: index + 1, label: `Badge ${index + 1}` }));
    server.use(
      http.get('/minibadge/types', ({ request }) => {
        const url = new URL(request.url);
        const offset = Number(url.searchParams.get('offset'));
        const limit = Number(url.searchParams.get('limit'));
        offsets.push(offset);
        return HttpResponse.json({ all: types.slice(offset, offset + limit), limit, offset });
      }),
    );

    const all = await getAllBadgeTypes(2);

    expect(all.map((type) => type.id)).toEqual([1, 2, 3, 4, 5]);
    expect(offsets).toEqual([0, 2, 4]);
  });

  it('advances by the limit the server actually applied when it caps the requested one', async () => {
    const offsets: number[] = [];
    const types = Array.from({ length: 5 }, (_, index) => ({ ...fakeBadgeType, id: index + 1 }));
    server.use(
      http.get('/minibadge/types', ({ request }) => {
        const offset = Number(new URL(request.url).searchParams.get('offset'));
        offsets.push(offset);
        // Asked for 4, capped to 2 (like PAGE_SIZE_MAX), and echoed back.
        return HttpResponse.json({ all: types.slice(offset, offset + 2), limit: 2, offset });
      }),
    );

    const all = await getAllBadgeTypes(4);

    expect(all.map((type) => type.id)).toEqual([1, 2, 3, 4, 5]);
    expect(offsets).toEqual([0, 2, 4]);
  });

  it('stops when a page brings nothing new (a server ignoring offset) instead of looping forever', async () => {
    let calls = 0;
    const types = [1, 2].map((id) => ({ ...fakeBadgeType, id }));
    server.use(
      http.get('/minibadge/types', () => {
        calls += 1;
        return HttpResponse.json({ all: types, limit: 2, offset: 0 });
      }),
    );

    const all = await getAllBadgeTypes(2);

    expect(all.map((type) => type.id)).toEqual([1, 2]);
    expect(calls).toBe(2);
  });

  it('never fetches more than the hard page cap', async () => {
    let calls = 0;
    server.use(
      http.get('/minibadge/types', ({ request }) => {
        calls += 1;
        const offset = Number(new URL(request.url).searchParams.get('offset'));
        return HttpResponse.json({ all: [{ ...fakeBadgeType, id: offset + 1 }], limit: 1, offset });
      }),
    );

    const all = await getAllBadgeTypes(1);

    expect(calls).toBe(ALL_BADGE_TYPES_MAX_PAGES);
    expect(all).toHaveLength(ALL_BADGE_TYPES_MAX_PAGES);
  });

  it('is not fetched while disabled (the admin modal is closed)', async () => {
    let calls = 0;
    server.use(
      http.get('/minibadge/types', () => {
        calls += 1;
        return HttpResponse.json({ all: [], limit: 100, offset: 0 });
      }),
    );

    const { result } = renderHook(() => useAllBadgeTypes(false), { wrapper: createWrapper() });

    expect(result.current.query.fetchStatus).toBe('idle');
    expect(calls).toBe(0);
  });
});

describe('useUpdateBadgeTypeValidity', () => {
  it('PUTs only the end date to the badge type validity route', async () => {
    let receivedBody: unknown;
    let receivedTypeId: string | undefined;
    server.use(
      http.put('/minibadge/types/:typeId/validity', async ({ params, request }) => {
        receivedTypeId = params.typeId as string;
        receivedBody = await request.json();
        return HttpResponse.json({ id: 10, validUntil: '2027-06-30' });
      }),
    );

    const { result } = renderHook(() => useUpdateBadgeTypeValidity(), { wrapper: createWrapper() });
    result.current.mutate({ typeId: 10, validUntil: '2027-06-30' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(receivedTypeId).toBe('10');
    expect(receivedBody).toEqual({ validUntil: '2027-06-30' });
  });

  it('sends an explicit null to make the badge permanent again', async () => {
    let receivedBody: unknown;
    server.use(
      http.put('/minibadge/types/:typeId/validity', async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ id: 10, validUntil: null });
      }),
    );

    const { result } = renderHook(() => useUpdateBadgeTypeValidity(), { wrapper: createWrapper() });
    result.current.mutate({ typeId: 10, validUntil: null });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(receivedBody).toEqual({ validUntil: null });
  });

  /** The library AND the (singular-rooted) detail screen both show the date and gate "Décerner" on it. */
  it('invalidates the badge type lists and that badge type detail on success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUpdateBadgeTypeValidity(), { wrapper });
    result.current.mutate({ typeId: 10, validUntil: '2027-06-30' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['badgeTypes'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['badgeType', 10] });
  });

  it('surfaces a refusal (central or foreign badge: 403) as a failed mutation', async () => {
    server.use(http.put('/minibadge/types/:typeId/validity', () => new HttpResponse(null, { status: 403 })));

    const { result } = renderHook(() => useUpdateBadgeTypeValidity(), { wrapper: createWrapper() });
    result.current.mutate({ typeId: 2, validUntil: '2027-06-30' });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
