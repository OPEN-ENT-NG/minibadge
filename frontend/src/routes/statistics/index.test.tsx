import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, delay, http } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import {
  fakeStatistics,
  fakeStatisticsFiltered,
  fakeStatisticsManyMostAssigned,
  fakeStatisticsMultipleLessAssigned,
  fakeStatisticsNoTypes,
  fakeUser,
} from '~/mocks/handlers';
import { server } from '~/mocks/server';
import { MinibadgeAccessContext, MinibadgeAccessContextValue } from '~/routes/root/CharterGate/context';
import { toIsoDate } from '~/utils/date';

import { Statistics } from '.';

/**
 * NOTE ON i18n IN THIS TEST FILE: the test environment's i18next instance
 * never loads real translations (the `/i18n`/`/minibadge/i18n` MSW handlers
 * in `~/mocks/handlers` just return `{ status: 200 }`, no strings), so
 * `t(key)` always resolves to the literal key — exactly the convention every
 * other `*.test.tsx` in this port already relies on (e.g.
 * `routes/badges-admin/index.test.tsx` asserting
 * `screen.getByText('minibadge.error.get.badges')`). Consequently
 * `formatMessage(t, key, params)` also renders the bare key here: `t(key)`
 * has no literal `{0}` for it to substitute (that placeholder only exists in
 * the REAL French string, which isn't loaded). These tests assert on the
 * bare keys (proving the right key was picked, mirroring the rest of the
 * suite) and on real, translation-independent fixture data (labels, display
 * names, structural presence/absence) to prove the numbers/params actually
 * reached the right place. `formatMessage`'s own substitution logic is unit
 * tested in isolation in `utils/translate.test.ts`.
 */
function renderScreen(overrides: Partial<MinibadgeAccessContextValue> = {}) {
  const contextValue: MinibadgeAccessContextValue = {
    canAssign: false,
    canReceive: false,
    isAdmin: false,
    isStatisticsView: true,
    isStatisticsViewAllStructures: true,
    ...overrides,
  };
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MinibadgeAccessContext.Provider value={contextValue}>
        <MemoryRouter initialEntries={['/statistics']}>
          <Routes>
            <Route path="/" element={<div>Accueil</div>} />
            <Route path="/statistics" element={<Statistics />} />
          </Routes>
        </MemoryRouter>
      </MinibadgeAccessContext.Provider>
    </QueryClientProvider>,
  );
}

