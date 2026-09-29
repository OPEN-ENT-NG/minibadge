import { Alert, Button, Modal, useEdificeClient, useToast } from '@edifice.io/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SelectedUsersList, UserSearchResultsList } from '~/components/UserPickerLists';
import { UserSearchBar } from '~/components/UserSearchBar';
import { BadgeType } from '~/models/badgeType';
import { MinibadgeUser } from '~/models/user';
import { useAssignBadge } from '~/services/queries/badgeAssigned';
import { useGlobalSettings } from '~/services/queries/config';
import { useSearchUsersForType } from '~/services/queries/users';
import { isBadgeTypeExpired } from '~/utils/badgeStatus';
import { formatIsoDateFr } from '~/utils/date';
import { isMatchingAnyRelation } from '~/utils/relation';
import { areThresholdsOutmoded, areThresholdsReached, assignableNumbersLabel } from '~/utils/threshold';
import { formatMessage } from '~/utils/translate';

/**
 * The single "Décerner" (assign) lightbox, shared between the badge-types
 * library screen and the badge detail screen.
 *
 * The assignor's profile used by `isMatchingAnyRelation` must come from
 * `useEdificeClient().userProfile` (`Array<'Student' | 'Teacher' |
 * 'Relative' | 'Personnel' | 'Guest'>`), not `useUser().user.type` (an
 * internal ENT Core code in a completely different string domain) — the two
 * are easy to confuse since both look like "the current user's profile".
 *
 * An expired badge type (Epic C: end date past) cannot be awarded: the submit stays disabled and a
 * warning says why. The detail screen already disables its "Décerner" button in that case; this guard
 * covers the sniplet, which opens the lightbox directly from a portal page.
 *
 * `useToast().success(...)` requires some `<Toaster/>` mounted somewhere on
 * the page — it isn't tied to any particular ancestor. The standalone
 * sniplet variant (`~/sniplet/BadgeAssignSniplet.tsx`) doesn't mount
 * `Layout` itself, so its success toast is only visible if the host portal
 * page happens to mount one elsewhere; if not, the assignment still
 * succeeds server-side but the toast fails completely silently.
 */
export interface AssignBadgeLightboxProps {
  badgeType: BadgeType | undefined;
  isOpen: boolean;
  onClose: () => void;
  /** Extra invalidation the caller wants on top of `useAssignBadge`'s own
   * (`['assigned']`/`['badges']`/`['badgeTypes']`) — e.g. the detail screen
   * also needs `['badgeType', typeId]` and `['badgeTypeAssigners', typeId]`
   * refreshed. Those two query-key roots are singular, not prefixes of the
   * plural `'badgeTypes'` root `useAssignBadge` invalidates, so React
   * Query's prefix-matching `invalidateQueries` never reaches them from
   * inside that shared hook — hence this separate, per-caller escape hatch. */
  onAssigned?: () => void;
}

const displayUserName = (user: MinibadgeUser): string =>
  user.displayName ?? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();

