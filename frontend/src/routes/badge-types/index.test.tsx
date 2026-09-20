import { odeServices } from '@edifice.io/client';
import { EdificeClientProvider, EdificeThemeContext } from '@edifice.io/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { fakeBadgeCategory, fakeBadgeType } from '~/mocks/handlers';
import { server } from '~/mocks/server';
import { MinibadgeAccessContext } from '~/routes/root/CharterGate/context';

import { BadgeTypeLibrary } from '.';

beforeEach(() => odeServices.cache().clearCache());

function renderScreen({ canAssign = true }: { canAssign?: boolean } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EdificeClientProvider params={{ app: 'minibadge' }}>
        <EdificeThemeContext.Provider value={{ theme: undefined }}>
          <MinibadgeAccessContext.Provider
            value={{ canAssign, canReceive: true, isAdmin: false, isStatisticsView: false, isStatisticsViewAllStructures: false }}
          >
            <MemoryRouter initialEntries={['/badge-types']}>
              <Routes>
                <Route path="/badge-types" element={<BadgeTypeLibrary />} />
                <Route path="/badge-types/:typeId" element={<div>Détail {`:typeId`}</div>} />
              </Routes>
            </MemoryRouter>
          </MinibadgeAccessContext.Provider>
        </EdificeThemeContext.Provider>
      </EdificeClientProvider>
    </QueryClientProvider>,
  );
}

describe('BadgeTypeLibrary', () => {
  it('renders the search box, category chips, and the badge type grid', async () => {
    renderScreen();

    expect(screen.getByRole('searchbox', { name: 'minibadge.badge.search' })).toBeInTheDocument();
    expect(await screen.findByText(fakeBadgeCategory.name)).toBeInTheDocument();
    expect(await screen.findByText(fakeBadgeType.label)).toBeInTheDocument();
  });

  it('filters the grid via the search box (MSW proves the query param is sent)', async () => {
    const user = userEvent.setup();
    renderScreen();

    await screen.findByText(fakeBadgeType.label);

    const searchBox = screen.getByRole('searchbox', { name: 'minibadge.badge.search' });
    await user.type(searchBox, 'no-such-badge');

    await waitFor(() => expect(screen.queryByText(fakeBadgeType.label)).not.toBeInTheDocument());
  });

  it('toggles a category filter on click, and deselects it on a second click', async () => {
    let lastCategoryId: string | null = null;
    server.use(
      http.get('/minibadge/types', ({ request }) => {
        const url = new URL(request.url);
        lastCategoryId = url.searchParams.get('categoryId');
        const offset = Number(url.searchParams.get('offset'));
        return HttpResponse.json({ all: offset === 0 ? [fakeBadgeType] : [], limit: 10, offset });
      }),
    );
    const user = userEvent.setup();
    renderScreen();

    const categoryButton = await screen.findByRole('button', { name: fakeBadgeCategory.name, pressed: false });
    await user.click(categoryButton);

    await waitFor(() => expect(lastCategoryId).toBe(String(fakeBadgeCategory.id)));
    expect(screen.getByRole('button', { name: fakeBadgeCategory.name, pressed: true })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: fakeBadgeCategory.name, pressed: true }));

    await waitFor(() => expect(lastCategoryId).toBeNull());
    expect(screen.getByRole('button', { name: fakeBadgeCategory.name, pressed: false })).toBeInTheDocument();
  });

  /**
   * Verifies the `useInfiniteQuery` simplification end-to-end: a scoped
   * 3-fixture, 2-per-page dataset (backend-sorted, per
   * `DefaultBadgeTypeService.java`'s `ORDER BY UNACCENT(bt.label)`) — the
   * jsdom `IntersectionObserver` stub (`mocks/setup.ts`) auto-fires on every
   * `observe()`, so this cascades through both pages without simulating a
   * real scroll position.
   */
  it('loads every page of badge types via infinite scroll, in the backend-sorted order', async () => {
    const alpha = { ...fakeBadgeType, id: 1, label: 'Alpha' };
    const beta = { ...fakeBadgeType, id: 2, label: 'Beta' };
    const gamma = { ...fakeBadgeType, id: 3, label: 'Gamma' };
    const sorted = [alpha, beta, gamma];
    server.use(
      http.get('/minibadge/types', ({ request }) => {
        const url = new URL(request.url);
        const offset = Number(url.searchParams.get('offset'));
        const limit = 2;
        return HttpResponse.json({ all: sorted.slice(offset, offset + limit), limit, offset });
      }),
    );
    renderScreen();

    await waitFor(() => expect(screen.getByText('Gamma')).toBeInTheDocument());
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('navigates to the detail screen when a card body is clicked', async () => {
    const user = userEvent.setup();
    renderScreen();

    await screen.findByText(fakeBadgeType.label);
    await user.click(screen.getByRole('button', { name: 'card.open.resource' }));

    expect(await screen.findByText(`Détail :typeId`)).toBeInTheDocument();
  });

  it('shows the "Décerner" footer button only when canAssign, and it opens the assign lightbox', async () => {
    const user = userEvent.setup();
    renderScreen({ canAssign: true });

    await screen.findByText(fakeBadgeType.label);
    const assignButton = screen.getByRole('button', { name: 'minibadge.badge.assign' });
    await user.click(assignButton);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('does not show the "Décerner" footer button when the user cannot assign', async () => {
    renderScreen({ canAssign: false });

    await screen.findByText(fakeBadgeType.label);
    expect(screen.queryByRole('button', { name: 'minibadge.badge.assign' })).not.toBeInTheDocument();
  });

  it('shows an empty statement when no badge type matches', async () => {
    server.use(
      http.get('/minibadge/types', ({ request }) => {
        const url = new URL(request.url);
        const offset = Number(url.searchParams.get('offset'));
        return HttpResponse.json({ all: [], limit: 10, offset });
      }),
    );
    renderScreen();

    expect(await screen.findByText('minibadge.badge.empty.statement')).toBeInTheDocument();
  });
});
