import { odeServices } from '@edifice.io/client';
import { EdificeClientProvider, EdificeThemeContext } from '@edifice.io/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { server } from '~/mocks/server';

import { Root } from '.';

// See `CharterGate/index.test.tsx` for why this is needed: `@edifice.io/client`'s
// `CacheService` behind `useUser()` is a module-level singleton with no expiry.
beforeEach(() => odeServices.cache().clearCache());

function renderRoot() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <Root />,
        children: [
          { index: true, element: <div>Enfant</div> },
          { path: 'admin', element: <div>Administration</div> },
        ],
      },
    ],
    { initialEntries: ['/'] },
  );
  return render(
    <QueryClientProvider client={queryClient}>
      <EdificeClientProvider params={{ app: 'minibadge' }}>
        <EdificeThemeContext.Provider value={{ theme: undefined }}>
          <RouterProvider router={router} />
        </EdificeThemeContext.Provider>
      </EdificeClientProvider>
    </QueryClientProvider>,
  );
}

/**
 * Fix 2: mirrors the original AngularJS app's always-present settings/gear
 * button (`view-src/minibadge.html:26-29`, `ng-if="vm.isAllowedToUseMinibadge"`,
 * `ng-click="vm.openChartLightbox()"`) — the only way to reopen the charter
 * consent lightbox once dismissed/accepted, since `CharterGate` alone has no
 * such escape hatch (`isChartLightboxOpen` is permanently `false` once
 * `readChart` is set).
 */
describe('Root — reopen charter button', () => {
  it('shows the reopen-charter button when the user has assign/receive rights (default fixture)', async () => {
    renderRoot();

    expect(await screen.findByText('Enfant')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'minibadge.settings' })).toBeInTheDocument();
  });

  it('hides the reopen-charter button when the user has no minibadge workflow right at all', async () => {
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
    );
    renderRoot();

    expect(await screen.findByText('Enfant')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'minibadge.settings' })).not.toBeInTheDocument();
  });

  it('clicking the reopen-charter button reopens the lightbox even though the chart was already accepted', async () => {
    const user = userEvent.setup();
    renderRoot();

    await screen.findByText('Enfant');
    await user.click(screen.getByRole('button', { name: 'minibadge.settings' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('minibadge.chart.welcome')).toBeInTheDocument();
    expect(screen.queryByText('Enfant')).not.toBeInTheDocument();
  });
});

/**
 * INTEGRATION COVERAGE (react-reviewer, MEDIUM): each seam of the `isAdmin`
 * wiring (`useMinibadgeAccess`'s `isAdmin`, `AppNavbar`'s `isAdmin` prop,
 * `badges-admin`'s context consumption) already has its own isolated test,
 * but nothing mounted the real `Root` → `CharterGate` → context → screen
 * stack end-to-end. These two cases mount the actual stack with a real
 * admin-workflow-right fixture (mirroring the "reopen charter button"
 * `server.use(.../auth/oauth2/userinfo...)` override style above) to confirm
 * the "Administration" nav item genuinely appears — and is navigable — for
 * an admin session, and stays hidden otherwise.
 */
describe('Root — isAdmin wiring end-to-end', () => {
  it('shows and allows navigating to the Administration nav link for a user with the admin workflow right', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/auth/oauth2/userinfo', () =>
        HttpResponse.json({
          username: 'fake.admin',
          login: 'fake.admin',
          firstName: 'Fake',
          lastName: 'Admin',
          userId: 'a1b2c3d4',
          type: 'Personnel',
          structures: ['d4c3b2a1'],
          structureNames: ['Fake School'],
          functions: {},
          authorizedActions: [
            { name: 'fr.openent.minibadge.controller.FakeRight|assign', displayName: 'assign', type: 'WORKFLOW' },
            { name: 'fr.openent.minibadge.controller.FakeRight|receive', displayName: 'receive', type: 'WORKFLOW' },
            { name: 'fr.openent.minibadge.controller.FakeRight|admin', displayName: 'admin', type: 'WORKFLOW' },
          ],
          apps: [],
        }),
      ),
    );
    renderRoot();
    await screen.findByText('Enfant');

    const adminLink = screen.getByRole('link', { name: 'minibadge.navbar.badges.admin' });
    expect(adminLink).toBeInTheDocument();

    await user.click(adminLink);

    expect(await screen.findByText('Administration')).toBeInTheDocument();
  });

  it('hides the Administration nav link for a user without the admin workflow right', async () => {
    renderRoot();

    await screen.findByText('Enfant');

    expect(screen.queryByRole('link', { name: 'minibadge.navbar.badges.admin' })).not.toBeInTheDocument();
  });
});
