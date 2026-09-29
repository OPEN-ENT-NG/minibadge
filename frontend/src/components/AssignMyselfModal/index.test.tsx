import { odeServices } from '@edifice.io/client';
import { EdificeClientProvider, EdificeThemeContext } from '@edifice.io/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeBadgeType } from '~/mocks/handlers';
import { server } from '~/mocks/server';
import { BadgeType } from '~/models/badgeType';

import { AssignMyselfModal } from '.';

beforeEach(() => odeServices.cache().clearCache());

function renderModal(props: Partial<Parameters<typeof AssignMyselfModal>[0]> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onClose = vi.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <EdificeClientProvider params={{ app: 'minibadge' }}>
        <EdificeThemeContext.Provider value={{ theme: undefined }}>
          <AssignMyselfModal badgeType={fakeBadgeType} isOpen onClose={onClose} {...props} />
        </EdificeThemeContext.Provider>
      </EdificeClientProvider>
    </QueryClientProvider>,
  );
  return { ...utils, onClose };
}

const confirmButtonName = 'minibadge.badge.assign.myself.button';

describe('AssignMyselfModal', () => {
  it('enables the confirm button by default (quota available, not already self-assigned)', async () => {
    renderModal();

    // The button renders disabled until `useUser()` resolves (`isDisabled`
    // also guards on `!user`) — `waitFor` covers that brief async window,
    // consistent with how the rest of this suite waits for it below.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: confirmButtonName })).not.toBeDisabled(),
    );
  });

  it('disables the confirm button and shows a warning when the badge is already self-assigned', async () => {
    const alreadyAssigned: BadgeType = { ...fakeBadgeType, isSelfAssigned: true };
    renderModal({ badgeType: alreadyAssigned });

    expect(await screen.findByText('minibadge.badge.assign.myself.already.assigned')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: confirmButtonName })).toBeDisabled();
  });

  /**
   * GOTCHA verified in `AssignMyselfModal`'s own doc comment: this modal's
   * disable condition is `areThresholdsReached(thresholds, 0)` (the `>=`
   * variant, addingNumber 0) — NOT `areThresholdsOutmoded` (the `>` variant
   * `AssignBadgeLightbox` uses). A threshold with `assignationsNumber ===
   * maxAssignable` is "reached" and must already disable this modal's button,
   * even though it would NOT yet be "outmoded".
   */
  it('disables the confirm button once the threshold is reached (>=), before it would be outmoded (>)', async () => {
    server.use(
      http.get('/minibadge/global-settings', () =>
        HttpResponse.json({
          pageSize: 10,
          thresholdSettings: [
            { structureId: 'd4c3b2a1', maxAssignable: 2, periodAssignable: 'DAY', assignationsNumber: 2 },
          ],
        }),
      ),
    );
    renderModal();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: confirmButtonName })).toBeDisabled(),
    );
  });

  it('confirming calls useAssignBadge with the connected user as the sole owner, then closes', async () => {
    let submittedOwnerIds: string[] | undefined;
    let submittedTypeId: string | undefined;
    server.use(
      http.post('/minibadge/types/:typeId/assign', async ({ request, params }) => {
        submittedTypeId = params.typeId as string;
        const body = (await request.json()) as { ownerIds: string[] };
        submittedOwnerIds = body.ownerIds;
        return HttpResponse.json({});
      }),
    );
    const user = userEvent.setup();
    const onAssigned = vi.fn();
    const { onClose } = renderModal({ onAssigned });

    await user.click(await screen.findByRole('button', { name: confirmButtonName }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onAssigned).toHaveBeenCalledTimes(1);
    expect(submittedOwnerIds).toEqual(['a1b2c3d4']);
    expect(submittedTypeId).toBe(String(fakeBadgeType.id));
  });

  it('cancelling calls onClose without submitting anything', async () => {
    let assignCalled = false;
    server.use(
      http.post('/minibadge/types/:typeId/assign', () => {
        assignCalled = true;
        return HttpResponse.json({});
      }),
    );
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.click(await screen.findByRole('button', { name: 'minibadge.cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(assignCalled).toBe(false);
  });

  it('disables the confirm button and says why when the badge type has expired (Epic C)', async () => {
    const expired: BadgeType = { ...fakeBadgeType, setting: { ...fakeBadgeType.setting, validUntil: '2020-01-01', isExpired: true } };
    renderModal({ badgeType: expired });

    expect(await screen.findByText('minibadge.badge.expired.cannot.assign')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: confirmButtonName })).toBeDisabled();
  });
});
