import { Alert, Button, Modal, useToast } from '@edifice.io/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SelectedUsersList, UserSearchResultsList } from '~/components/UserPickerLists';
import { UserSearchBar } from '~/components/UserSearchBar';
import { MinibadgeUser } from '~/models/user';
import { useRevokeCharter } from '~/services/queries/charter';
import { useSearchUsersAdmin } from '~/services/queries/users';

/**
 * Mirrors `revoke-users.directive.ts`/`.html` — the "Révoquer des
 * utilisateurs" action from `/admin` (Task 6): search+select one or more
 * users, then confirm/deny revoking their Mini-badges access for good.
 *
 * NOT to be confused with the Phase 1/3 `RevokeModal` (`~/components/RevokeModal`),
 * which revokes ONE already-given badge assignment
 * (`PUT /minibadge/revoked/given/:badgeId`). This revokes a USER'S right to
 * use Mini-badges at all (`PUT /minibadge/revoke`, `useRevokeCharter`,
 * built in Phase 1 but never consumed until now) — see the plan's "Correction
 * importante" section for why these two are easy to conflate.
 *
 * MIRROR: `AssignBadgeLightbox` for the search/select/selected-list block
 * (same `aria-live="polite"` region + `minibadge.no.result` pattern);
 * `CharterGate` for the two-nested-modals structure and its Escape-guard
 * fix (see below).
 *
 * REVIEW-STYLE FIX carried over proactively (CharterGate's CRITICAL Fix 1):
 * `Modal` (`node_modules/@edifice.io/react/dist/components/Modal/Modal.js`)
 * calls `useKeyPress(onModalClose, ["Escape"])` UNCONDITIONALLY, regardless of
 * its own `isOpen` prop. Both modals below stay mounted the whole time (only
 * `isOpen`/`isConfirmOpen` toggle their visibility), so each `onModalClose`
 * is guarded by ITS OWN modal's open state — an Escape press while neither
 * (or only the other) is open does nothing, instead of firing a real
 * mutation or resetting state pre-emptively.
 *
 * REVIEW FIX (react-reviewer, HIGH): that per-modal guard alone was not
 * enough for the OUTER modal, because while confirming a revocation BOTH
 * modals are simultaneously `isOpen`/`isConfirmOpen` — a single Escape press
 * then fired BOTH `onModalClose` handlers. The inner one correctly closed
 * just the confirm step, but the outer guard (`if (isOpen) ...`) also fired,
 * closing the entire modal and wiping the admin's selection. The outer
 * guard now also requires `!isConfirmOpen` (see `handleModalClose` below),
 * so Escape while confirming only steps back to the selection screen.
 *
 * SUCCESS TOAST (post-migration improvement plan, Constat #2, confirmed gap
 * #2): this component used to hand-roll a toast simulation — its own
 * `isSuccessVisible` state driving a floating `<Alert type="success"
 * position="bottom-right" autoClose>` — added in an earlier phase precisely
 * BECAUSE no real toast mechanism was known to exist yet at the time.
 * `useToast().success(...)` (`@edifice.io/react`, backed by
 * `react-hot-toast`, already available with zero extra setup since `Layout`
 * — mounted once in `routes/root/index.tsx` — renders its own `<Toaster/>`
 * internally) replaces it outright: the hand-rolled state/JSX is removed
 * rather than kept alongside the real mechanism. Mirrors the original
 * `notify.success('minibadge.confirm.revoke.users.success')`
 * (`admin.controller.ts:142`).
 */
