import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { server } from '~/mocks/server';
import { getCharterRevokedStatus } from '~/services/api/charter';
import { ApiError } from '~/services/api/http';
import {
  MINIBADGE_WORKFLOW_RIGHTS,
  useAcceptCharter,
  useCharterRevokedStatus,
  useMinibadgeAccess,
  useRefuseCharter,
  useRevokeCharter,
  useUserChart,
  useValidateCharter,
  useViewChart,
} from '~/services/queries/charter';

/**
 * `useMinibadgeAccess` reads the connected user via `@edifice.io/react`'s
 * `useUser()`, normally populated by `EdificeClientProvider` at bootstrap.
 * Mocking it here keeps these tests focused on the gate *computation*
 * (workflow rights + chart combination) — the full provider tree (real
 * `useUser()`, real `Modal`) is exercised by
 * `routes/root/CharterGate/index.test.tsx`.
 */
let mockUser: { authorizedActions: { name: string }[] } | undefined = {
  authorizedActions: [{ name: MINIBADGE_WORKFLOW_RIGHTS.assign }, { name: MINIBADGE_WORKFLOW_RIGHTS.receive }],
};
vi.mock('@edifice.io/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@edifice.io/react')>();
  return {
    ...actual,
    useUser: () => ({ user: mockUser, avatar: '', userDescription: undefined }),
  };
});

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

describe('useCharterRevokedStatus', () => {
  it('resolves the mocked revoked status', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCharterRevokedStatus(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    expect(result.current.revokedStatus).toEqual({ revoked: false });
  });
});

describe('useAcceptCharter / useRefuseCharter / useRevokeCharter', () => {
  it('accepts the charter and invalidates the charter query', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useAcceptCharter(), { wrapper: Wrapper });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['charter'] });
  });

  it('refuses the charter and invalidates the charter query', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRefuseCharter(), { wrapper: Wrapper });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['charter'] });
  });

  it('revokes users from the charter (admin) and invalidates the charter query', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRevokeCharter(), { wrapper: Wrapper });

    result.current.mutate(['a1b2c3d4']);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['charter'] });
  });
});

describe('useUserChart', () => {
  it('resolves the mocked (already-accepted) chart preference', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUserChart(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    expect(result.current.chart).toMatchObject({
      acceptChart: expect.any(String),
      acceptReceive: expect.any(String),
    });
  });

  it('defaults to an empty chart when the preference was never saved', async () => {
    server.use(
      http.get('/userbook/preference/minibadge.chart', () => HttpResponse.json({ preference: null })),
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUserChart(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    expect(result.current.chart).toEqual({});
  });
});

describe('useMinibadgeAccess', () => {
  it('grants canAssign/canReceive when both the workflow right and the chart acceptance are present', async () => {
    mockUser = {
      authorizedActions: [{ name: MINIBADGE_WORKFLOW_RIGHTS.assign }, { name: MINIBADGE_WORKFLOW_RIGHTS.receive }],
    };
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useMinibadgeAccess(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAllowedToUseMinibadge).toBe(true);
    expect(result.current.canAssign).toBe(true);
    expect(result.current.canReceive).toBe(true);
    expect(result.current.isChartLightboxOpen).toBe(false);
    expect(result.current.isRevoked).toBe(false);
    // No `admin` right in `authorizedActions` above.
    expect(result.current.isAdmin).toBe(false);
  });

  it('denies canReceive when the user has no receive workflow right, even if the chart was accepted', async () => {
    mockUser = { authorizedActions: [] };
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useMinibadgeAccess(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAllowedToUseMinibadge).toBe(false);
    expect(result.current.canReceive).toBe(false);
    // No workflow right at all => not "allowed to use minibadge" => the
    // lightbox must not open even though the chart isn't read/accepted.
    expect(result.current.isChartLightboxOpen).toBe(false);
  });

  it('exposes isAdmin from the admin workflow right, independently of assign/receive/chart state', async () => {
    mockUser = { authorizedActions: [{ name: MINIBADGE_WORKFLOW_RIGHTS.admin }] };
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useMinibadgeAccess(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAdmin).toBe(true);
    // The admin right alone doesn't grant assign/receive access.
    expect(result.current.isAllowedToUseMinibadge).toBe(false);
  });

  /**
   * `statisticsView`/`statisticsViewAllStructures` are two INDEPENDENT
   * rights — neither is derived from the other. Each case below grants
   * exactly one of the two (never both, never neither) to prove there is no
   * artificial dependency coded between them.
   */
  it('exposes isStatisticsView from its own workflow right, with isStatisticsViewAllStructures false when absent', async () => {
    mockUser = { authorizedActions: [{ name: MINIBADGE_WORKFLOW_RIGHTS.statisticsView }] };
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useMinibadgeAccess(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isStatisticsView).toBe(true);
    expect(result.current.isStatisticsViewAllStructures).toBe(false);
  });

  it('exposes isStatisticsViewAllStructures from its own workflow right, with isStatisticsView false when absent', async () => {
    mockUser = { authorizedActions: [{ name: MINIBADGE_WORKFLOW_RIGHTS.statisticsViewAllStructures }] };
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useMinibadgeAccess(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isStatisticsViewAllStructures).toBe(true);
    expect(result.current.isStatisticsView).toBe(false);
  });

  it('grants both statistics rights when both are present', async () => {
    mockUser = {
      authorizedActions: [
        { name: MINIBADGE_WORKFLOW_RIGHTS.statisticsView },
        { name: MINIBADGE_WORKFLOW_RIGHTS.statisticsViewAllStructures },
      ],
    };
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useMinibadgeAccess(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isStatisticsView).toBe(true);
    expect(result.current.isStatisticsViewAllStructures).toBe(true);
  });

  it('denies both statistics rights when neither is present', async () => {
    mockUser = { authorizedActions: [] };
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useMinibadgeAccess(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isStatisticsView).toBe(false);
    expect(result.current.isStatisticsViewAllStructures).toBe(false);
  });

  it('opens the chart lightbox when allowed to use minibadge but the chart was never read/accepted', async () => {
    mockUser = { authorizedActions: [{ name: MINIBADGE_WORKFLOW_RIGHTS.receive }] };
    server.use(http.get('/userbook/preference/minibadge.chart', () => HttpResponse.json({ preference: '{}' })));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useMinibadgeAccess(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAllowedToUseMinibadge).toBe(true);
    expect(result.current.canReceive).toBe(false);
    expect(result.current.isChartLightboxOpen).toBe(true);
  });

  it('reports isRevoked from the admin revocation status', async () => {
    mockUser = { authorizedActions: [{ name: MINIBADGE_WORKFLOW_RIGHTS.receive }] };
    server.use(http.get('/minibadge/revoked', () => HttpResponse.json({ revoked: true, revokedAt: '2024-01-01' })));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useMinibadgeAccess(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isRevoked).toBe(true);
  });
});

describe('useViewChart', () => {
  it('saves readChart when it was not already set, and invalidates the charter query', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useViewChart(), { wrapper: Wrapper });

    result.current.mutate({});

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['charter'] });
  });

  it('does nothing when readChart is already set', async () => {
    let putCalled = false;
    server.use(
      http.put('/userbook/preference/minibadge.chart', () => {
        putCalled = true;
        return HttpResponse.json({});
      }),
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useViewChart(), { wrapper: Wrapper });

    result.current.mutate({ readChart: '2024-01-01T00:00:00.000Z' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(putCalled).toBe(false);
  });
});

