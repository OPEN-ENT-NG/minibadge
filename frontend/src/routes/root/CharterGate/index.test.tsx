import { odeServices } from '@edifice.io/client';
import { EdificeClientProvider, EdificeThemeContext } from '@edifice.io/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { server } from '~/mocks/server';

import { CharterGate } from '.';

/**
 * `@edifice.io/client`'s `CacheService` (used internally by
 * `getUser()`/`GET /auth/oauth2/userinfo`) is a module-level singleton cache
 * keyed by URL with no expiry — it survives across every `it()` in this
 * file regardless of the fresh `QueryClient` per test, so a `server.use()`
 * override of `/auth/oauth2/userinfo` in one test would otherwise silently
 * do nothing once an earlier test has already populated the cache. Clearing
 * it before each test keeps these tests independent of run order.
 */
beforeEach(() => odeServices.cache().clearCache());

/**
 * Exercises the real provider tree (real `useUser()`/`useSession()`, real
 * `Modal`) rather than mocking `@edifice.io/react` as
 * `services/queries/charter.test.tsx` does for the pure gate computation —
 * see the comment there. A fresh `QueryClient` per test avoids the shared
 * module-level cache in `@edifice.io/react`'s `MockedProvider` (which would
 * otherwise leak charter/session data between these `server.use(...)`
 * overrides).
 */
function renderGate(
  children: ReactNode = <div>Contenu protégé</div>,
  props: Partial<Omit<Parameters<typeof CharterGate>[0], 'children'>> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <EdificeClientProvider params={{ app: 'minibadge' }}>
        {/* `useUser()` internally requires `useEdificeTheme()`, provided by
            `EdificeThemeProvider` in the real app — mocked here the same way
            `@edifice.io/react`'s own `MockedProvider` does, since the real
            provider manipulates a `<link id="favicon">` that doesn't exist
            in the jsdom test document. */}
        <EdificeThemeContext.Provider value={{ theme: undefined }}>
          <CharterGate {...props}>{children}</CharterGate>
        </EdificeThemeContext.Provider>
      </EdificeClientProvider>
    </QueryClientProvider>,
  );
  // Exposed so tests can directly manipulate query data (e.g. simulating a
  // background refetch flipping `revoked` to `true`) without needing a real
  // mutation to trigger the invalidation.
  return { ...utils, queryClient };
}

