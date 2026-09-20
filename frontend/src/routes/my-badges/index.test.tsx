import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, delay, http } from 'msw';
import { describe, expect, it } from 'vitest';

import { fakeBadge, fakeBadgePrivatized, fakeBadgeRefused, fakeBadgeType } from '~/mocks/handlers';
import { server } from '~/mocks/server';
import { MinibadgeAccessContext } from '~/routes/root/CharterGate/context';

import { MyBadges } from '.';

function renderScreen({ canReceive = true }: { canReceive?: boolean } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MinibadgeAccessContext.Provider
        value={{ canAssign: false, canReceive, isAdmin: false, isStatisticsView: false, isStatisticsViewAllStructures: false }}
      >
        <MyBadges />
      </MinibadgeAccessContext.Provider>
    </QueryClientProvider>,
  );
}

const withAllStatuses = () =>
  server.use(
    http.get('/minibadge/badges', ({ request }) => {
      const url = new URL(request.url);
      const query = url.searchParams.get('query');
      const all =
        query && !fakeBadgeType.label.toLowerCase().includes(query.toLowerCase())
          ? []
          : [fakeBadge, fakeBadgePrivatized, fakeBadgeRefused];
      return HttpResponse.json({ all });
    }),
  );

describe('MyBadges', () => {
  it('renders nothing when the user has no receive right (mirrors getBadges() early return)', () => {
    const { container } = renderScreen({ canReceive: false });

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the search box and the 3 sections grouped by status', async () => {
    withAllStatuses();
    renderScreen();

    expect(await screen.findByRole('searchbox', { name: 'minibadge.badge.search' })).toBeInTheDocument();
    // The 3 sections are hidden (not unmounted) while `badgesQuery.isLoading`
    // — so, like the search box above, they must be awaited rather than
    // asserted synchronously.
    expect(await screen.findByRole('button', { name: /minibadge.badges.public/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /minibadge.badges.private/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /minibadge.badges.refuse/ })).toBeInTheDocument();

    // Public and private auto-open (non-empty from the start of the real
    // fetch — see BadgeSection's own tests for the exact transition logic);
    // refused starts closed (`defaultOpen={false}`, no active search).
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /minibadge.badges.public/ })).toHaveAttribute(
        'aria-expanded',
        'true',
      ),
    );
    expect(screen.getByRole('button', { name: /minibadge.badges.private/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: /minibadge.badges.refuse/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('filters the badge list via the search box (MSW proves the query param is sent)', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/minibadge/badges', ({ request }) => {
        const url = new URL(request.url);
        const query = url.searchParams.get('query');
        return HttpResponse.json({ all: query === 'nomatch' ? [] : [fakeBadge] });
      }),
    );
    renderScreen();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /minibadge.badges.public/ })).toHaveAttribute(
        'aria-expanded',
        'true',
      ),
    );

    const input = screen.getByRole('searchbox', { name: 'minibadge.badge.search' });
    await user.type(input, 'nomatch');

    // `UserSearchBar` debounces by 300ms before calling `onSearch` — `waitFor`'s
    // default polling window comfortably covers that plus the refetch.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /minibadge.badges.public/ })).toHaveAttribute(
        'aria-expanded',
        'false',
      ),
    );
  });

  it('clicking "Privatiser" on a public badge calls usePrivatizeBadge with its badgeTypeId', async () => {
    withAllStatuses();
    const user = userEvent.setup();
    let privatizedTypeId: number | undefined;
    server.use(
      http.put('/minibadge/types/:typeId/badge/privatize', ({ params }) => {
        privatizedTypeId = Number(params.typeId);
        return HttpResponse.json({});
      }),
    );
    renderScreen();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /minibadge.badges.public/ })).toHaveAttribute(
        'aria-expanded',
        'true',
      ),
    );

    const menuButtons = await screen.findAllByRole('button', { name: 'card.open.menu' });
    await user.click(menuButtons[0]);
    await user.click(screen.getByRole('menuitem', { name: 'minibadge.privatize' }));

    await waitFor(() => expect(privatizedTypeId).toBe(fakeBadge.badgeTypeId));
  });

  it('clicking "Accepter" on a refused badge calls usePublishBadge with its badgeTypeId', async () => {
    withAllStatuses();
    const user = userEvent.setup();
    let publishedTypeId: number | undefined;
    server.use(
      http.put('/minibadge/types/:typeId/badge/publish', ({ params }) => {
        publishedTypeId = Number(params.typeId);
        return HttpResponse.json({});
      }),
    );
    renderScreen();

    // The refused section starts closed — open it manually before reaching
    // into its actions menu.
    const refusedHeader = await screen.findByRole('button', { name: /minibadge.badges.refuse/ });
    await waitFor(() => expect(refusedHeader).not.toBeDisabled());
    await user.click(refusedHeader);

    // Public/private each also render their own menu button — the refused
    // card's is the last one now that its section is open.
    const menuButtons = await screen.findAllByRole('button', { name: 'card.open.menu' });
    await user.click(menuButtons[menuButtons.length - 1]);
    await user.click(screen.getByRole('menuitem', { name: 'minibadge.accept' }));

    await waitFor(() => expect(publishedTypeId).toBe(fakeBadgeRefused.badgeTypeId));
  });

  it('shows an inline error message when fetching badges fails (Fix 3: useBadges error surfaced)', async () => {
    server.use(http.get('/minibadge/badges', () => new HttpResponse(null, { status: 500 })));
    renderScreen();

    expect(await screen.findByText('minibadge.error.get.badges')).toBeInTheDocument();
  });

  it('shows a loading indicator during the initial fetch, then the sections once resolved (no empty-state flash)', async () => {
    server.use(
      http.get('/minibadge/badges', async () => {
        await delay(50);
        return HttpResponse.json({ all: [fakeBadge] });
      }),
    );
    renderScreen();

    // The search box (persistent shell) stays visible/usable during load.
    expect(screen.getByRole('searchbox', { name: 'minibadge.badge.search' })).toBeInTheDocument();
    expect(screen.getByAltText('loading')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /minibadge.badges.public/ })).not.toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /minibadge.badges.public/ })).toBeInTheDocument(),
    );
    expect(screen.queryByAltText('loading')).not.toBeInTheDocument();
  });
});
