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

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EdificeClientProvider params={{ app: 'minibadge' }}>
        <EdificeThemeContext.Provider value={{ theme: undefined }}>
          <MinibadgeAccessContext.Provider
            value={{ canAssign: true, canReceive: true, isAdmin: false, isStatisticsView: false, isStatisticsViewAllStructures: false }}
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
  it('renders the search box, the category filter dropdown, and the badge type grid', async () => {
    const user = userEvent.setup();
    renderScreen();

    expect(screen.getByRole('searchbox', { name: 'minibadge.badge.search' })).toBeInTheDocument();

    const filterTrigger = screen.getByRole('button', { name: 'minibadge.filter.by.category' });
    await user.click(filterTrigger);
    expect(await screen.findByRole('menuitemradio', { name: fakeBadgeCategory.name })).toBeInTheDocument();

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

  it('toggles a category filter from the filter dropdown, and deselects it on a second click', async () => {
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

    const filterTrigger = screen.getByRole('button', { name: /minibadge\.filter\.by\.category/ });
    await user.click(filterTrigger);
    const categoryItem = await screen.findByRole('menuitemradio', { name: fakeBadgeCategory.name });
    await user.click(categoryItem);

    await waitFor(() => expect(lastCategoryId).toBe(String(fakeBadgeCategory.id)));
    expect(filterTrigger).toHaveTextContent('1');

    // The dropdown stays open after selecting a radio item (`DropdownRadioItem`
    // never calls `closeDropdown`) — reclick the same, now-checked item
    // directly rather than the trigger (which would just close the menu).
    await user.click(await screen.findByRole('menuitemradio', { name: fakeBadgeCategory.name, checked: true }));

    await waitFor(() => expect(lastCategoryId).toBeNull());
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
    expect(screen.getByRole('heading', { name: 'minibadge.no.result' })).toBeInTheDocument();
  });

  /**
   * Task 4 (frontend-ui-polish plan): `EmptyBadgeList`'s `title` prop was
   * never passed at any of its 3 call sites, so every empty state showed
   * only a text line, with no title. Dedicated regression test (on top of
   * the assertion folded into the test above) pinning down that the
   * `minibadge.no.result` title is a real, visible `heading` — not just
   * text somewhere in the DOM — for this specific screen.
   */
  it('shows the generic "no result" title as a heading in the empty state (Task 4)', async () => {
    server.use(
      http.get('/minibadge/types', ({ request }) => {
        const url = new URL(request.url);
        const offset = Number(url.searchParams.get('offset'));
        return HttpResponse.json({ all: [], limit: 10, offset });
      }),
    );
    renderScreen();

    const title = await screen.findByRole('heading', { name: 'minibadge.no.result' });
    expect(title).toBeInTheDocument();
  });
});