describe('CharterGate', () => {
  it('shows a loading screen while the gate data is still resolving', () => {
    renderGate();

    expect(screen.getByAltText('loading')).toBeInTheDocument();
    expect(screen.queryByText('Contenu protégé')).not.toBeInTheDocument();
  });

  it('renders children directly once accepted, allowed, and not revoked (default fixture)', async () => {
    renderGate();

    expect(await screen.findByText('Contenu protégé')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the chart lightbox and hides children when allowed but the chart was never read/accepted', async () => {
    server.use(
      http.get('/userbook/preference/minibadge.chart', () => HttpResponse.json({ preference: '{}' })),
    );

    renderGate();

    expect(await screen.findByRole('dialog', { name: 'minibadge.chart.title' })).toBeInTheDocument();
    expect(screen.getByText('minibadge.chart.welcome')).toBeInTheDocument();
    expect(screen.queryByText('Contenu protégé')).not.toBeInTheDocument();
  });

  it('shows the revoked notice and hides children when the user is revoked (chart already accepted)', async () => {
    server.use(
      http.get('/minibadge/revoked', () => HttpResponse.json({ revoked: true, revokedAt: '2024-01-01' })),
    );

    renderGate();

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('minibadge.revoke.modal.title')).toBeInTheDocument();
    expect(screen.queryByText('Contenu protégé')).not.toBeInTheDocument();
  });

  it('dismissing the revoked notice hides it and reveals children again (local dismiss only, no request)', async () => {
    server.use(
      http.get('/minibadge/revoked', () => HttpResponse.json({ revoked: true, revokedAt: '2024-01-01' })),
    );
    const user = userEvent.setup();
    renderGate();

    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: 'minibadge.revoke.modal.button' }));

    // `Modal` plays a `react-spring` exit transition before unmounting, so
    // the dialog doesn't disappear synchronously on click.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Contenu protégé')).toBeInTheDocument();
  });

  it('does not open the chart lightbox when the user has no minibadge workflow right at all', async () => {
    server.use(
      http.get('/auth/oauth2/userinfo', () =>
        HttpResponse.json({
          username: 'fake.user',
          login: 'fake.user',
          firstName: 'Fake',
          lastName: 'User',
          userId: 'a1b2c3d4',
          type: 'Personnel',
          structures: ['d4c3b2a1'],
          structureNames: ['Fake School'],
          functions: {},
          authorizedActions: [],
          apps: [],
        }),
      ),
      http.get('/userbook/preference/minibadge.chart', () => HttpResponse.json({ preference: '{}' })),
    );

    renderGate();

    expect(await screen.findByText('Contenu protégé')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('disables the submit button only for the invalid combo (minibadge accepted without the chart)', async () => {
    server.use(
      http.get('/userbook/preference/minibadge.chart', () => HttpResponse.json({ preference: '{}' })),
    );
    const user = userEvent.setup();
    renderGate();

    await screen.findByRole('dialog');
    const validateButton = () => screen.getByRole('button', { name: 'minibadge.validate' });

    // Both unchecked ("refuse everything") is a valid, submittable state.
    expect(validateButton()).toBeEnabled();

    // Checking "receive" alone does NOT auto-check "chart" (they're not
    // symmetrically linked — only unchecking cascades) => the invalid combo
    // (minibadge accepted, chart not) must disable the button.
    await user.click(screen.getByRole('checkbox', { name: 'minibadge.chart.receive.accept' }));
    expect(screen.getByRole('checkbox', { name: 'minibadge.chart.accept' })).not.toBeChecked();
    expect(validateButton()).toBeDisabled();

    // Unchecking "chart" while "receive" is checked force-unchecks "receive" too.
    await user.click(screen.getByRole('checkbox', { name: 'minibadge.chart.accept' }));
    expect(screen.getByRole('checkbox', { name: 'minibadge.chart.receive.accept' })).toBeChecked();
    await user.click(screen.getByRole('checkbox', { name: 'minibadge.chart.accept' }));
    expect(screen.getByRole('checkbox', { name: 'minibadge.chart.receive.accept' })).not.toBeChecked();
  });

  it('validating the chart+minibadge acceptance saves it and dismisses the lightbox, revealing children', async () => {
    // Stateful preference double: the real ENT Core preference endpoint
    // persists what was PUT and returns it on the next GET — the shared
    // static fixture in `~/mocks/handlers` can't express that, so this test
    // needs its own tiny in-memory store to observe the query invalidation
    // actually picking up the saved acceptance.
    let savedChart: string | null = null;
    server.use(
      http.get('/userbook/preference/minibadge.chart', () =>
        HttpResponse.json({ preference: savedChart ?? '{}' }),
      ),
      http.put('/userbook/preference/minibadge.chart', async ({ request }) => {
        savedChart = JSON.stringify(await request.json());
        return HttpResponse.json({});
      }),
    );
    const user = userEvent.setup();
    renderGate();

    await screen.findByRole('dialog');

    await user.click(screen.getByRole('checkbox', { name: 'minibadge.chart.accept' }));
    await user.click(screen.getByRole('checkbox', { name: 'minibadge.chart.receive.accept' }));
    const validateButton = screen.getByRole('button', { name: 'minibadge.validate' });
    expect(validateButton).toBeEnabled();
    await user.click(validateButton);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Contenu protégé')).toBeInTheDocument();
  });

  describe('Escape key (Fix 1 regression: Modal fires onModalClose on every Escape, even when not isOpen)', () => {
    it('pressing Escape while the chart lightbox is not open does not save/mark the chart as read', async () => {
      // Default fixture: chart already fully accepted+read, not revoked =>
      // neither modal is open, children render directly.
      let putCalled = false;
      server.use(
        http.put('/userbook/preference/minibadge.chart', () => {
          putCalled = true;
          return HttpResponse.json({});
        }),
      );
      const user = userEvent.setup();
      renderGate();

      expect(await screen.findByText('Contenu protégé')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      await user.keyboard('{Escape}');

      // Give any (wrongly) fired mutation a chance to reach MSW before
      // asserting its absence.
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(putCalled).toBe(false);
      expect(screen.getByText('Contenu protégé')).toBeInTheDocument();
    });

    it('pressing Escape while the revoked notice is not shown does not pre-emptively dismiss it', async () => {
      // Starts NOT revoked (neither modal open), then simulate the admin
      // revocation status flipping to `true` via a later refetch — mirrors
      // `useCharterRevokedStatus`'s query key being invalidated elsewhere.
      // Pre-fix, the earlier Escape press would already have set
      // `isRevokedNoticeDismissed` to `true`, so the notice would never
      // appear even once `revoked` becomes true.
      const user = userEvent.setup();
      const { queryClient } = renderGate();

      expect(await screen.findByText('Contenu protégé')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      await user.keyboard('{Escape}');

      queryClient.setQueryData(['charter', 'revoked'], { revoked: true, revokedAt: '2024-01-01' });

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('minibadge.revoke.modal.title')).toBeInTheDocument();
    });
  });

  describe('reopening the chart lightbox (Fix 2: isChartForcedOpen)', () => {
    it('reopens the lightbox even though the chart was already fully accepted, and clears via onChartForcedClose', async () => {
      // Default fixture: already accepted => `isChartLightboxOpen` is
      // `false` on its own; only `isChartForcedOpen` should bring it back.
      const user = userEvent.setup();
      const handleForcedClose = vi.fn();
      renderGate(<div>Contenu protégé</div>, {
        isChartForcedOpen: true,
        onChartForcedClose: handleForcedClose,
      });

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('minibadge.chart.welcome')).toBeInTheDocument();
      expect(screen.queryByText('Contenu protégé')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'minibadge.validate' }));

      await waitFor(() => expect(handleForcedClose).toHaveBeenCalled());
    });
  });

  describe('charter validation failure (Fix 3: error feedback)', () => {
    it('shows an inline error message when saving the chart preference fails', async () => {
      server.use(
        http.get('/userbook/preference/minibadge.chart', () => HttpResponse.json({ preference: '{}' })),
        http.put('/userbook/preference/minibadge.chart', () => new HttpResponse(null, { status: 500 })),
      );
      const user = userEvent.setup();
      renderGate();

      await screen.findByRole('dialog');
      await user.click(screen.getByRole('checkbox', { name: 'minibadge.chart.accept' }));
      await user.click(screen.getByRole('button', { name: 'minibadge.validate' }));

      expect(await screen.findByText('minibadge.error.chart.validate')).toBeInTheDocument();
      // The lightbox must stay open — a failed save is not a dismissal.
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
