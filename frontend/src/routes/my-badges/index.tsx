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
 * Mirror of `main.html` + `minibadge.controller.ts`: "Mes badges reçus" —
 * the badge types the current user already owns, grouped into 3 sections by
 * status, each with a per-status quick-action menu.
 *
 * - Search: a single text input, debounced (`UserSearchBar`, reused as-is —
 *   it's a generic debounced search box, not user-specific despite the
 *   name), refiring `GET /minibadge/badges?query=` (`vm.searchQuery` +
 *   `on-search="vm.initBadges()"` in `main.html:2-3`).
 * - `canReceive` comes from `CharterGate`'s context, NOT re-fetched here
 *   (the plan's Task 5 gotcha) — mirrors `getBadges()`'s early return when
 *   `!this.$scope.setting.userPermissions.canReceive()`
 *   (`minibadge.controller.ts:72`): this screen renders nothing at all
 *   without that right.
 * - Status split: `~/utils/badgeStatus` (Task 1), mirroring
 *   `minibadge.controller.ts:79-81`.
 * - Actions per status — `minibadge.controller.ts:101-147`: public →
 *   [Privatiser, Refuser]; private → [Publier, Refuser]; refused →
 *   [Accepter] (same `publishBadgeType` call as "Publier", different label
 *   and icon since the source uses a distinct `acceptOption`).
 * - The refused section is closed by default and only force-shown while
 *   searching (`main.html:11-14`, `is-default-opened-list="false"` +
 *   `is-opened-option="vm.isOpenedOption"` — see `~/components/BadgeSection`
 *   for the exact open/close semantics this mirrors).
 *
 * LOADING INDICATOR (post-migration improvement plan, Constat #1): before
 * this fix, `allBadges = badges ?? []` meant every section rendered as if
 * "no badges" during the initial fetch, indistinguishable from a genuine
 * empty result. `LoadingScreen` is now shown alongside the 3 sections (search
 * box stays visible/usable) while `badgesQuery.isLoading` — see the `hidden`
 * usage at the point of render below for why the sections are hidden rather
 * than unmounted during load.
 *
 * PLAN DEVIATION (documented, not guessed): the plan's own text proposed the
 * bare `Loading` component (an inline spinner) for this fix, reserving
 * `LoadingScreen` for `CharterGate`'s app-wide gate only. Verified against
 * the real component source
 * (`node_modules/@edifice.io/react/dist/components/Loading/Loading.js`):
 * `Loading`'s `isLoading` prop only toggles a CSS class that starts/stops a
 * spin animation on its icon — the icon and `children` always render
 * regardless of `isLoading`'s value, so it is not designed to be used bare
 * as a conditional "show while loading" block (every real usage found in
 * both this app and `~/EDIFICE/app/communities` — the plan's own cited
 * mature sibling app — passes it only as a `Button`'s `isLoading` prop, never
 * instantiated directly). `LoadingScreen`, by contrast, defaults to
 * `position={true}` (`LoadingScreen.js`), i.e. `position-static`, NOT a fixed
 * full-viewport overlay — that only happens with `position={false}`. So by
 * default it is already an inline, container-scoped placeholder, and
 * `communities` uses it exactly that way, nested inside a results container
 * while a persistent search bar stays visible above it (see e.g.
 * `communities/frontend/src/features/communities-list/CommunitiesList.tsx`
 * and `.../membership-list/components/GroupListTable.tsx`). This app's own
 * `routes/badge-type-detail` already does the same (full-content
 * `<LoadingScreen />` while its single query loads). `LoadingScreen` is
 * therefore the real established pattern for a query-driven content area,
 * mirrored here instead of the plan's guessed API.
 *
 * A11Y FIX (react-reviewer, MEDIUM): `LoadingScreen` itself has no
 * `aria-live`/`role="status"`, so the loading→loaded swap above was invisible
 * to assistive tech. Wrapped in `<div aria-live="polite">` — see the JSX
 * below — mirroring the exact pattern already established by
 * `AssignBadgeLightbox`/`RevokeUsersModal`'s search-results regions.
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
      {/* REVIEW FIX (react-reviewer, HIGH): `useBadges`'s error state used to
          be silently dropped — a failed `GET /minibadge/badges` just left the
          screen looking empty, indistinguishable from "no badges yet".
          `minibadge.error.get.badges` is already shipped in `i18n/fr.json`
          for exactly this. */}
      {badgesQuery.isError ? (
        <Alert type="danger">{t('minibadge.error.get.badges')}</Alert>
      ) : null}
      {/* Matches communities' `SearchBarCommunities` (`features/search-bar/SearchBar.tsx`):
          a padded gray box around the search input, not the bare input alone. */}
      <div className="p-24 bg-gray-200 mb-16">
        <UserSearchBar
          ariaLabel={t('minibadge.badge.search')}
          placeholder={t('minibadge.badge.search')}
          onSearch={setSearchQuery}
        />
      </div>
      {/* A11Y FIX (react-reviewer, MEDIUM): `LoadingScreen` has no
          `aria-live`/`role="status"` of its own, so the loading→loaded
          transition below was invisible to assistive tech. This outer
          `aria-live="polite"` wrapper mirrors the exact pattern already
          established by `AssignBadgeLightbox`/`RevokeUsersModal`'s
          search-results regions — it stays mounted across both states so a
          screen reader observes the swap. */}
      <div aria-live="polite">
        {badgesQuery.isLoading ? <LoadingScreen /> : null}
        {/* `hidden` (not a conditional unmount) is deliberate: `BadgeSection`'s
            own auto-open transition detection (see its doc comment) compares
            the badge count across renders via a ref that's seeded on MOUNT.
            Unmounting the 3 sections while loading and mounting them fresh
            only once data arrives would seed that ref with the ALREADY-non-empty
            count, permanently missing the 0→N transition the public/private
            sections rely on to auto-open (verified: this literally broke that
            behavior when first tried — the sections stayed collapsed after
            load). Keeping them mounted throughout (hidden only visually/from
            the accessibility tree while loading) preserves the exact mount
            timing the existing, already-tested transition logic depends on. */}
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
