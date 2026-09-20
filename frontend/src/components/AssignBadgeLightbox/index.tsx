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
import { isMatchingAnyRelation } from '~/utils/relation';
import { areThresholdsOutmoded, areThresholdsReached, assignableNumbersLabel } from '~/utils/threshold';

/**
 * Mirrors `badge-assign.sniplet.ts` + `sniplet-badge-assign.html` — the ONE
 * assign lightbox shared between the badge-types library screen (footer
 * "Décerner" on each `BadgeCard`) and the detail screen's "Décerner" action
 * button (`badge-type.controller.ts#onOpenAssignModal`), both of which just
 * call the equivalent of `snipletBadgeAssignService.sendBadgeType(badgeType)`
 * to open the SAME lightbox instance — built once here, per the plan.
 *
 * GOTCHA (plan Task 3, verified against the installed `@edifice.io/react`
 * types rather than guessed): the assignor's ENT Core "profile" needed by
 * `isMatchingAnyRelation` is NOT `useUser()`'s `user.type` (an internal ENT
 * Core code — `'ENSEIGNANT' | 'ELEVE' | 'PERSRELELEVE' | 'SUPERADMIN' |
 * 'PERSEDUCNAT'`, verified in `@edifice.io/client`'s `IUserInfo.type` — a
 * completely different string domain from `MinibadgeUser.profile`). The
 * correct field is `useEdificeClient().userProfile` (verified in
 * `EdificeClientProvider.context.d.ts`: `userProfile: UserProfile | undefined`,
 * the exact same `UserProfile = Array<'Student' | 'Teacher' | 'Relative' |
 * 'Personnel' | 'Guest'>` type backing `ISession.profile` — the same string
 * domain the backend's `typeValue`/`MinibadgeUser.profile` use). It comes
 * from `getSession()`'s `getUserProfile()` call (`GET /userbook/api/person`),
 * already covered by the app's default MSW fixtures, so no new mock wiring
 * was needed to make this resolve in tests.
 *
 * SUCCESS TOAST (post-migration improvement plan, Constat #2, confirmed gap
 * #1): the original `notify.success('minibadge.success.assign')`
 * (`badge-type.controller.ts:121`, and identically `badge-assign.sniplet.ts:154`
 * for the standalone sniplet variant of this same lightbox) had no React
 * equivalent — `handleAssign`'s success path used to just close the modal
 * silently. `useToast().success(...)` now fires it; no extra setup needed
 * since `Layout` (mounted once in `routes/root/index.tsx`) already renders
 * its own `<Toaster/>` internally (verified in
 * `node_modules/@edifice.io/react/dist/components/Layout/Layout.js`).
 *
 * CAVEAT for the standalone sniplet (`~/sniplet/BadgeAssignSniplet.tsx`),
 * which renders this SAME component but deliberately does NOT mount `Layout`
 * (see that file's own doc comment — only framework-agnostic pieces are
 * ported into that bundle): `react-hot-toast`'s `toast()` calls are a global
 * store with no built-in renderer of their own — visible feedback requires
 * SOME `<Toaster/>` mounted anywhere in the page, not necessarily an
 * ancestor of the caller. Whether the sniplet's success toast is actually
 * visible therefore depends on the HOST PORTAL page already mounting one
 * (plausible if that page uses `@edifice.io/react`'s `Layout` elsewhere, as
 * most Entcore portal pages do) — not something addable here without adding
 * a direct `react-hot-toast` dependency (currently only a transitive one of
 * `@edifice.io/react`, not hoisted — verified: no `node_modules/react-hot-toast`
 * at the app's top level, only inside `node_modules/.pnpm`), which would be
 * scope creep beyond this plan. Same class of "confirm against a real portal
 * page" assumption the sniplet's own top-of-file comment already flags for
 * CSS loading.
 *
 * TRACKED ASSUMPTION (react-reviewer, LOW/MEDIUM — added to the sniplet's own
 * tracked-assumptions list, `~/sniplet/main.tsx`'s `resolveHost`/`init()`
 * comments, so this doesn't get lost alongside the `controller.init()`
 * DOM-binding assumption and the "host page already has design-system CSS"
 * assumption): if the real recette portal page does NOT already mount a
 * `<Toaster/>` anywhere, this success toast fails COMPLETELY SILENTLY —
 * `toastSuccess(...)` still runs, the assignment itself still succeeds
 * server-side, but the user gets zero visible confirmation, with no error and
 * no console warning to signal the gap (unlike `resolveHost`'s fallback,
 * which at least `console.warn`s). MUST be verified against a real recette
 * portal page before this is trusted in production for the sniplet path.
 */
