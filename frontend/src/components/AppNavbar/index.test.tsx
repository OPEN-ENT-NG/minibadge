import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AppNavbar } from '.';

function Layout({ isAdmin, isStatisticsView }: { isAdmin: boolean; isStatisticsView: boolean }) {
  return (
    <>
      <AppNavbar isAdmin={isAdmin} isStatisticsView={isStatisticsView} />
      <Outlet />
    </>
  );
}

function renderNavbar(isAdmin: boolean, isStatisticsView = false, initialEntry = '/') {
  const router = createMemoryRouter(
    [
      {
        path: '/*',
        element: <Layout isAdmin={isAdmin} isStatisticsView={isStatisticsView} />,
        children: [
          { index: true, element: <div>Reçus</div> },
          { path: 'badge-types', element: <div>Collection</div> },
          { path: 'badge-types/:typeId', element: <div>Détail</div> },
          { path: 'badges-given', element: <div>Donnés</div> },
          { path: 'admin', element: <div>Admin</div> },
          { path: 'statistics', element: <div>Statistiques</div> },
          { path: '*', element: <div>Introuvable</div> },
        ],
      },
    ],
    { initialEntries: [initialEntry] },
  );
  return render(<RouterProvider router={router} />);
}

describe('AppNavbar', () => {
  it('has an accessible name, distinguishing it from Layout\'s own two labeled nav landmarks', () => {
    renderNavbar(false);

    expect(screen.getByRole('navigation', { name: 'Minibadge' })).toBeInTheDocument();
  });

  it('always shows the 3 base tabs', () => {
    renderNavbar(false);

    expect(screen.getByRole('tab', { name: 'minibadge.navbar.badges.received' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'minibadge.navbar.badges.library' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'minibadge.navbar.badges.given' })).toBeInTheDocument();
  });

  it('hides the Administration tab when isAdmin is false', () => {
    renderNavbar(false);

    expect(screen.queryByRole('tab', { name: 'minibadge.navbar.badges.admin' })).not.toBeInTheDocument();
  });

  it('shows the Administration tab when isAdmin is true', () => {
    renderNavbar(true);

    expect(screen.getByRole('tab', { name: 'minibadge.navbar.badges.admin' })).toBeInTheDocument();
  });

  it('hides the Statistiques tab when isStatisticsView is false', () => {
    renderNavbar(false, false);

    expect(screen.queryByRole('tab', { name: 'minibadge.navbar.badges.statistics' })).not.toBeInTheDocument();
  });

  it('shows only the Statistiques tab when only isStatisticsView is true (independent of isAdmin)', () => {
    renderNavbar(false, true);

    expect(screen.getByRole('tab', { name: 'minibadge.navbar.badges.statistics' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'minibadge.navbar.badges.admin' })).not.toBeInTheDocument();
  });

  it('shows only the Administration tab when only isAdmin is true (independent of isStatisticsView)', () => {
    renderNavbar(true, false);

    expect(screen.getByRole('tab', { name: 'minibadge.navbar.badges.admin' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'minibadge.navbar.badges.statistics' })).not.toBeInTheDocument();
  });

  it('shows both Administration and Statistiques tabs when both rights are true', () => {
    renderNavbar(true, true);

    expect(screen.getByRole('tab', { name: 'minibadge.navbar.badges.admin' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'minibadge.navbar.badges.statistics' })).toBeInTheDocument();
  });

  it('marks the tab matching the current route as selected', () => {
    renderNavbar(false);

    expect(screen.getByRole('tab', { name: 'minibadge.navbar.badges.received' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'minibadge.navbar.badges.library' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('marks the tab matching a non-index current route as selected (key={activeId} remount syncs it)', () => {
    renderNavbar(true, false, '/admin');

    expect(screen.getByRole('tab', { name: 'minibadge.navbar.badges.admin' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'minibadge.navbar.badges.received' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  /**
   * Regression test for a real bug found by manual reproduction (see the
   * component's own doc comment): `useTabs`' effect fires `onChange` on
   * every `Tabs` mount, not just on a real click — including the
   * `key={activeId}`-forced remount this component does on every route
   * change. Without the `item.id === activeId` guard, mounting on a
   * sub-path of a tab (here `/badge-types/:typeId`, matched to `library`)
   * silently fired `navigate('/badge-types')`, bouncing the user off the
   * detail page back to the listing immediately after landing on it.
   */
  it('does not navigate away from a sub-path of the matched tab on mount (no spurious redirect)', async () => {
    renderNavbar(false, false, '/badge-types/42');

    expect(await screen.findByText('Détail')).toBeInTheDocument();
    expect(screen.queryByText('Collection')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'minibadge.navbar.badges.library' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  /** Same bug, for a route that matches no tab at all (its `activeId`
   * fallback, "my-badges", must not be treated as a real selection). */
  it('does not navigate away from an unmatched route on mount', async () => {
    renderNavbar(false, false, '/this-route-does-not-exist');

    expect(await screen.findByText('Introuvable')).toBeInTheDocument();
    expect(screen.queryByText('Reçus')).not.toBeInTheDocument();
  });

  it('clicking a tab navigates to the corresponding route', async () => {
    const user = userEvent.setup();
    renderNavbar(true);

    await user.click(screen.getByRole('tab', { name: 'minibadge.navbar.badges.given' }));
    expect(await screen.findByText('Donnés')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'minibadge.navbar.badges.admin' }));
    expect(await screen.findByText('Admin')).toBeInTheDocument();
  });
});
