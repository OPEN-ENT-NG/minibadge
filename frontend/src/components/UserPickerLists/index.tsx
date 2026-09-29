import { Avatar, IconButton } from '@edifice.io/react';
import { IconDelete } from '@edifice.io/react/icons';

import { MinibadgeUser } from '~/models/user';
import { getDefaultAvatarSrc } from '~/utils/picto';

/**
 * Shared search-results/selected-users list UI, factored out of
 * `AssignBadgeLightbox` and `RevokeUsersModal` (per the request to give the
 * revoke modal "the same modal as the assign one" design-wise): both used
 * near-identical but plain, avatar-less `<ul><li><button>` markup. Centralized
 * here so the two stay visually identical and any future polish only needs
 * to happen once.
 *
 * Avatar URL pattern (`/userbook/avatar/:id?thumbnail=...` +
 * `default-avatar.svg` placeholder) mirrors the one already used for
 * `topAssigningUsers`/`topReceivingUsers` on the Statistics page
 * (`~/routes/statistics/index.tsx`).
 */
const avatarProps = (userId: string) => ({
  src: `/userbook/avatar/${userId}?thumbnail=48x48`,
  imgPlaceholder: getDefaultAvatarSrc(),
  alt: '',
  size: 'sm' as const,
  variant: 'circle' as const,
});

export interface UserSearchResultsListProps {
  users: MinibadgeUser[];
  ariaLabel: string;
  getLabel: (user: MinibadgeUser) => string;
  onSelect: (user: MinibadgeUser) => void;
}

export const UserSearchResultsList = ({ users, ariaLabel, getLabel, onSelect }: UserSearchResultsListProps) => (
  <ul className="list-group" aria-label={ariaLabel}>
    {users.map((candidate) => (
      <li key={candidate.id} className="list-group-item p-0 border-0">
        <button
          type="button"
          className="list-group-item-action d-flex align-items-center gap-8 p-8 rounded-3 border-0 bg-transparent w-100 text-start"
          onClick={() => onSelect(candidate)}
        >
          <Avatar {...avatarProps(candidate.id)} />
          <span className="small">{getLabel(candidate)}</span>
        </button>
      </li>
    ))}
  </ul>
);

export interface SelectedUsersListProps {
  users: MinibadgeUser[];
  ariaLabel: string;
  getLabel: (user: MinibadgeUser) => string;
  getRemoveLabel: (user: MinibadgeUser) => string;
  onRemove: (userId: string) => void;
}

export const SelectedUsersList = ({
  users,
  ariaLabel,
  getLabel,
  getRemoveLabel,
  onRemove,
}: SelectedUsersListProps) => (
  <ul className="list-group" aria-label={ariaLabel}>
    {users.map((selected) => (
      <li
        key={selected.id}
        className="list-group-item d-flex align-items-center justify-content-between gap-8 p-8"
      >
        <span className="d-flex align-items-center gap-8">
          <Avatar {...avatarProps(selected.id)} />
          <span className="small">{getLabel(selected)}</span>
        </span>
        <IconButton
          icon={<IconDelete />}
          aria-label={getRemoveLabel(selected)}
          color="danger"
          variant="ghost"
          onClick={() => onRemove(selected.id)}
        />
      </li>
    ))}
  </ul>
);
