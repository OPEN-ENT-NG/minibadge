import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { fakeUser } from '~/mocks/handlers';
import { useSearchUsersAdmin, useSearchUsersForType } from '~/services/queries/users';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useSearchUsersForType', () => {
  it('is disabled with no query and does not fetch', () => {
    const { result } = renderHook(() => useSearchUsersForType(10), { wrapper: createWrapper() });

    expect(result.current.query.fetchStatus).toBe('idle');
    expect(result.current.users).toBeUndefined();
  });

  it('resolves the mocked user list once a query is provided', async () => {
    const { result } = renderHook(() => useSearchUsersForType(10, 'fake'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    expect(result.current.users).toEqual([fakeUser]);
  });

  it('sends the query param and gets an empty list back when nothing matches', async () => {
    const { result } = renderHook(() => useSearchUsersForType(10, 'no-such-user'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    expect(result.current.users).toEqual([]);
  });
});

describe('useSearchUsersAdmin', () => {
  it('resolves the mocked user list once a query is provided', async () => {
    const { result } = renderHook(() => useSearchUsersAdmin('fake'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    expect(result.current.users).toEqual([fakeUser]);
  });

  it('sends the query param and gets an empty list back when nothing matches', async () => {
    const { result } = renderHook(() => useSearchUsersAdmin('no-such-user'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    expect(result.current.users).toEqual([]);
  });
});