export interface RevokeUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RevokeUsersModal = ({ isOpen, onClose }: RevokeUsersModalProps) => {
  const { t } = useTranslation('minibadge');
  const { success: toastSuccess } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<MinibadgeUser[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  // See `AssignBadgeLightbox`'s own doc comment for why a dedicated token
  // (bumped only on selection) rather than `selectedUsers.length` drives the
  // `UserSearchBar` remount: removing a selected user must not also clear
  // whatever the admin is currently typing.
  const [searchBarResetToken, setSearchBarResetToken] = useState(0);

  const trimmedQuery = searchQuery.trim();
  const { users: searchResults, query: searchUsersQuery } = useSearchUsersAdmin(trimmedQuery || undefined);
  const { mutate: revokeUsers, isPending, isError } = useRevokeCharter();

  // Mirrors `onCloseRevokeUsersModal` resetting `selectedUsers`/`search`/
  // `userSearchResults` (`admin.controller.ts:122-127`): whenever this
  // component's own modal closes, the next open starts clean.
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedUsers([]);
      setIsConfirmOpen(false);
    }
  }, [isOpen]);

  const displayUserLabel = (user: MinibadgeUser): string => {
    const name = user.displayName ?? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return user.minibadgeUserState ? `${name} (${t(`minibadge.${user.minibadgeUserState.toLowerCase()}`)})` : name;
  };

  const selectedIds = new Set(selectedUsers.map((selected) => selected.id));
  // Mirrors `onSearchUser`'s implicit filtering via `isUserSelected`.
  const results = (searchResults ?? []).filter((candidate) => !selectedIds.has(candidate.id));

  const handleSelect = (candidate: MinibadgeUser) => {
    setSelectedUsers((current) =>
      current.some((selected) => selected.id === candidate.id) ? current : [...current, candidate],
    );
    setSearchQuery('');
    setSearchBarResetToken((token) => token + 1);
  };

  const handleRemove = (userId: string) => {
    setSelectedUsers((current) => current.filter((selected) => selected.id !== userId));
  };

  const handleClose = () => onClose();
  // Fix 1 (mirrors CharterGate): only close while THIS modal is actually open
  // AND the confirm step isn't showing on top of it. Both `Modal`s register
  // their own global Escape listener unconditionally, so while confirming a
  // revocation BOTH modals are technically `isOpen` at once — without the
  // `!isConfirmOpen` guard, a single Escape press fired both `onModalClose`
  // handlers: the inner one correctly stepped back to the selection screen,
  // but this outer one ALSO ran, closing the whole modal and wiping the
  // admin's search/selection state via the reset `useEffect` above. Escape
  // while confirming should only step back one level, matching the inner
  // modal's own behavior.
  const handleModalClose = () => {
    if (isOpen && !isConfirmOpen) handleClose();
  };
  const handleConfirmModalClose = () => {
    if (isConfirmOpen) setIsConfirmOpen(false);
  };

  const handleConfirmRevoke = () => {
    revokeUsers(
      selectedUsers.map((selected) => selected.id),
      {
        onSuccess: () => {
          setIsConfirmOpen(false);
          onClose();
          setSelectedUsers([]);
          toastSuccess(t('minibadge.confirm.revoke.users.success'));
        },
      },
    );
  };

  return (
    <Modal id="minibadge-revoke-users" isOpen={isOpen} onModalClose={handleModalClose} size="lg" scrollable>
        <Modal.Header onModalClose={handleModalClose}>{t('minibadge.revoke.users.modal.title')}</Modal.Header>
        <Modal.Body>
          <p className="lead mb-16">{t('minibadge.revoke.users.modal.info')}</p>
          <h3 className="h6 mb-8">{t('minibadge.revoke.users.modal.choose')}</h3>
          <UserSearchBar
            key={searchBarResetToken}
            ariaLabel={t('minibadge.revoke.users.modal.choose')}
            onSearch={setSearchQuery}
          />
          {searchUsersQuery.isError ? <Alert type="danger">{t('minibadge.error.search.users')}</Alert> : null}
          <div aria-live="polite">
            {trimmedQuery && results.length > 0 ? (
              <UserSearchResultsList
                users={results}
                ariaLabel={t('minibadge.revoke.users.modal.choose')}
                getLabel={displayUserLabel}
                onSelect={handleSelect}
              />
            ) : null}
            {trimmedQuery && results.length === 0 && !searchUsersQuery.isFetching ? (
              <p className="small text-gray-700 mb-0">{t('minibadge.no.result')}</p>
            ) : null}
          </div>

          <h3 className="h6 mb-8 mt-16">{t('minibadge.selected.persons')}&nbsp;:</h3>
          <SelectedUsersList
            users={selectedUsers}
            ariaLabel={t('minibadge.selected.persons')}
            getLabel={displayUserLabel}
            getRemoveLabel={(user) => `Retirer ${displayUserLabel(user)}`}
            onRemove={handleRemove}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button color="tertiary" variant="ghost" onClick={handleClose}>
            {t('minibadge.cancel')}
          </Button>
          <Button
            color="danger"
            variant="filled"
            onClick={() => setIsConfirmOpen(true)}
            disabled={selectedUsers.length === 0}
          >
            {t('minibadge.revoke')}
          </Button>
        </Modal.Footer>

        {/* NESTED (not a sibling) on purpose, mirroring `revoke-users.html`'s
            actual DOM (the confirm `<lightbox>` sits INSIDE the selection
            `<lightbox>`, `revoke-users.html:2-74`): `Modal`'s own
            `useClickOutside(onModalClose)` (`Modal.js`) treats ANY click
            outside its ref'd DOM subtree as a close request, using
            `mousedown`/`touchstart`, not just Escape. A sibling `<Modal>`
            here would put every click inside the confirm dialog "outside" the
            selection dialog's DOM, spuriously closing the OUTER modal (and
            firing `onClose`) the moment an admin clicks e.g. "Confirmer" —
            reproduced by this component's own tests before this fix. Nesting
            it inside the outer `Modal`'s children keeps confirm-dialog clicks
            contained within the outer modal's ref, so only the outer
            modal's OWN outside-click/Escape guard can ever fire for them. */}
        <Modal id="minibadge-revoke-users-confirm" isOpen={isConfirmOpen} onModalClose={handleConfirmModalClose}>
          <Modal.Header onModalClose={handleConfirmModalClose}>
            {t('minibadge.confirm.revoke.users.modal.title')}
          </Modal.Header>
          <Modal.Body>
            {selectedUsers.length === 1 ? (
              <p>
                {t('minibadge.confirm.revoke.users.modal.question.singular')}&nbsp;
                <strong>{displayUserLabel(selectedUsers[0])}</strong>&nbsp;?
              </p>
            ) : (
              <div>
                <p>{t('minibadge.confirm.revoke.users.modal.question.plural')}</p>
                <ul>
                  {selectedUsers.map((selected) => (
                    <li key={selected.id}>
                      <strong>{displayUserLabel(selected)}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {isError ? <Alert type="danger">{t('minibadge.confirm.revoke.users.error')}</Alert> : null}
          </Modal.Body>
          <Modal.Footer>
            <Button color="tertiary" variant="ghost" onClick={handleConfirmModalClose}>
              {t('minibadge.cancel')}
            </Button>
            <Button color="danger" variant="filled" onClick={handleConfirmRevoke} disabled={isPending}>
              {t('minibadge.confirm.revoke.users.modal.confirm')}
            </Button>
          </Modal.Footer>
      </Modal>
    </Modal>
  );
};