describe('Statistics', () => {
  it('redirects to / when the user has no statisticsView right (direct URL access, not just a hidden nav item)', async () => {
    renderScreen({ isStatisticsView: false });

    expect(await screen.findByText('Accueil')).toBeInTheDocument();
  });

  it('loads with no minDate query param by default (period = "all")', async () => {
    let lastMinDate: string | null | undefined;
    server.use(
      http.get('/minibadge/statistics', ({ request }) => {
        lastMinDate = new URL(request.url).searchParams.get('minDate');
        return HttpResponse.json(fakeStatistics);
      }),
    );

    renderScreen();

    await screen.findByTestId('segmented-option-all');
    await waitFor(() => expect(lastMinDate).toBeDefined());
    expect(lastMinDate).toBeNull();
  });

  it('sends a minDate 30 days ago and re-fetches when the "30 derniers jours" period is selected', async () => {
    const user = userEvent.setup();
    let lastMinDate: string | null | undefined;
    server.use(
      http.get('/minibadge/statistics', ({ request }) => {
        const url = new URL(request.url);
        lastMinDate = url.searchParams.get('minDate');
        return HttpResponse.json(lastMinDate ? fakeStatisticsFiltered : fakeStatistics);
      }),
    );

    renderScreen();
    // Default fixture has type data => the "Par type" panel (with its own
    // segmented control) is present.
    await screen.findByTestId('segmented-option-badges');

    // Clicking the visible option label, not the (visually hidden,
    // `pointer-events: none`) underlying radio input `SegmentedControl`
    // renders per option — a real user clicks the label; a synthetic
    // pointer event on the input itself is rejected by jsdom/user-event.
    await user.click(screen.getByTestId('segmented-option-30days'));

    // `fakeStatisticsFiltered` has EMPTY type arrays => the panel disappears
    // once the new response lands — proves the data genuinely swapped, not
    // just that some response came back.
    await waitFor(() =>
      expect(screen.queryByTestId('segmented-option-badges')).not.toBeInTheDocument(),
    );

    expect(lastMinDate).not.toBeNull();
    const expected = new Date();
    expected.setDate(expected.getDate() - 30);
    expect(lastMinDate).toBe(toIsoDate(expected));
  });

  it('sends a minDate 7 days ago when the "7 derniers jours" period is selected', async () => {
    const user = userEvent.setup();
    let lastMinDate: string | null | undefined;
    server.use(
      http.get('/minibadge/statistics', ({ request }) => {
        lastMinDate = new URL(request.url).searchParams.get('minDate');
        return HttpResponse.json(fakeStatisticsFiltered);
      }),
    );

    renderScreen();
    await screen.findByTestId('segmented-option-all');

    await user.click(screen.getByTestId('segmented-option-7days'));

    await waitFor(() => expect(lastMinDate).not.toBeNull());
    const expected = new Date();
    expected.setDate(expected.getDate() - 7);
    expect(lastMinDate).toBe(toIsoDate(expected));
  });

  it('shows the "Participation" counts (correct i18n keys picked, always rendered even with no filter data)', async () => {
    renderScreen();

    expect(await screen.findByText('minibadge.statistics.badges.assigned')).toBeInTheDocument();
    expect(screen.getByText('minibadge.active.users')).toBeInTheDocument();
  });

  it('shows the most-active-structures section only when isStatisticsViewAllStructures is granted', async () => {
    renderScreen({ isStatisticsViewAllStructures: true });

    expect(await screen.findByText('minibadge.statistics.most.active.structures')).toBeInTheDocument();
    expect(screen.getByText(/Fake School/)).toBeInTheDocument();
  });

  it('hides the most-active-structures section when isStatisticsViewAllStructures is false, even though isStatisticsView is true', async () => {
    renderScreen({ isStatisticsViewAllStructures: false });

    await screen.findByText('minibadge.statistics.badges.assigned');
    expect(screen.queryByText('minibadge.statistics.most.active.structures')).not.toBeInTheDocument();
  });

  it('hides the structure name column in the user grids when isStatisticsViewAllStructures is false', async () => {
    const user = userEvent.setup();
    renderScreen({ isStatisticsViewAllStructures: false });
    await screen.findByTestId('segmented-option-badges');

    await user.click(screen.getByTestId('segmented-option-users'));

    await screen.findByText('minibadge.statistics.top.assigning.users');
    expect(screen.queryByText(fakeUser.structureNames[0])).not.toBeInTheDocument();
  });

  it('shows the structure name column in the user grids when isStatisticsViewAllStructures is true', async () => {
    const user = userEvent.setup();
    renderScreen({ isStatisticsViewAllStructures: true });
    await screen.findByTestId('segmented-option-badges');

    await user.click(screen.getByTestId('segmented-option-users'));

    await screen.findByText('minibadge.statistics.top.assigning.users');
    expect(screen.getAllByText(fakeUser.structureNames[0]).length).toBeGreaterThan(0);
  });

  it('renders the "Par type" panel absent when both mostAssignedTypes and mostRefusedTypes are empty', async () => {
    server.use(http.get('/minibadge/statistics', () => HttpResponse.json(fakeStatisticsNoTypes)));

    renderScreen();

    await screen.findByText('minibadge.statistics.badges.assigned');
    expect(screen.queryByTestId('segmented-option-badges')).not.toBeInTheDocument();
    expect(screen.queryByText('minibadge.filter.stats.per.type')).not.toBeInTheDocument();
  });

  it('toggles between the "Badges" and "Utilisateurs" views purely locally, without a new network request', async () => {
    const user = userEvent.setup();
    let requestCount = 0;
    server.use(
      http.get('/minibadge/statistics', () => {
        requestCount += 1;
        return HttpResponse.json(fakeStatistics);
      }),
    );

    renderScreen();
    await screen.findByTestId('segmented-option-badges');
    expect(requestCount).toBe(1);

    await user.click(screen.getByTestId('segmented-option-users'));

    await screen.findByText('minibadge.statistics.top.assigning.users');
    expect(requestCount).toBe(1);

    await user.click(screen.getByTestId('segmented-option-badges'));
    await screen.findByText('minibadge.statistics.badges');
    expect(requestCount).toBe(1);
  });

  it('does not render the "less assigned" bar chart when lessAssignedTypes has exactly 1 element (GOTCHA), but still shows the card title', async () => {
    renderScreen();

    const title = await screen.findByText('minibadge.statistics.less.allowed.badges');
    const card = title.closest('section');
    expect(card).not.toBeNull();
    expect(card?.querySelector('.minibadge-chart-less-assigned')).toBeNull();
  });

  it('renders the "less assigned" bar chart when lessAssignedTypes has 2+ elements', async () => {
    server.use(
      http.get('/minibadge/statistics', () => HttpResponse.json(fakeStatisticsMultipleLessAssigned)),
    );

    renderScreen();

    const title = await screen.findByText('minibadge.statistics.less.allowed.badges');
    const card = title.closest('section');
    await waitFor(() => expect(card?.querySelector('.minibadge-chart-less-assigned')).not.toBeNull());
  });

  it('shows the top-assigning and top-receiving user grids with avatars in the "Utilisateurs" view', async () => {
    const user = userEvent.setup();
    const { container } = renderScreen();
    await screen.findByTestId('segmented-option-badges');

    await user.click(screen.getByTestId('segmented-option-users'));

    // `fakeUser` is both `topAssigningUsers[0]` and `topReceivingUsers[0]` in
    // the fixture, so "1. Fake User" legitimately appears in both grids.
    expect((await screen.findAllByText(`1. ${fakeUser.displayName}`)).length).toBe(2);
    // Avatars use `alt=""` (decorative — the name is already adjacent text),
    // which removes them from the accessibility tree (no "img" role), so
    // they're queried directly rather than via `getByRole('img')`.
    expect(container.querySelectorAll('img').length).toBeGreaterThan(0);
  });

  it('shows an inline error message when fetching statistics fails', async () => {
    server.use(http.get('/minibadge/statistics', () => new HttpResponse(null, { status: 500 })));

    renderScreen();

    expect(await screen.findByText('minibadge.error.get.statistics')).toBeInTheDocument();
  });

  it('renders the top-most-assigned-badges card without erroring when mostAssignedTypes has only 1 element (no slice(1,3) crash)', async () => {
    const onlyType = fakeStatistics.mostAssignedTypes![0];
    server.use(
      http.get('/minibadge/statistics', () =>
        HttpResponse.json({ ...fakeStatistics, mostAssignedTypes: [onlyType] }),
      ),
    );

    renderScreen();

    // Appears both in the top-most-assigned card and (as the sole category)
    // in the bar chart's SVG — `getAllByText` since both are legitimate.
    await waitFor(() => expect(screen.getAllByText(onlyType.label).length).toBeGreaterThan(0));
  });

  // The "most assigned" bar chart plots ALL of `mostAssignedTypes`, but the
  // visible compact cards only ever show the first 3 — anything ranked 4th+
  // would otherwise exist only as an unlabeled SVG bar, invisible to
  // screen-reader users. `fakeStatisticsManyMostAssigned` has 4 types, so
  // this proves the chart's visually-hidden textual fallback covers all 4,
  // not just the 3 the cards show.
  it('exposes a visually-hidden textual list of ALL most-assigned types next to the chart, not just the 3 shown as visible cards', async () => {
    server.use(
      http.get('/minibadge/statistics', () => HttpResponse.json(fakeStatisticsManyMostAssigned)),
    );

    const { container } = renderScreen();

    // NOTE: `'minibadge.statistics.most.allowed.badges'` is rendered by TWO
    // `StatisticsCard`s on this screen (the top-most-allowed compact card
    // AND the chart-holding card, both keyed off the same untranslated
    // literal in this test environment — see the file-level i18n note
    // above), so it's not a unique `findByText` target here; wait on the
    // chart's own class instead.
    await waitFor(() =>
      expect(container.querySelector('.minibadge-chart-most-assigned')).not.toBeNull(),
    );
    const chartWrapper = container.querySelector('.minibadge-chart-most-assigned');

    const hidden = chartWrapper!.querySelector('.visually-hidden');
    expect(hidden).not.toBeNull();
    fakeStatisticsManyMostAssigned.mostAssignedTypes!.forEach((type) => {
      expect(hidden).toHaveTextContent(type.label);
    });
  });

  // These are the screen's own section titles: `h2`, so `StatisticsCard`'s
  // nested `h3` labels form a correct, non-skipping h1 -> h2 -> h3 chain
  // under `Root`'s `<h1>Minibadge</h1>`.
  it('uses h2 for its own section titles (no h1 -> h3 skip)', async () => {
    renderScreen();

    await screen.findByText('minibadge.statistics.badges.assigned');
    expect(
      screen.getByRole('heading', { level: 2, name: 'minibadge.filter.stats.per.period' }),
    ).toBeInTheDocument();
    await screen.findByTestId('segmented-option-badges');
    expect(
      screen.getByRole('heading', { level: 2, name: 'minibadge.filter.stats.per.type' }),
    ).toBeInTheDocument();
  });

  /**
   * "Participation" used to be a `StatisticsCard`'s own small icon+label
   * heading, boxed inside the same card as the two figures — now a real,
   * standalone `h2` section title (same level as "Filtrer par
   * période"/"Filtrer par type") sitting OUTSIDE the two cards it now heads,
   * with "badges décernés" and "participants actifs" each in their own card.
   */
  it('shows "Participation" as its own h2 section title, outside any card, above the two separate figure cards', async () => {
    renderScreen();

    const heading = await screen.findByRole('heading', {
      level: 2,
      name: 'minibadge.statistics.participation',
    });
    // Not a `StatisticsCard`'s own heading (that component's `<section>`
    // always carries its `bg-white rounded-4 shadow-sm` card chrome) —
    // its own closest `<section>` is the page's outer section wrapper.
    expect(heading.closest('section')).not.toHaveClass('shadow-sm');

    const badgesCount = await screen.findByText('minibadge.statistics.badges.assigned');
    const activeUsers = screen.getByText('minibadge.active.users');
    expect(badgesCount.closest('section')).not.toBe(activeUsers.closest('section'));
  });

  /**
   * `SegmentedControl` (Ant Design) is labelled via `aria-labelledby`
   * pointing at the adjacent heading, same intent as the original hand-
   * rolled radiogroup (avoid a second, driftable copy of the same
   * translated string as a literal `aria-label`) — Ant's own component
   * still stamps a fixed, generic `aria-label="segmented control"` of its
   * own regardless, but per the accname spec `aria-labelledby` wins for the
   * accessible NAME either way, which is what actually matters and is what
   * `getByRole(..., { name })` below proves.
   */
  it('labels each segmented control via aria-labelledby pointing at its adjacent heading', async () => {
    renderScreen();

    const periodHeading = await screen.findByRole('heading', {
      level: 2,
      name: 'minibadge.filter.stats.per.period',
    });
    const periodGroup = screen.getByRole('radiogroup', { name: 'minibadge.filter.stats.per.period' });
    expect(periodGroup).toHaveAttribute('aria-labelledby', periodHeading.id);

    await screen.findByTestId('segmented-option-badges');
    const typeHeading = screen.getByRole('heading', { level: 2, name: 'minibadge.filter.stats.per.type' });
    const typeGroup = screen.getByRole('radiogroup', { name: 'minibadge.filter.stats.per.type' });
    expect(typeGroup).toHaveAttribute('aria-labelledby', typeHeading.id);
  });

  it('shows a loading indicator during the initial fetch instead of an empty dashboard (Constat #1)', async () => {
    server.use(
      http.get('/minibadge/statistics', async () => {
        await delay(50);
        return HttpResponse.json(fakeStatistics);
      }),
    );
    renderScreen();

    expect(screen.getByAltText('loading')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 2, name: 'minibadge.filter.stats.per.period' }),
    ).not.toBeInTheDocument();

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { level: 2, name: 'minibadge.filter.stats.per.period' }),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByAltText('loading')).not.toBeInTheDocument();
  });
});
