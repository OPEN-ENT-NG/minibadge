import { odeServices } from '@edifice.io/client';
import { EdificeClientProvider, EdificeThemeContext } from '@edifice.io/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { router } from '~/routes';

/**
 * REVIEW FIX (typescript-reviewer, HIGH): `@edifice.io/client`'s
 * `CacheService` (used internally by `useUser()` -> `getUser()` ->
 * `GET /auth/oauth2/userinfo`) is a module-level singleton cache keyed by
 * URL with no expiry — it survives across every `it()` in this file
 * regardless of the fresh `QueryClient` per test. This suite doesn't
 * currently override that endpoint via `server.use(...)`, but
 * `routes/root/CharterGate/index.test.tsx` already had to add this exact
 * `beforeEach` to keep such overrides from silently no-oping once an earlier
 * test populated the cache — mirrored here for consistency and to prevent
 * latent flakiness as this suite grows.
 */
beforeEach(() => odeServices.cache().clearCache());

/**
 * Smoke test for the app shell: mounts the real router inside the real
 * `EdificeClientProvider` (so `useUser()`'s `authorizedActions` come from
 * this app's own MSW handlers, e.g. `~/mocks/handlers`), with a fake theme
 * context standing in for `EdificeThemeProvider` — the real one manipulates
 * a `<link id="favicon">` element that doesn't exist in the jsdom test
 * document. `@edifice.io/react`'s own `MockedProvider` can't be used here:
 * since `@edifice.io/react@2.6`, it injects a static mock user with empty
 * `authorizedActions` instead of exercising `EdificeClientProvider`, which
 * would make every workflow-rights check in this app resolve to `false`
 * regardless of the MSW fixtures (mirrors the pattern already used by
 * `routes/root/CharterGate/index.test.tsx`).
 */
function renderApp(initialPath: string) {
  window.history.pushState({}, '', initialPath);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <EdificeClientProvider params={{ app: 'minibadge' }}>
        <EdificeThemeContext.Provider value={{ theme: undefined }}>
          <RouterProvider router={router(queryClient)} />
        </EdificeThemeContext.Provider>
      </EdificeClientProvider>
    </QueryClientProvider>,
  );
}

describe('App router', () => {
  it('renders the root route without throwing', async () => {
    renderApp('/');

    // The index route now renders the real "my-badges" screen (Phase 2) —
    // this replaces the Foundations-lot placeholder text, a documented,
    // expected change (see `phase-2-mes-badges-recus.plan.md`'s Task 6),
    // not a regression. The default MSW fixtures (`~/mocks/handlers`)
    // represent a fully-entitled, already-accepted, non-revoked user, so
    // `CharterGate` lets the screen through directly (no lightbox) and its
    // search box is the first visible, stable marker of that screen.
    expect(
      await screen.findByRole('searchbox', { name: 'minibadge.badge.search' }),
    ).toBeInTheDocument();
  });

  it('renders the NotFound page on an unknown path', async () => {
    renderApp('/this-route-does-not-exist');

    expect(await screen.findByText('Page non trouvée')).toBeInTheDocument();
  });
});
