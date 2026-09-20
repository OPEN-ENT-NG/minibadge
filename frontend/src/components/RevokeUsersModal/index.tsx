import { Alert, Button, Modal, useToast } from '@edifice.io/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SelectedUsersList, UserSearchResultsList } from '~/components/UserPickerLists';
import { UserSearchBar } from '~/components/UserSearchBar';
import { MinibadgeUser } from '~/models/user';
import { useRevokeCharter } from '~/services/queries/charter';
import { useSearchUsersAdmin } from '~/services/queries/users';

/**
 * "Révoquer des utilisateurs" (admin): search+select one or more users, then
 * confirm/deny revoking their Mini-badges access for good.
 *
 * NOT to be confused with `RevokeModal`, which revokes ONE already-given
 * badge assignment — this revokes a USER'S right to use Mini-badges at all.
 *
 * `Modal` calls `useKeyPress(onModalClose, ["Escape"])` unconditionally
 * regardless of its own `isOpen` prop, and both modals below stay mounted at
 * all times. While confirming a revocation, BOTH modals are simultaneously
 * open, so each `onModalClose` must guard on its own open state AND (for the
 * outer one) `!isConfirmOpen` — otherwise a single Escape press fires both
 * handlers, closing the entire modal and wiping the admin's selection
 * instead of just stepping back to the selection screen.
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
  // A dedicated token, bumped only in `handleSelect`, decouples clearing
  // `UserSearchBar`'s text from the selected-count changing — keying on
  // `selectedUsers.length` instead would also clear in-progress typing when
  // removing a previously-selected user via the trash icon, not just when
  // selecting one.
  const [searchBarResetToken, setSearchBarResetToken] = useState(0);

  const trimmedQuery = searchQuery.trim();
  const { users: searchResults, query: searchUsersQuery } = useSearchUsersAdmin(trimmedQuery || undefined);
  const { mutate: revokeUsers, isPending, isError } = useRevokeCharter();

  // Whenever this modal closes, the next open starts clean.
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
  // Only close while this modal is open AND the confirm step isn't showing
  // on top of it — see the class doc comment for why the `!isConfirmOpen`
  // guard is needed.
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

        {/* NESTED (not a sibling) on purpose: `Modal`'s own `useClickOutside`
            treats any click outside its ref'd DOM subtree as a close
            request. A sibling `<Modal>` here would put every click inside
            the confirm dialog "outside" the selection dialog's DOM,
            spuriously closing the outer modal the moment an admin clicks
            e.g. "Confirmer". Nesting it inside the outer `Modal`'s children
            keeps confirm-dialog clicks contained within the outer modal's
            ref. */}
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
