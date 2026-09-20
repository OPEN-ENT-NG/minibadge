import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { fakeBadgeCategory } from '~/mocks/handlers';
import { useBadgeCategories } from '~/services/queries/badgeCategories';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useBadgeCategories', () => {
  it('resolves the mocked category list (plain array, not wrapped in `all`)', async () => {
    const { result } = renderHook(() => useBadgeCategories(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    expect(result.current.categories).toEqual([fakeBadgeCategory]);
  });
});
