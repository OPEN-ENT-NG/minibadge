import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { fakeStatistics } from '~/mocks/handlers';
import { useStatistics, useSynchronizeStatistics } from '~/services/queries/statistics';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useStatistics', () => {
  it('resolves the mocked statistics', async () => {
    const { result } = renderHook(() => useStatistics(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    expect(result.current.statistics).toEqual(fakeStatistics);
  });
});

describe('useSynchronizeStatistics', () => {
  it('resolves the synchronize message', async () => {
    const { result } = renderHook(() => useSynchronizeStatistics(), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      message: 'minibadge.statistics.synchronize.unnecessary',
    });
  });
});