export interface AssignBadgeLightboxProps {
  badgeType: BadgeType | undefined;
  isOpen: boolean;
  onClose: () => void;
  /** Extra invalidation the caller wants on top of `useAssignBadge`'s own
   * (`['assigned']`/`['badges']`/`['badgeTypes']`) — e.g. the detail screen
   * also needs `['badgeType', typeId]` and `['badgeTypeAssigners', typeId]`
   * refreshed (`badge-type.controller.ts#refreshBadgeTypeData`). Those two
   * query-key roots are singular (`'badgeType'`/`'badgeTypeAssigners'`), not
   * prefixes of the plural `'badgeTypes'` root `useAssignBadge` invalidates
   * (`services/queries/badgeAssigned.ts`), so React Query's prefix-matching
   * `invalidateQueries` never reaches them from inside that shared hook —
   * hence this separate, per-caller escape hatch instead of changing
   * `useAssignBadge` itself. */
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
  // Fix 4 (react-reviewer, MEDIUM): `UserSearchBar` used to be remounted via
  // `key={selectedUsers.length}`, which cleared its search text both on
  // SELECTING a user (intended, mirrors `onSelectUser`'s
  // `this.searchQuery = ''`) and on REMOVING a previously-selected one via
  // the trash icon (NOT intended — the original AngularJS `removeUser`
  // never touches search text, and removal also changes
  // `selectedUsers.length`). A dedicated token, bumped only inside
  // `handleSelect`, decouples the remount from the selection count.
  const [searchBarResetToken, setSearchBarResetToken] = useState(0);

  const typeId = badgeType?.id ?? 0;
  const trimmedQuery = searchQuery.trim();
  const { users: searchResults, query: searchUsersQuery } = useSearchUsersForType(
    typeId,
    trimmedQuery || undefined,
  );
  const { globalSettings } = useGlobalSettings();
  const { mutate: assignBadge, isPending, isError } = useAssignBadge();

  // Mirrors `closeLightbox()` resetting `searchQuery`/`userSearchResults`/
  // `userSelected` — reset whenever the lightbox closes so the next open
  // (possibly for a different badge type) starts clean.
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
  // Mirrors `onSearchUser`'s `.filter((user) => !this.isUserSelected(user))`.
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
  const isSubmitDisabled =
    selectedUsers.length === 0 || isThresholdBlocked || isRelationBlocked || isPending || !badgeType;

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
        <h3 className="h6 mb-8">{t('minibadge.choose.users.to.assign')}</h3>
        {/* `UserSearchBar` (Phase 1) is uncontrolled internally (no `value`
            prop — see its own doc comment), so remounting it via `key` is
            how its visible text is cleared, mirroring `onSelectUser`'s
            `this.searchQuery = ''`. Keyed on `searchBarResetToken` (bumped
            only in `handleSelect`) rather than `selectedUsers.length`, so
            removing a user via the trash icon below does NOT also clear
            whatever the user is currently typing (see the token's own doc
            comment above). */}
        <UserSearchBar
          key={searchBarResetToken}
          ariaLabel={t('minibadge.search')}
          placeholder={t('minibadge.search')}
          onSearch={setSearchQuery}
        />
        {searchUsersQuery.isError ? <Alert type="danger">{t('minibadge.error.search.users')}</Alert> : null}
        {/* Fix 3 (react-reviewer, MEDIUM): previously this list rendered only
            on a non-empty match, leaving a screen-reader user with total
            silence while a search is in flight or matches nothing. Wrapping
            the results area in a polite live region and adding an explicit
            "no results" message announces both. `minibadge.no.result` is
            reused rather than inventing a new key (per this phase's "no new
            i18n keys" constraint) — it's the exact key the original
            AngularJS user-search list already uses for this same case
            (`ts/directives/search/search-results/search-results.html:16`). */}
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
        {/* The real `minibadge-selected-list` directive gives the remove icon
            NO accessible label at all (`<i class="close" ng-click="...">`,
            `selected-list.html:3`) — a plain hardcoded string (not an i18n
            key: the plan's "no new i18n key" constraint is about the
            translation bundles, not about improving on a total a11y gap the
            source never addressed) naming the specific person is strictly
            better a11y and, unlike reusing an unrelated existing key (e.g.
            "minibadge.cancel", already the footer's own button label), it
            stays unambiguous per row. */}
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
