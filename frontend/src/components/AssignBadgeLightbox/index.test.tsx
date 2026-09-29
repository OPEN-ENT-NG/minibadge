import { odeServices } from '@edifice.io/client';
import { EdificeClientProvider, EdificeThemeContext } from '@edifice.io/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeBadgeType, fakeUser } from '~/mocks/handlers';
import { server } from '~/mocks/server';
import { BadgeType } from '~/models/badgeType';

import { AssignBadgeLightbox } from '.';

// See `CharterGate/index.test.tsx`: `@edifice.io/client`'s `CacheService` is a
// module-level singleton with no expiry, so it must be cleared between tests
// that override session-backed endpoints (`/auth/oauth2/userinfo`,
// `/userbook/api/person`).
beforeEach(() => {
  odeServices.cache().clearCache();
  toastSuccess.mockClear();
});

// Post-migration improvement plan, Constat #2 (confirmed gap #1): mocking
// `useToast` (same pattern already established in
// `~/services/queries/charter.test.tsx` for `useUser`) lets the success test
// below assert the toast is fired with the right message, without depending
// on any `<Toaster/>` actually being mounted in this component-only render
// tree (only `Layout`, mounted in `routes/root`, provides one at runtime).
const toastSuccess = vi.fn();
vi.mock('@edifice.io/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@edifice.io/react')>();
  return {
    ...actual,
    useToast: () => ({
      success: toastSuccess,
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      loading: vi.fn(),
      dismiss: vi.fn(),
      remove: vi.fn(),
    }),
  };
});

const secondUser = {
  ...fakeUser,
  id: 'z9y8x7w6',
  displayName: 'Zoe Second',
};

/**
 * A badge type whose only relation matches the default fixture user's
 * profile ('Personnel', per the default `/auth/oauth2/userinfo` +
 * `/userbook/api/person` handlers) as BOTH assignor and receiver — so
 * `isMatchingAnyRelation` is satisfied and tests can isolate the OTHER two
 * disable conditions (empty selection / thresholds outmoded).
 */
const matchingBadgeType: BadgeType = {
  ...fakeBadgeType,
  setting: {
    ...fakeBadgeType.setting,
    relations: [
      {
        assignorType: { type: 'profile', typeValue: 'Personnel' },
        receiverType: { type: 'profile', typeValue: 'Personnel' },
      },
    ],
  },
};

function renderLightbox(props: Partial<Parameters<typeof AssignBadgeLightbox>[0]> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onClose = vi.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <EdificeClientProvider params={{ app: 'minibadge' }}>
        <EdificeThemeContext.Provider value={{ theme: undefined }}>
          <AssignBadgeLightbox
            badgeType={matchingBadgeType}
            isOpen
            onClose={onClose}
            {...props}
          />
        </EdificeThemeContext.Provider>
      </EdificeClientProvider>
    </QueryClientProvider>,
  );
  return { ...utils, onClose, queryClient };
}

async function searchAndFind(user: ReturnType<typeof userEvent.setup>, query: string, name: string) {
  const searchBox = screen.getByRole('searchbox', { name: 'minibadge.search' });
  await user.type(searchBox, query);
  return screen.findByRole('button', { name });
}

