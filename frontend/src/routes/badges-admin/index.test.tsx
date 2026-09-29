import { EdificeClientProvider, EdificeThemeContext } from '@edifice.io/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, delay, http } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { fakeBadgeAssigned, fakeBadgeAssignedAllSecond } from '~/mocks/handlers';
import { server } from '~/mocks/server';
import { MinibadgeAccessContext } from '~/routes/root/CharterGate/context';

import { BadgesAdmin } from '.';

/**
 * `EdificeClientProvider` is required since this screen now mounts `CreateBadgeTypeModal`, which
 * reads the admin's structures through `useEdificeClient` (that hook throws outside its provider).
 */
function renderScreen({ isAdmin = true }: { isAdmin?: boolean } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EdificeClientProvider params={{ app: 'minibadge' }}>
        <EdificeThemeContext.Provider value={{ theme: undefined }}>
          <MinibadgeAccessContext.Provider
            value={{ canAssign: false, canReceive: false, isAdmin, isStatisticsView: false, isStatisticsViewAllStructures: false }}
          >
            <MemoryRouter initialEntries={['/admin']}>
              <Routes>
                <Route path="/" element={<div>Accueil</div>} />
                <Route path="/admin" element={<BadgesAdmin />} />
              </Routes>
            </MemoryRouter>
          </MinibadgeAccessContext.Provider>
        </EdificeThemeContext.Provider>
      </EdificeClientProvider>
    </QueryClientProvider>,
  );
}

/**
 * Both `/assigned/all` fixtures sit in January 2024 (see `~/mocks/handlers`),
 * outside the screen's default "today minus 1 month" period.
 */
function widenPeriodToCoverFixtures() {
  const [startInput, endInput] = document.querySelectorAll('input[type="date"]');
  fireEvent.change(startInput, { target: { value: '2024-01-01' } });
  fireEvent.change(endInput, { target: { value: '2024-02-01' } });
}