export const AssignBadgeLightbox = ({ badgeType, isOpen, onClose, onAssigned }: AssignBadgeLightboxProps) => {
  const { t } = useTranslation('minibadge');
  const { userProfile } = useEdificeClient();
  const { success: toastSuccess } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<MinibadgeUser[]>([]);
  // A dedicated token, bumped only in `handleSelect`, decouples clearing
  // `UserSearchBar`'s text from the selected-count changing — keying on
  // `selectedUsers.length` instead would also clear in-progress typing when
  // removing a previously-selected user via the trash icon, not just when
  // selecting one.
  const [searchBarResetToken, setSearchBarResetToken] = useState(0);

  const typeId = badgeType?.id ?? 0;
  const trimmedQuery = searchQuery.trim();
  const { users: searchResults, query: searchUsersQuery } = useSearchUsersForType(
    typeId,
    trimmedQuery || undefined,
  );
  const { globalSettings } = useGlobalSettings();
  const { mutate: assignBadge, isPending, isError } = useAssignBadge();

  // Reset whenever the lightbox closes, so the next open (possibly for a
  // different badge type) starts clean.
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedUsers([]);
    }
  }, [isOpen]);

  const thresholdSettings = globalSettings?.thresholdSettings ?? [];
  const assignorProfile = userProfile?.[0];
  const relations = badgeType?.setting.relations ?? [];

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

  const isThresholdBlocked = areThresholdsOutmoded(thresholdSettings, selectedUsers.length);
  const isRelationBlocked = !isMatchingAnyRelation(assignorProfile, selectedUsers, relations);
  const isExpired = !!badgeType && isBadgeTypeExpired(badgeType);
  const isSubmitDisabled =
    selectedUsers.length === 0 || isThresholdBlocked || isRelationBlocked || isExpired || isPending || !badgeType;

  const handleClose = () => onClose();

  const handleAssign = () => {
    if (isSubmitDisabled || !badgeType) return;
    assignBadge(
      { typeId: badgeType.id, ownerIds: selectedUsers.map((selected) => selected.id) },
      {
        onSuccess: () => {
          toastSuccess(t('minibadge.success.assign'));
          onAssigned?.();
          handleClose();
        },
      },
    );
  };

  const remainingLabel = assignableNumbersLabel(thresholdSettings, selectedUsers.length);
  const isRemainingWarning = areThresholdsReached(thresholdSettings, selectedUsers.length);

  return (
    <Modal id="minibadge-assign-lightbox" isOpen={isOpen} onModalClose={handleClose} size="lg" scrollable>
      <Modal.Header onModalClose={handleClose}>
        {t('minibadge.badge.assign')} {badgeType?.label}
      </Modal.Header>
      <Modal.Body>
        {isExpired ? (
          <Alert type="warning" className="mb-16">
            {formatMessage(t, 'minibadge.badge.expired.cannot.assign', [
              formatIsoDateFr(badgeType?.setting.validUntil),
            ])}
          </Alert>
        ) : null}
        <h3 className="h6 mb-8">{t('minibadge.choose.users.to.assign')}</h3>
        {/* `UserSearchBar` is uncontrolled internally (no `value` prop), so
            remounting it via `key` is how its visible text gets cleared.
            Keyed on `searchBarResetToken` (bumped only in `handleSelect`),
            not `selectedUsers.length`, so removing a user via the trash icon
            below does not also clear whatever is currently being typed. */}
        <UserSearchBar
          key={searchBarResetToken}
          ariaLabel={t('minibadge.search')}
          placeholder={t('minibadge.search')}
          onSearch={setSearchQuery}
        />
        {searchUsersQuery.isError ? <Alert type="danger">{t('minibadge.error.search.users')}</Alert> : null}
        {/* Wrapped in a polite live region with an explicit "no results"
            message, so a screen-reader user isn't left in silence while a
            search is in flight or matches nothing. */}
        <div aria-live="polite">
          {trimmedQuery && results.length > 0 ? (
            <UserSearchResultsList
              users={results}
              ariaLabel={t('minibadge.choose.users.to.assign')}
              getLabel={displayUserName}
              onSelect={handleSelect}
            />
          ) : null}
          {trimmedQuery && results.length === 0 && !searchUsersQuery.isFetching ? (
            <p className="small text-gray-700 mb-0">{t('minibadge.no.result')}</p>
          ) : null}
        </div>

        <h3 className="h6 mb-8 mt-16">
          {t('minibadge.selected.persons')}&nbsp;:
        </h3>
        {/* The remove button's label names the specific person being
            removed, rather than reusing a generic label, so it stays
            unambiguous with multiple people selected. */}
        <SelectedUsersList
          users={selectedUsers}
          ariaLabel={t('minibadge.selected.persons')}
          getLabel={displayUserName}
          getRemoveLabel={(user) => `Retirer ${displayUserName(user)}`}
          onRemove={handleRemove}
        />

        {isError ? <Alert type="danger">{t('minibadge.error.assign')}</Alert> : null}
      </Modal.Body>
      <Modal.Footer>
        {isRemainingWarning ? (
          <Alert type="warning" className="small">
            {t('minibadge.threshold.remaining')}&nbsp;: {remainingLabel}
          </Alert>
        ) : (
          <span className="small text-gray-700">
            {t('minibadge.threshold.remaining')}&nbsp;: {remainingLabel}
          </span>
        )}
        <Button color="tertiary" variant="ghost" onClick={handleClose}>
          {t('minibadge.cancel')}
        </Button>
        <Button color="primary" variant="filled" onClick={handleAssign} disabled={isSubmitDisabled}>
          {t('minibadge.badge.assign')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
