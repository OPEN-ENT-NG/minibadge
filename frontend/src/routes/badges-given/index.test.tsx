import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, delay, http } from 'msw';
import { describe, expect, it } from 'vitest';

import { fakeBadgeAssigned, fakeBadgeAssignedRevoked } from '~/mocks/handlers';
import { server } from '~/mocks/server';

import { BadgesGiven } from '.';

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BadgesGiven />
    </QueryClientProvider>,
  );
}

/**
 * Both fixtures' `createdAt` sit in January 2024 (see `~/mocks/handlers`),
 * while the screen's default period is "today minus 1 month" — so a test
 * needs to widen the period before either fixture can appear, exactly as a
 * real user narrowing/widening the date range would.
 */
function widenPeriodToCoverFixtures() {
  const [startInput, endInput] = document.querySelectorAll('input[type="date"]');
  fireEvent.change(startInput, { target: { value: '2024-01-01' } });
  fireEvent.change(endInput, { target: { value: '2024-02-01' } });
}

const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;

describe('BadgesGiven', () => {
  it('defaults the period to one month ago through today (badges-given.controller.ts:44-45)', () => {
    renderScreen();

    const today = new Date();
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const [startInput, endInput] = document.querySelectorAll('input[type="date"]');
    expect((startInput as HTMLInputElement).value).toBe(toIsoDate(oneMonthAgo));
    expect((endInput as HTMLInputElement).value).toBe(toIsoDate(today));
  });

  it('shows an empty state when the period excludes every given badge', async () => {
    renderScreen();

    expect(await screen.findByText('minibadge.badge.empty.statement')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'minibadge.no.result' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows both given badges once the period covers them, unsorted rows in the order the backend returns', async () => {
    renderScreen();
    widenPeriodToCoverFixtures();

    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row');
    // 1 header row + 2 data rows.
    expect(rows).toHaveLength(3);

    // Mock deliberately returns the unsorted list in "wrong" (non-ascending)
    // order — see `~/mocks/handlers` — so the sort test below can prove a
    // click genuinely reorders rows rather than coinciding with an
    // already-sorted fixture list.
    expect(rows[1]).toHaveTextContent('Zèle');
    expect(rows[1]).toHaveTextContent('Zoe Receiver');
    expect(rows[1]).toHaveTextContent('minibadge.revoked');
    expect(rows[2]).toHaveTextContent('Entraide');
    expect(rows[2]).toHaveTextContent('Fake User');
    expect(within(rows[2] as HTMLElement).getByRole('button', { name: 'minibadge.revoke' })).toBeInTheDocument();
  });

  it('filters the list via the search box, sent to the backend as `query`', async () => {
    const user = userEvent.setup();
    renderScreen();
    widenPeriodToCoverFixtures();

    await screen.findByRole('table');

    const input = screen.getByRole('searchbox', { name: 'minibadge.badge.given.search' });
    await user.type(input, 'no-such-assignor');

    // `UserSearchBar` debounces 300ms before calling `onSearch`.
    await waitFor(() => expect(screen.queryByRole('table')).not.toBeInTheDocument());
    expect(await screen.findByText('minibadge.badge.empty.statement')).toBeInTheDocument();
  });

  /**
   * `sortBy` must be the raw SQL column name this endpoint accepts
   * (`display_name`, not `receiver_display_name` — see `SORT_COLUMNS`'s own
   * doc comment). Asserting on row order too, not just the captured param,
   * means a wrong column name that this mock's exact-match comparison
   * silently ignores still gets caught.
   */
  it('sends the raw SQL column name as sortBy (not a translated i18n key) and re-sorts the rows', async () => {
    const user = userEvent.setup();
    let lastSortBy: string | null = null;
    let lastSortAsc: string | null = null;
    server.use(
      http.get('/minibadge/assigned/given', ({ request }) => {
        const url = new URL(request.url);
        lastSortBy = url.searchParams.get('sortBy');
        lastSortAsc = url.searchParams.get('sortAsc');
        const items = [fakeBadgeAssignedRevoked, fakeBadgeAssigned];
        const sorted =
          lastSortBy === 'display_name'
            ? [...items].sort((a, b) => {
                const direction = lastSortAsc === 'false' ? -1 : 1;
                return (
                  (a.badge.owner?.displayName ?? '').localeCompare(b.badge.owner?.displayName ?? '') *
                  direction
                );
              })
            : items;
        return HttpResponse.json({ all: sorted });
      }),
    );

    renderScreen();
    widenPeriodToCoverFixtures();
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', { name: 'minibadge.given.array.owner' }));

    await waitFor(() => expect(lastSortBy).toBe('display_name'));
    expect(lastSortAsc).toBe('true');

    await waitFor(() => {
      const rows = within(screen.getByRole('table')).getAllByRole('row');
      expect(rows[1]).toHaveTextContent('Fake User');
      expect(rows[2]).toHaveTextContent('Zoe Receiver');
    });
    expect(screen.getByRole('columnheader', { name: 'minibadge.given.array.owner' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });

  it('re-clicking the same column flips sortAsc to false (badge-given-array.ts:70-79)', async () => {
    const user = userEvent.setup();
    const sortAscValues: (string | null)[] = [];
    server.use(
      http.get('/minibadge/assigned/given', ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('sortBy')) {
          sortAscValues.push(url.searchParams.get('sortAsc'));
        }
        return HttpResponse.json({ all: [fakeBadgeAssignedRevoked, fakeBadgeAssigned] });
      }),
    );

    renderScreen();
    widenPeriodToCoverFixtures();
    await screen.findByRole('table');

    // Re-queried fresh before each click rather than cached: `useBadgesGiven`
    // has no `placeholderData`, so `badgesGiven` (and therefore the whole
    // `<Table>`) genuinely unmounts/remounts on every sort change while the
    // new query is in flight. A cached element reference would go stale
    // across that.
    await user.click(screen.getByRole('button', { name: 'minibadge.given.array.owner' }));
    await waitFor(() => expect(sortAscValues).toEqual(['true']));
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', { name: 'minibadge.given.array.owner' }));
    await waitFor(() => expect(sortAscValues).toEqual(['true', 'false']));
  });

  it('revokes a given badge through the reused RevokeModal, then refetches the list (no optimistic update)', async () => {
    const user = userEvent.setup();
    let revoked = false;
    let revokedBadgeId: number | null = null;
    server.use(
      http.get('/minibadge/assigned/given', () =>
        HttpResponse.json({
          all: [revoked ? { ...fakeBadgeAssigned, revokedAt: '2024-02-01 00:00:00.000' } : fakeBadgeAssigned],
        }),
      ),
      http.put('/minibadge/revoked/given/:badgeId', ({ params }) => {
        revokedBadgeId = Number(params.badgeId);
        revoked = true;
        return new HttpResponse(null, { status: 200 });
      }),
    );

    renderScreen();

    const trashButton = await screen.findByRole('button', { name: 'minibadge.revoke' });
    await user.click(trashButton);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('minibadge.given.lightbox.title')).toBeInTheDocument();

    await user.click(within(dialog).getByText('minibadge.given.lightbox.confirm'));

    await waitFor(() => expect(revokedBadgeId).toBe(fakeBadgeAssigned.id));
    expect(await screen.findByText('minibadge.revoked')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'minibadge.revoke' })).not.toBeInTheDocument();
  });

  it('cancelling the revoke modal calls no mutation', async () => {
    const user = userEvent.setup();
    let putCalled = false;
    server.use(
      http.get('/minibadge/assigned/given', () => HttpResponse.json({ all: [fakeBadgeAssigned] })),
      http.put('/minibadge/revoked/given/:badgeId', () => {
        putCalled = true;
        return new HttpResponse(null, { status: 200 });
      }),
    );

    renderScreen();

    const trashButton = await screen.findByRole('button', { name: 'minibadge.revoke' });
    await user.click(trashButton);

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByText('minibadge.cancel'));

    // `Modal` plays its own close transition (`useTransition`, see
    // `RevokeModal`'s doc comment) rather than unmounting synchronously.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(putCalled).toBe(false);
  });

  it('does not render an <img> for a badge type with no pictureId (avoids a literal "undefined" src)', async () => {
    server.use(
      http.get('/minibadge/assigned/given', () =>
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

  it('shows an inline error message when fetching the given list fails', async () => {
    server.use(http.get('/minibadge/assigned/given', () => new HttpResponse(null, { status: 500 })));
    renderScreen();

    expect(await screen.findByText('minibadge.error.get.badges')).toBeInTheDocument();
  });

  it('shows a loading indicator during the initial fetch instead of the empty-state message', async () => {
    server.use(
      http.get('/minibadge/assigned/given', async () => {
        await delay(50);
        return HttpResponse.json({ all: [] });
      }),
    );
    renderScreen();

    // Period picker + search box (persistent shell) stay visible during load.
    expect(screen.getByRole('searchbox', { name: 'minibadge.badge.given.search' })).toBeInTheDocument();
    expect(screen.getByAltText('loading')).toBeInTheDocument();
    expect(screen.queryByText('minibadge.badge.empty.statement')).not.toBeInTheDocument();

    await waitFor(() => expect(screen.queryByAltText('loading')).not.toBeInTheDocument());
    expect(screen.getByText('minibadge.badge.empty.statement')).toBeInTheDocument();
  });
});