describe('AssignBadgeLightbox', () => {
  it('disables "Décerner" when no user is selected yet', () => {
    renderLightbox();

    expect(screen.getByRole('button', { name: 'minibadge.badge.assign' })).toBeDisabled();
  });

  it('searching, selecting and removing a user works, and search excludes already-selected users', async () => {
    server.use(
      http.get('/minibadge/type/:typeId/users-search', () =>
        HttpResponse.json({ all: [fakeUser, secondUser] }),
      ),
    );
    const user = userEvent.setup();
    renderLightbox();

    const firstResult = await searchAndFind(user, 'e', fakeUser.displayName!);
    expect(screen.getByRole('button', { name: secondUser.displayName })).toBeInTheDocument();

    await user.click(firstResult);

    // Selected: appears in the "selected persons" list, the submit button is
    // now enabled (relation matches, threshold not outmoded), and the search
    // box was cleared (mirrors `onSelectUser`'s `this.searchQuery = ''`).
    expect(
      screen.getByRole('list', { name: 'minibadge.selected.persons' }).textContent,
    ).toContain(fakeUser.displayName);
    expect(screen.getByRole('button', { name: 'minibadge.badge.assign' })).not.toBeDisabled();
    expect(screen.getByRole('searchbox', { name: 'minibadge.search' })).toHaveValue('');

    // Search again: the already-selected user must be excluded from results.
    const searchBox = screen.getByRole('searchbox', { name: 'minibadge.search' });
    await user.type(searchBox, 'e');
    await screen.findByRole('button', { name: secondUser.displayName });
    expect(screen.queryByRole('button', { name: fakeUser.displayName! })).not.toBeInTheDocument();

    // Remove the selected user: back to disabled (empty selection).
    await user.click(screen.getByRole('button', { name: `Retirer ${fakeUser.displayName}` }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'minibadge.badge.assign' })).toBeDisabled(),
    );
  });

  it('disables "Décerner" when the selection would outmode a threshold (strict >, not >=)', async () => {
    server.use(
      http.get('/minibadge/type/:typeId/users-search', () =>
        HttpResponse.json({ all: [fakeUser, secondUser] }),
      ),
      http.get('/minibadge/global-settings', () =>
        HttpResponse.json({
          pageSize: 10,
          thresholdSettings: [
            { structureId: 'd4c3b2a1', maxAssignable: 1, periodAssignable: 'DAY', assignationsNumber: 0 },
          ],
        }),
      ),
    );
    const user = userEvent.setup();
    renderLightbox();

    const firstResult = await searchAndFind(user, 'e', fakeUser.displayName!);
    await user.click(firstResult);
    // 1 selected, maxAssignable=1 -> exactly reached, NOT outmoded yet.
    expect(screen.getByRole('button', { name: 'minibadge.badge.assign' })).not.toBeDisabled();

    const secondResult = await searchAndFind(user, 'e', secondUser.displayName);
    await user.click(secondResult);
    // 2 selected, maxAssignable=1 -> 0+2=2 > 1, outmoded.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'minibadge.badge.assign' })).toBeDisabled(),
    );
  });

  it('disables "Décerner" when no configured relation matches the assignor/receiver profiles', async () => {
    const nonMatchingBadgeType: BadgeType = {
      ...fakeBadgeType,
      setting: {
        ...fakeBadgeType.setting,
        relations: [
          { assignorType: { type: 'profile', typeValue: 'Teacher' }, receiverType: { type: 'profile', typeValue: 'Student' } },
        ],
      },
    };
    const user = userEvent.setup();
    renderLightbox({ badgeType: nonMatchingBadgeType });

    const result = await searchAndFind(user, fakeUser.displayName!.slice(0, 4), fakeUser.displayName!);
    await user.click(result);

    expect(screen.getByRole('button', { name: 'minibadge.badge.assign' })).toBeDisabled();
  });

  it('submits the selected owner ids, invalidates via useAssignBadge, and closes', async () => {
    let submittedOwnerIds: string[] | undefined;
    server.use(
      http.post('/minibadge/types/:typeId/assign', async ({ request }) => {
        const body = (await request.json()) as { ownerIds: string[] };
        submittedOwnerIds = body.ownerIds;
        return HttpResponse.json({});
      }),
    );
    const user = userEvent.setup();
    const onAssigned = vi.fn();
    const { onClose } = renderLightbox({ onAssigned });

    const result = await searchAndFind(user, fakeUser.displayName!.slice(0, 4), fakeUser.displayName!);
    await user.click(result);
    await user.click(screen.getByRole('button', { name: 'minibadge.badge.assign' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onAssigned).toHaveBeenCalledTimes(1);
    expect(submittedOwnerIds).toEqual([fakeUser.id]);
  });

  // Post-migration improvement plan, Constat #2 (confirmed gap #1): the
  // original AngularJS fired `notify.success('minibadge.success.assign')`
  // on this exact success path (`badge-type.controller.ts:121`); the React
  // port had no equivalent until this fix.
  it('shows a success toast on a successful assignment, before closing (Constat #2)', async () => {
    server.use(http.post('/minibadge/types/:typeId/assign', () => HttpResponse.json({})));
    const user = userEvent.setup();
    const { onClose } = renderLightbox();

    const result = await searchAndFind(user, fakeUser.displayName!.slice(0, 4), fakeUser.displayName!);
    await user.click(result);
    await user.click(screen.getByRole('button', { name: 'minibadge.badge.assign' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(toastSuccess).toHaveBeenCalledTimes(1);
    expect(toastSuccess).toHaveBeenCalledWith('minibadge.success.assign');
  });

  it('does not show a success toast when the assignment fails', async () => {
    server.use(http.post('/minibadge/types/:typeId/assign', () => new HttpResponse(null, { status: 500 })));
    const user = userEvent.setup();
    renderLightbox();

    const result = await searchAndFind(user, fakeUser.displayName!.slice(0, 4), fakeUser.displayName!);
    await user.click(result);
    await user.click(screen.getByRole('button', { name: 'minibadge.badge.assign' }));

    expect(await screen.findByText('minibadge.error.assign')).toBeInTheDocument();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('shows a "no results" message for a query that matches nothing', async () => {
    const user = userEvent.setup();
    renderLightbox();

    const searchBox = screen.getByRole('searchbox', { name: 'minibadge.search' });
    await user.type(searchBox, 'zzz');

    expect(await screen.findByText('minibadge.no.result')).toBeInTheDocument();
  });

  it('removing a previously-selected user does not clear whatever is currently being typed', async () => {
    server.use(
      http.get('/minibadge/type/:typeId/users-search', () =>
        HttpResponse.json({ all: [fakeUser, secondUser] }),
      ),
    );
    const user = userEvent.setup();
    renderLightbox();

    // Select two users first (each selection clears the search box, mirroring
    // `onSelectUser`).
    const firstResult = await searchAndFind(user, 'e', fakeUser.displayName!);
    await user.click(firstResult);
    const secondResult = await searchAndFind(user, 'e', secondUser.displayName);
    await user.click(secondResult);

    // Start typing a new, still-in-progress query.
    const searchBox = screen.getByRole('searchbox', { name: 'minibadge.search' });
    await user.type(searchBox, 'partial-query');
    expect(searchBox).toHaveValue('partial-query');

    // Removing a previously-selected user (via the trash icon) must NOT
    // remount/clear the search box — only selecting a user does.
    await user.click(screen.getByRole('button', { name: `Retirer ${fakeUser.displayName}` }));

    expect(screen.getByRole('searchbox', { name: 'minibadge.search' })).toHaveValue('partial-query');
  });

  it('resets its selection once closed, so reopening (even for a different badge type) starts clean', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = (props: Partial<Parameters<typeof AssignBadgeLightbox>[0]>) => (
      <QueryClientProvider client={queryClient}>
        <EdificeClientProvider params={{ app: 'minibadge' }}>
          <EdificeThemeContext.Provider value={{ theme: undefined }}>
            <AssignBadgeLightbox badgeType={matchingBadgeType} isOpen onClose={vi.fn()} {...props} />
          </EdificeThemeContext.Provider>
        </EdificeClientProvider>
      </QueryClientProvider>
    );
    const { rerender } = render(wrapper({}));

    const result = await searchAndFind(user, fakeUser.displayName!.slice(0, 4), fakeUser.displayName!);
    await user.click(result);
    expect(screen.getByRole('button', { name: 'minibadge.badge.assign' })).not.toBeDisabled();

    // Close (same mounted instance), then reopen: the earlier selection must
    // not survive (mirrors `closeLightbox()` clearing `userSelected`).
    rerender(wrapper({ isOpen: false }));
    rerender(wrapper({ isOpen: true }));

    expect(screen.getByRole('button', { name: 'minibadge.badge.assign' })).toBeDisabled();
  });

  /**
   * Epic C: the sniplet opens this lightbox directly from a portal page, bypassing the detail
   * screen's disabled button — so the lightbox guards an expired badge type itself.
   */
  it('refuses to award an expired badge type, even with a valid selection', async () => {
    const user = userEvent.setup();
    renderLightbox({
      badgeType: { ...matchingBadgeType, setting: { ...matchingBadgeType.setting, validUntil: '2020-01-01', isExpired: true } },
    });

    expect(screen.getByText('minibadge.badge.expired.cannot.assign')).toBeInTheDocument();
    await user.click(await searchAndFind(user, 'fake', fakeUser.displayName!));

    expect(screen.getByRole('button', { name: 'minibadge.badge.assign' })).toBeDisabled();
  });

  it('shows no expiry warning for a badge type that is still valid', () => {
    renderLightbox({
      badgeType: { ...matchingBadgeType, setting: { ...matchingBadgeType.setting, validUntil: '2999-12-31', isExpired: false } },
    });

    expect(screen.queryByText('minibadge.badge.expired.cannot.assign')).not.toBeInTheDocument();
  });
});