describe('BadgesAdmin', () => {
  it('redirects to / when the user has no admin right (direct URL access, not just a hidden nav item)', async () => {
    renderScreen({ isAdmin: false });

    expect(await screen.findByText('Accueil')).toBeInTheDocument();
  });

  it('renders the admin table for an admin user', async () => {
    renderScreen({ isAdmin: true });
    widenPeriodToCoverFixtures();

    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row');
    // 1 header row + 2 data rows.
    expect(rows).toHaveLength(3);
  });

  it('shows an empty state when the period excludes every assigned badge', async () => {
    renderScreen();

    expect(await screen.findByText('minibadge.badge.empty.statement')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'minibadge.no.result' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows the assignor, owner, label and date columns', async () => {
    renderScreen();
    widenPeriodToCoverFixtures();

    const table = await screen.findByRole('table');
    expect(screen.getByRole('columnheader', { name: 'minibadge.given.array.label' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'minibadge.badges.assigned.by' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'minibadge.given.array.owner' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'minibadge.given.array.date' })).toBeInTheDocument();

    const rows = within(table).getAllByRole('row');
    expect(rows[1]).toHaveTextContent(fakeBadgeAssignedAllSecond.assignorDisplayName as string);
    expect(rows[2]).toHaveTextContent(fakeBadgeAssigned.assignorDisplayName as string);
  });

  it('does not render an <img> for a badge type with no pictureId', async () => {
    server.use(
      http.get('/minibadge/assigned/all', () =>
        HttpResponse.json({
          all: [
            {
              ...fakeBadgeAssigned,
              badge: {
                ...fakeBadgeAssigned.badge,
                badgeType: { ...fakeBadgeAssigned.badge.badgeType, pictureId: undefined },
              },
            },
          ],
        }),
      ),
    );

    renderScreen();

    await screen.findByRole('table');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows an inline error message when fetching the admin list fails', async () => {
    server.use(http.get('/minibadge/assigned/all', () => new HttpResponse(null, { status: 500 })));
    renderScreen();

    expect(await screen.findByText('minibadge.error.get.badges')).toBeInTheDocument();
  });

  it('sends assignor_display_name as sortBy when the "Décerné par" column is clicked, and re-sorts the rows', async () => {
    const user = userEvent.setup();
    let lastSortBy: string | null = null;
    let lastSortAsc: string | null = null;
    server.use(
      http.get('/minibadge/assigned/all', ({ request }) => {
        const url = new URL(request.url);
        lastSortBy = url.searchParams.get('sortBy');
        lastSortAsc = url.searchParams.get('sortAsc');
        const items = [fakeBadgeAssignedAllSecond, fakeBadgeAssigned];
        const sorted =
          lastSortBy === 'assignor_display_name'
            ? [...items].sort((a, b) => {
                const direction = lastSortAsc === 'false' ? -1 : 1;
                return (a.assignorDisplayName ?? '').localeCompare(b.assignorDisplayName ?? '') * direction;
              })
            : items;
        return HttpResponse.json({ all: sorted });
      }),
    );

    renderScreen();
    widenPeriodToCoverFixtures();
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', { name: 'minibadge.badges.assigned.by' }));

    await waitFor(() => expect(lastSortBy).toBe('assignor_display_name'));
    expect(lastSortAsc).toBe('true');

    await waitFor(() => {
      const rows = within(screen.getByRole('table')).getAllByRole('row');
      expect(rows[1]).toHaveTextContent(fakeBadgeAssigned.assignorDisplayName as string);
      expect(rows[2]).toHaveTextContent(fakeBadgeAssignedAllSecond.assignorDisplayName as string);
    });
  });

  it('sends receiver_display_name as sortBy when the "Destinataire" column is clicked', async () => {
    const user = userEvent.setup();
    let lastSortBy: string | null = null;
    server.use(
      http.get('/minibadge/assigned/all', ({ request }) => {
        const url = new URL(request.url);
        lastSortBy = url.searchParams.get('sortBy');
        return HttpResponse.json({ all: [fakeBadgeAssigned, fakeBadgeAssignedAllSecond] });
      }),
    );

    renderScreen();
    widenPeriodToCoverFixtures();
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', { name: 'minibadge.given.array.owner' }));

    await waitFor(() => expect(lastSortBy).toBe('receiver_display_name'));
  });

  it('opens the RevokeUsersModal from the "Révoquer des utilisateurs" button', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: 'minibadge.revoke.users.modal.title' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('opens the CreateBadgeTypeModal from the "Créer un badge" button', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: 'minibadge.badge.type.create' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('minibadge.badge.type.create.modal.title')).toBeInTheDocument();
    expect(await screen.findByRole('radiogroup', { name: 'minibadge.badge.type.create.picto' })).toBeInTheDocument();
  });

  it('keeps both admin actions hidden from a non-admin (the whole screen redirects)', async () => {
    renderScreen({ isAdmin: false });

    expect(await screen.findByText('Accueil')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'minibadge.badge.type.create' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'minibadge.revoke.users.modal.title' })).not.toBeInTheDocument();
  });

  it('shows a loading indicator during the initial fetch instead of the empty-state message', async () => {
    server.use(
      http.get('/minibadge/assigned/all', async () => {
        await delay(50);
        return HttpResponse.json({ all: [] });
      }),
    );
    renderScreen();

    // Period picker + search box + "Révoquer" button (persistent shell) stay
    // visible during load.
    expect(screen.getByRole('button', { name: 'minibadge.revoke.users.modal.title' })).toBeInTheDocument();
    expect(screen.getByAltText('loading')).toBeInTheDocument();
    expect(screen.queryByText('minibadge.badge.empty.statement')).not.toBeInTheDocument();

    await waitFor(() => expect(screen.queryByAltText('loading')).not.toBeInTheDocument());
    expect(screen.getByText('minibadge.badge.empty.statement')).toBeInTheDocument();
  });

  describe('validity (Epic C)', () => {
    it('keeps expired assignments in the history, flagged in the status column', async () => {
      server.use(
        http.get('/minibadge/assigned/all', () =>
          HttpResponse.json({
            all: [
              { ...fakeBadgeAssigned, expiresAt: '2024-01-03T00:00:00.000', isExpired: true },
              { ...fakeBadgeAssignedAllSecond, isExpired: false },
            ],
          }),
        ),
      );
      renderScreen();

      expect(await screen.findByRole('columnheader', { name: 'minibadge.badge.status' })).toBeInTheDocument();
      const expiredRow = screen.getByText(fakeBadgeAssigned.badge.badgeType.label).closest('tr') as HTMLElement;
      const activeRow = screen.getByText(fakeBadgeAssignedAllSecond.badge.badgeType.label).closest('tr') as HTMLElement;
      expect(within(expiredRow).getByText('minibadge.badge.expired')).toBeInTheDocument();
      expect(within(activeRow).getByText('minibadge.badge.active')).toBeInTheDocument();
      expect(within(activeRow).queryByText('minibadge.badge.expired')).not.toBeInTheDocument();
    });

    it('opens the EditBadgeValidityModal from the "Modifier la date de fin" button', async () => {
      const user = userEvent.setup();
      renderScreen();

      await user.click(screen.getByRole('button', { name: 'minibadge.badge.type.validity.edit' }));

      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByText('minibadge.badge.type.validity.modal.title')).toBeInTheDocument();
    });
  });
});