describe('useValidateCharter', () => {
  it('accepting the charter + minibadge from scratch saves the chart and calls PUT /accept', async () => {
    let acceptCalled = false;
    server.use(
      http.put('/minibadge/accept', () => {
        acceptCalled = true;
        return HttpResponse.json({});
      }),
    );
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useValidateCharter(), { wrapper: Wrapper });

    result.current.mutate({
      chart: {},
      isChartAccepted: true,
      isMinibadgeAccepted: true,
      hasAssignWorkflow: false,
      hasReceiveWorkflow: true,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(acceptCalled).toBe(true);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['charter'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['badges'] });
  });

  it('refusing a previously-accepted receive charter calls PUT /refuse', async () => {
    let refuseCalled = false;
    server.use(
      http.put('/minibadge/refuse', () => {
        refuseCalled = true;
        return HttpResponse.json({});
      }),
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useValidateCharter(), { wrapper: Wrapper });

    result.current.mutate({
      chart: { acceptChart: '2024-01-01T00:00:00.000Z', acceptReceive: '2024-01-01T00:00:00.000Z' },
      isChartAccepted: false,
      isMinibadgeAccepted: false,
      hasAssignWorkflow: false,
      hasReceiveWorkflow: true,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(refuseCalled).toBe(true);
  });

  it('an assign-only acceptance never calls /accept or /refuse (mirrors the real asymmetry)', async () => {
    let acceptCalled = false;
    let refuseCalled = false;
    server.use(
      http.put('/minibadge/accept', () => {
        acceptCalled = true;
        return HttpResponse.json({});
      }),
      http.put('/minibadge/refuse', () => {
        refuseCalled = true;
        return HttpResponse.json({});
      }),
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useValidateCharter(), { wrapper: Wrapper });

    result.current.mutate({
      chart: {},
      isChartAccepted: true,
      isMinibadgeAccepted: true,
      hasAssignWorkflow: true,
      hasReceiveWorkflow: false,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(acceptCalled).toBe(false);
    expect(refuseCalled).toBe(false);
  });

  describe('saveUserChart surfaces failures even right after an unrelated successful request', () => {
    it('surfaces an ApiError when the chart preference PUT actually fails, even right after an unrelated successful request', async () => {
      server.use(
        http.put('/userbook/preference/minibadge.chart', () => new HttpResponse(null, { status: 500 })),
      );

      // Forces `odeServices.http().latestResponse` to be a stale SUCCESS
      // immediately before the failing PUT below, proving `saveUserChart`
      // reads the failing PUT's own response rather than this leftover one.
      await getCharterRevokedStatus();

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useValidateCharter(), { wrapper: Wrapper });

      result.current.mutate({
        chart: {},
        isChartAccepted: true,
        isMinibadgeAccepted: true,
        hasAssignWorkflow: false,
        hasReceiveWorkflow: true,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(ApiError);
      expect((result.current.error as ApiError).code).toBe('error');
    });
  });
});
