import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { useConfig, useGlobalSettings } from '~/services/queries/config';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useConfig', () => {
  it('resolves the mocked (snake_case) config', async () => {
    const { result } = renderHook(() => useConfig(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    expect(result.current.config).toMatchObject({
      default_max_assignable: 3,
      type_lists_users_size: 10,
    });
  });
});

describe('useGlobalSettings', () => {
  it('resolves the mocked global settings', async () => {
    const { result } = renderHook(() => useGlobalSettings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    expect(result.current.globalSettings).toMatchObject({
      pageSize: 10,
    });
    expect(result.current.globalSettings?.thresholdSettings).toHaveLength(1);
  });
});
