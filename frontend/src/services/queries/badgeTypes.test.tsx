import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { fakeBadgeType, fakeUser } from '~/mocks/handlers';
import {
  useBadgeType,
  useBadgeTypeAssigners,
  useBadgeTypeReceivers,
  useBadgeTypes,
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
