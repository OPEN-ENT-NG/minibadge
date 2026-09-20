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

function renderNavbar(isAdmin: boolean, isStatisticsView = false) {
  const router = createMemoryRouter(
    [
      {
        path: '/*',
        element: <Layout isAdmin={isAdmin} isStatisticsView={isStatisticsView} />,
        children: [
          { index: true, element: <div>Reçus</div> },
          { path: 'badge-types', element: <div>Collection</div> },
          { path: 'badges-given', element: <div>Donnés</div> },
          { path: 'admin', element: <div>Admin</div> },
          { path: 'statistics', element: <div>Statistiques</div> },
        ],
      },
    ],
    { initialEntries: ['/'] },
  );
  return render(<RouterProvider router={router} />);
}

describe('AppNavbar', () => {
  it('has an accessible name, distinguishing it from Layout\'s own two labeled nav landmarks', () => {
    renderNavbar(false);

    expect(screen.getByRole('navigation', { name: 'Minibadge' })).toBeInTheDocument();
  });

  it('always shows the 3 base links', () => {
    renderNavbar(false);

    expect(screen.getByRole('link', { name: 'minibadge.navbar.badges.received' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'minibadge.navbar.badges.library' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'minibadge.navbar.badges.given' })).toBeInTheDocument();
  });

  it('hides the Administration link when isAdmin is false', () => {
    renderNavbar(false);

    expect(
      screen.queryByRole('link', { name: 'minibadge.navbar.badges.admin' }),
    ).not.toBeInTheDocument();
  });

  it('shows the Administration link when isAdmin is true', () => {
    renderNavbar(true);

    expect(screen.getByRole('link', { name: 'minibadge.navbar.badges.admin' })).toBeInTheDocument();
  });

  it('hides the Statistiques link when isStatisticsView is false', () => {
    renderNavbar(false, false);

    expect(
      screen.queryByRole('link', { name: 'minibadge.navbar.badges.statistics' }),
    ).not.toBeInTheDocument();
  });

  it('shows only the Statistiques link when only isStatisticsView is true (independent of isAdmin)', () => {
    renderNavbar(false, true);

    expect(screen.getByRole('link', { name: 'minibadge.navbar.badges.statistics' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'minibadge.navbar.badges.admin' })).not.toBeInTheDocument();
  });

  it('shows only the Administration link when only isAdmin is true (independent of isStatisticsView)', () => {
    renderNavbar(true, false);

    expect(screen.getByRole('link', { name: 'minibadge.navbar.badges.admin' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'minibadge.navbar.badges.statistics' })).not.toBeInTheDocument();
  });

  it('shows both Administration and Statistiques links when both rights are true', () => {
    renderNavbar(true, true);

    expect(screen.getByRole('link', { name: 'minibadge.navbar.badges.admin' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'minibadge.navbar.badges.statistics' })).toBeInTheDocument();
  });

  it('marks the current route link as active (react-router NavLink)', () => {
    renderNavbar(false);

    expect(screen.getByRole('link', { name: 'minibadge.navbar.badges.received' })).toHaveClass('active');
    expect(screen.getByRole('link', { name: 'minibadge.navbar.badges.library' })).not.toHaveClass('active');
  });

  it('clicking a link navigates to the corresponding route', async () => {
    const user = userEvent.setup();
    renderNavbar(true);

    await user.click(screen.getByRole('link', { name: 'minibadge.navbar.badges.given' }));
    expect(await screen.findByText('Donnés')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'minibadge.navbar.badges.admin' }));
    expect(await screen.findByText('Admin')).toBeInTheDocument();
  });
});
