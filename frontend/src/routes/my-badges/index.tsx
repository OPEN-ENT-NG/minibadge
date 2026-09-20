import { Alert, LoadingScreen } from '@edifice.io/react';
import { IconBlock, IconCheck, IconHide, IconSee } from '@edifice.io/react/icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BadgeCardAction } from '~/components/BadgeCard';
import { BadgeSection } from '~/components/BadgeSection';
import { UserSearchBar } from '~/components/UserSearchBar';
import { Badge } from '~/models/badge';
import { useMinibadgeAccessContext } from '~/routes/root/CharterGate/context';
import { usePrivatizeBadge, usePublishBadge, useRefuseBadge, useBadges } from '~/services/queries/badges';
import { isPrivatizedBadge, isPublicBadge, isRefusedBadge } from '~/utils/badgeStatus';

/**
 * "Mes badges reçus": the badge types the current user already owns,
 * grouped into 3 sections by status (public / private / refused), each with
 * a per-status quick-action menu.
 *
 * Renders nothing without `canReceive` (read from `CharterGate`'s context,
 * not re-fetched here).
 *
 * "Accepter" on a refused badge reuses the same `publishBadge` mutation as
 * "Publier" on a private one — same call, different label/icon.
 */
export const MyBadges = () => {
  const { t } = useTranslation('minibadge');
  const { canReceive } = useMinibadgeAccessContext();
  const [searchQuery, setSearchQuery] = useState('');
  const { badges, query: badgesQuery } = useBadges(searchQuery.trim() || undefined);

  const { mutate: privatizeBadge } = usePrivatizeBadge();
  const { mutate: refuseBadge } = useRefuseBadge();
  const { mutate: publishBadge } = usePublishBadge();

  if (!canReceive) {
    return null;
  }

  const allBadges = badges ?? [];
  const publishedBadges = allBadges.filter(isPublicBadge);
  const privatizedBadges = allBadges.filter(isPrivatizedBadge);
  const refusedBadges = allBadges.filter(isRefusedBadge);

  const getPublicActions = (badge: Badge): BadgeCardAction[] => [
    { label: t('minibadge.privatize'), icon: <IconHide />, onClick: () => privatizeBadge(badge.badgeTypeId) },
    { label: t('minibadge.refuse'), icon: <IconBlock />, onClick: () => refuseBadge(badge.badgeTypeId) },
  ];
  const getPrivateActions = (badge: Badge): BadgeCardAction[] => [
    { label: t('minibadge.publish'), icon: <IconSee />, onClick: () => publishBadge(badge.badgeTypeId) },
    { label: t('minibadge.refuse'), icon: <IconBlock />, onClick: () => refuseBadge(badge.badgeTypeId) },
  ];
  const getRefusedActions = (badge: Badge): BadgeCardAction[] => [
    { label: t('minibadge.accept'), icon: <IconCheck />, onClick: () => publishBadge(badge.badgeTypeId) },
  ];

  return (
    <div>
      {badgesQuery.isError ? (
        <Alert type="danger">{t('minibadge.error.get.badges')}</Alert>
      ) : null}
      <div className="p-24 bg-gray-200 mb-16">
        <UserSearchBar
          ariaLabel={t('minibadge.badge.search')}
          placeholder={t('minibadge.badge.search')}
          onSearch={setSearchQuery}
        />
      </div>
      {/* `LoadingScreen` has no `aria-live`/`role="status"` of its own, so
          this wrapper stays mounted across both loading states for a screen
          reader to observe the swap. */}
      <div aria-live="polite">
        {badgesQuery.isLoading ? <LoadingScreen /> : null}
        {/* `hidden` (not a conditional unmount) is deliberate: `BadgeSection`'s
            own auto-open transition detection compares the badge count
            across renders via a ref seeded on mount. Unmounting the 3
            sections while loading and remounting them once data arrives
            would seed that ref with the already-non-empty count,
            permanently missing the 0→N transition the public/private
            sections rely on to auto-open. */}
        <div hidden={badgesQuery.isLoading}>
          <BadgeSection
            className="mb-16"
            label={t('minibadge.badges.public')}
            icon={<IconSee />}
            badges={publishedBadges}
            getActions={getPublicActions}
          />
          <BadgeSection
            className="mb-16"
            label={t('minibadge.badges.private')}
            icon={<IconHide />}
            badges={privatizedBadges}
            getActions={getPrivateActions}
          />
          <BadgeSection
            label={t('minibadge.badges.refuse')}
            icon={<IconBlock />}
            badges={refusedBadges}
            defaultOpen={false}
            forceOpen={!!searchQuery.trim()}
            getActions={getRefusedActions}
          />
        </div>
      </div>
    </div>
  );
};
