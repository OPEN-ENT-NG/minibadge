import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeAdminSearchUserRevoked, fakeAdminSearchUserSecond, fakeUser } from '~/mocks/handlers';
import { server } from '~/mocks/server';

import { RevokeUsersModal } from '.';

// Lets the success test assert the toast fires, without depending on a
// `<Toaster/>` (only `Layout`, mounted in `routes/root`, provides one at
// runtime).
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

beforeEach(() => toastSuccess.mockClear());

function renderModal(isOpen = true, onClose = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RevokeUsersModal isOpen={isOpen} onClose={onClose} />
    </QueryClientProvider>,
  );
  return { ...utils, onClose };
}

/**
 * Types into the search box. Deliberately doesn't itself wait out
 * `UserSearchBar`'s 300ms debounce: every caller immediately follows this
 * with a `findBy*` (which polls via RTL's own `waitFor`, correctly
 * act-wrapped) rather than a raw `setTimeout` sleep.
 */
async function search(user: ReturnType<typeof userEvent.setup>, query: string) {
  const input = screen.getByRole('searchbox', { name: 'minibadge.revoke.users.modal.choose' });
  await user.type(input, query);
}

describe('RevokeUsersModal', () => {
  it('is not visible when isOpen is false', () => {
    renderModal(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the search+selection modal with the "Révoquer" button disabled until a user is selected', async () => {
    renderModal(true);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('minibadge.revoke.users.modal.title')).toBeInTheDocument();
    expect(within(dialog).getByText('minibadge.revoke.users.modal.info')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'minibadge.revoke' })).toBeDisabled();
  });

  it('searches, selects a user (adding them to the selected list, no duplicates), then enables Revoke', async () => {
    const user = userEvent.setup();
    renderModal(true);
    await screen.findByRole('dialog');

    await search(user, 'fake');
    const resultButton = await screen.findByRole('button', { name: fakeUser.displayName });
    await user.click(resultButton);

    expect(screen.getByRole('button', { name: 'minibadge.revoke' })).toBeEnabled();
    const selectedList = screen.getByRole('list', { name: 'minibadge.selected.persons' });
    expect(within(selectedList).getByText(fakeUser.displayName as string)).toBeInTheDocument();

    // Selecting the same user twice must not duplicate them in the list.
    expect(within(selectedList).getAllByText(fakeUser.displayName as string)).toHaveLength(1);
  });

  it('appends the minibadgeUserState suffix (Révoqué) when displaying a user, mirroring displayUser', async () => {
    const user = userEvent.setup();
    renderModal(true);
    await screen.findByRole('dialog');

    await search(user, fakeAdminSearchUserRevoked.displayName as string);
    const resultButton = await screen.findByRole('button', {
      name: `${fakeAdminSearchUserRevoked.displayName} (minibadge.revoked)`,
    });
    await user.click(resultButton);

    const selectedList = screen.getByRole('list', { name: 'minibadge.selected.persons' });
    expect(
      within(selectedList).getByText(`${fakeAdminSearchUserRevoked.displayName} (minibadge.revoked)`),
    ).toBeInTheDocument();
  });

  it('shows a "no result" message with an aria-live region when the search matches nobody', async () => {
    const user = userEvent.setup();
    renderModal(true);
    await screen.findByRole('dialog');

    await search(user, 'no-such-user-at-all');

    expect(await screen.findByText('minibadge.no.result')).toBeInTheDocument();
  });

  it('removing a selected user takes them out of the selected list', async () => {
    const user = userEvent.setup();
    renderModal(true);
    await screen.findByRole('dialog');

    await search(user, 'fake');
    await user.click(await screen.findByRole('button', { name: fakeUser.displayName }));

    const selectedList = screen.getByRole('list', { name: 'minibadge.selected.persons' });
    await user.click(within(selectedList).getByRole('button', { name: `Retirer ${fakeUser.displayName}` }));

    expect(within(selectedList).queryByText(fakeUser.displayName as string)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'minibadge.revoke' })).toBeDisabled();
  });

  it('shows the singular confirmation question with the selected user\'s name for exactly 1 selection', async () => {
    const user = userEvent.setup();
    renderModal(true);
    await screen.findByRole('dialog');

    await search(user, 'fake');
    await user.click(await screen.findByRole('button', { name: fakeUser.displayName }));
    await user.click(screen.getByRole('button', { name: 'minibadge.revoke' }));

    const dialogs = screen.getAllByRole('dialog');
    const confirmDialog = dialogs[dialogs.length - 1];
    expect(within(confirmDialog).getByText('minibadge.confirm.revoke.users.modal.title')).toBeInTheDocument();
    // The question text and the bolded name sit in the same <p> (separated by
    // `&nbsp;`), so `getByText` (which matches a single element's own text)
    // can't target the sentence as a whole — assert on the paragraph's
    // combined text content instead.
    expect(confirmDialog.textContent).toContain('minibadge.confirm.revoke.users.modal.question.singular');
    expect(within(confirmDialog).getByText(fakeUser.displayName as string)).toBeInTheDocument();
    expect(confirmDialog.textContent).not.toContain('minibadge.confirm.revoke.users.modal.question.plural');
  });

  it('shows the plural confirmation question with a bulleted list for 2+ selections', async () => {
    const user = userEvent.setup();
    renderModal(true);
    await screen.findByRole('dialog');

    await search(user, 'fake');
    await user.click(await screen.findByRole('button', { name: fakeUser.displayName }));
    await search(user, fakeAdminSearchUserSecond.displayName as string);
    await user.click(await screen.findByRole('button', { name: fakeAdminSearchUserSecond.displayName as string }));

    await user.click(screen.getByRole('button', { name: 'minibadge.revoke' }));

    const dialogs = screen.getAllByRole('dialog');
    const confirmDialog = dialogs[dialogs.length - 1];
    expect(
      within(confirmDialog).getByText('minibadge.confirm.revoke.users.modal.question.plural'),
    ).toBeInTheDocument();
    expect(within(confirmDialog).getByText(fakeUser.displayName as string)).toBeInTheDocument();
    expect(within(confirmDialog).getByText(fakeAdminSearchUserSecond.displayName as string)).toBeInTheDocument();
  });

  it('confirming calls PUT /minibadge/revoke with the selected userIds, then closes both modals and clears the selection', async () => {
    const user = userEvent.setup();
    let receivedUserIds: string[] | null = null;
    server.use(
      http.put('/minibadge/revoke', async ({ request }) => {
        const body = (await request.json()) as { userIds: string[] };
        receivedUserIds = body.userIds;
        return HttpResponse.json({});
      }),
    );
    const { onClose } = renderModal(true);
    await screen.findByRole('dialog');

    await search(user, 'fake');
    await user.click(await screen.findByRole('button', { name: fakeUser.displayName }));
    await user.click(screen.getByRole('button', { name: 'minibadge.revoke' }));

    const confirmDialog = (await screen.findAllByRole('dialog')).at(-1) as HTMLElement;
    await user.click(within(confirmDialog).getByRole('button', { name: 'minibadge.confirm.revoke.users.modal.confirm' }));

    await waitFor(() => expect(receivedUserIds).toEqual([fakeUser.id]));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toastSuccess).toHaveBeenCalledTimes(1);
    expect(toastSuccess).toHaveBeenCalledWith('minibadge.confirm.revoke.users.success');
  });

  it('shows an inline error message and keeps both modals open when the revocation mutation fails', async () => {
    const user = userEvent.setup();
    server.use(http.put('/minibadge/revoke', () => new HttpResponse(null, { status: 500 })));
    const { onClose } = renderModal(true);
    await screen.findByRole('dialog');

    await search(user, 'fake');
    await user.click(await screen.findByRole('button', { name: fakeUser.displayName }));
    await user.click(screen.getByRole('button', { name: 'minibadge.revoke' }));

    const confirmDialog = (await screen.findAllByRole('dialog')).at(-1) as HTMLElement;
    await user.click(within(confirmDialog).getByRole('button', { name: 'minibadge.confirm.revoke.users.modal.confirm' }));

    expect(await screen.findByText('minibadge.confirm.revoke.users.error')).toBeInTheDocument();
    expect(screen.getAllByRole('dialog')).toHaveLength(2);
    expect(onClose).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  describe('Escape key (each onModalClose guarded by its own open state)', () => {
    it('pressing Escape while only the search modal is open closes only that modal', async () => {
      const user = userEvent.setup();
      const { onClose } = renderModal(true);
      await screen.findByRole('dialog');

      await user.keyboard('{Escape}');

      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    });

    it('pressing Escape while the modal is closed (not rendered as open) triggers no close callback', async () => {
      const { onClose } = renderModal(false);
      const user = userEvent.setup();

      await user.keyboard('{Escape}');

      // Give any (wrongly) fired handler a chance to run before asserting its absence.
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(onClose).not.toHaveBeenCalled();
    });

    // Both `Modal`s register their own global Escape listener
    // unconditionally, so while the confirmation sub-dialog is showing on
    // top of the outer search/select modal, BOTH are simultaneously "open".
    // A single Escape press must only step back to the selection screen
    // (closing the confirm step), never discard the admin's
    // search/selection state by closing the whole modal.
    it('pressing Escape while the confirmation sub-dialog is open only closes the confirmation, keeping the selection intact', async () => {
      const user = userEvent.setup();
      const { onClose } = renderModal(true);
      await screen.findByRole('dialog');

      await search(user, 'fake');
      await user.click(await screen.findByRole('button', { name: fakeUser.displayName }));
      await user.click(screen.getByRole('button', { name: 'minibadge.revoke' }));
      expect(screen.getAllByRole('dialog')).toHaveLength(2);

      await user.keyboard('{Escape}');

      // Only the confirm dialog closed — the outer search/select modal (and
      // the whole `RevokeUsersModal`) must still be open. A generous timeout:
      // `Modal`'s close is driven by a `react-spring` leave transition, not
      // an instant unmount.
      await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(1), { timeout: 3000 });
      expect(onClose).not.toHaveBeenCalled();

      const remainingDialog = screen.getByRole('dialog');
      expect(within(remainingDialog).getByText('minibadge.revoke.users.modal.title')).toBeInTheDocument();
      const selectedList = screen.getByRole('list', { name: 'minibadge.selected.persons' });
      expect(within(selectedList).getByText(fakeUser.displayName as string)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'minibadge.revoke' })).toBeEnabled();
    });
  });
});
