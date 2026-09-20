import { odeServices } from '@edifice.io/client';
import { MockedProvider } from '@edifice.io/react';
import { QueryClient } from '@tanstack/react-query';
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
 * Smoke test for the app shell (no features yet): mounts the real router
 * inside `@edifice.io/react`'s `MockedProvider` (which substitutes a fake
 * theme context for `EdificeThemeProvider` — the real one manipulates a
 * `<link id="favicon">` element that doesn't exist in the jsdom test
 * document), and checks that the root route and the 404 route both
 * render.
 */
function renderApp(initialPath: string) {
  window.history.pushState({}, '', initialPath);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <MockedProvider>
      <RouterProvider router={router(queryClient)} />
    </MockedProvider>,
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
