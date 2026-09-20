import { Alert, IconButton, LoadingScreen, Table } from '@edifice.io/react';
import { IconDelete } from '@edifice.io/react/icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyBadgeList } from '~/components/EmptyBadgeList';
import { PeriodPicker, PeriodPickerValue } from '~/components/PeriodPicker';
import { RevokeModal } from '~/components/RevokeModal';
import { SortableTableHeader } from '~/components/SortableTableHeader';
import { UserSearchBar } from '~/components/UserSearchBar';
import { BadgeAssigned } from '~/models/badgeAssigned';
import { useBadgesGiven, useRevokeBadgeAssigned } from '~/services/queries/badgeAssigned';
import { defaultPeriod, formatDisplayDate, toBackendDate } from '~/utils/date';

/**
 * Mirror of `badges-given.controller.ts` + `badge-given-array.ts`/`.html`:
 * "Badges donnés" — a sorted/filterable table of the badges the current user
 * has assigned to other people, with per-row revocation.
 *
 * - Endpoint: `GET /minibadge/assigned/given` (`useBadgesGiven`, Phase 1) —
 *   `query`/`startDate`/`endDate`/`sortBy`/`sortAsc`, confirmed identical to
 *   `badges-given.service.ts:23-42`.
 * - Default period: today minus 1 month → today
 *   (`badges-given.controller.ts:44-45`, `endDate = new Date(); startDate =
 *   moment().subtract('months', 1)`), sent as `DD-MM-YYYY`
 *   (`date.enum.ts`'s `DATE_FORMAT.DAY_MONTH_YEAR_MOMENT`). `PeriodPicker`
 *   (Phase 1) speaks the native `<input type="date">` ISO format
 *   (`YYYY-MM-DD`) instead, so `toBackendDate`/`toIsoDate` (extracted to
 *   `~/utils/date` in Phase 5, Task 1, since `routes/badges-admin` needs the
 *   exact same conversions) convert between the two — `PeriodPicker` itself
 *   is used as-is, unmodified.
 * - Right gating: DELIBERATELY none. Unlike `/admin` and `/statistics`
 *   (`main.ts:81-90`, guarded by `hasWorkflow(...)` before even calling
 *   `initInfos()`), the `badgeGiven` route action (`main.ts:75-80`) has no
 *   such guard, `BadgesGivenController` (`badges-given.controller.ts`) never
 *   checks any right before fetching, and the "Badges donnés" nav item
 *   (`navbar.html:12-16`) has no `ng-if` at all — unlike the admin/
 *   statistics items right below it (`navbar.html:17-28`, both
 *   `ng-if="vm.has...ViewRight()"`). So, DEVIATION FROM THE PLAN'S "MIRROR
 *   my-badges" NOTE: `my-badges` (Phase 2) gates its entire render on
 *   `useMinibadgeAccessContext().canReceive` because the real
 *   `MinibadgeController.getBadges()` does the exact same early return
 *   (`minibadge.controller.ts:72`) — but no equivalent guard exists anywhere
 *   in the real source for this screen, so adding one here would be
 *   inventing behavior, not porting it. This screen is reachable (and shows
 *   whatever the backend returns, typically empty) regardless of
 *   `canAssign`.
 * - Revocation reuses Phase 1's `RevokeModal` as-is — this is exactly the
 *   scenario it was built for (`/minibadge/revoked/given/:badgeId`,
 *   `badge-given-array.html:47-63`).
 * - After a confirmed revocation, `useRevokeBadgeAssigned`'s `onSuccess`
 *   invalidates the `['assigned']` query root, so the list is fully
 *   re-fetched — no optimistic update — mirroring
 *   `badges-given.controller.ts:65-71` (`revokeBadge` calls
 *   `initBadgeGiven()` again rather than patching local state).
 * - Row image: `/minibadge/public/img/${pictureId}` — a static asset served
 *   by the module itself, not a workspace document URL
 *   (`badge-given-array.html:29-31`). `pictureId` is optional
 *   (`BadgeType.pictureId?: string`), so the `<img>` is only rendered when
 *   it's actually present — otherwise the template literal would silently
 *   stringify to a broken `.../img/undefined` request.
 *
 * LOADING INDICATOR (post-migration improvement plan, Constat #1): before
 * this fix, `rows = badgesGiven ?? []` meant `EmptyBadgeList` rendered during
 * the initial fetch, indistinguishable from a genuine empty result.
 * `LoadingScreen` now replaces the results area only (period picker + search
 * bar stay visible/usable) while `badgesGivenQuery.isLoading` — same pattern
 * as `routes/my-badges`; see that file's doc comment for why `LoadingScreen`
 * (not the plan's guessed bare `Loading` component) is the actual
 * established pattern, verified against real component source and the
 * plan's own cited `~/EDIFICE/app/communities` sibling app.
 *
 * A11Y FIX (react-reviewer, MEDIUM): `LoadingScreen` itself has no
 * `aria-live`/`role="status"`, so the loading→loaded swap was invisible to
 * assistive tech. The results area's loading/empty/table ternary is wrapped
 * in `<div aria-live="polite">` below, mirroring the exact pattern already
 * established by `AssignBadgeLightbox`/`RevokeUsersModal`'s search-results
 * regions.
 */

/**
 * SQL column names the backend expects for `sortBy`.
 *
 * REVIEW FIX (react-reviewer, HIGH): the plan's `fr.json`-derived value for
 * the "owner" column (`minibadge.given.sort.owner.displayName` →
 * `"receiver_display_name"`) is wrong for THIS endpoint. Verified directly
 * against `DefaultBadgeAssignedService.java#getBadgesGivenRequest`:
 * `acceptedSort = [LABEL, CREATED_AT, REVOKED_AT, DISPLAY_NAME]` — i.e. the
 * SQL column is `display_name` (the single joined `us.display_name`, since
 * this query only ever joins one user — the badge owner/receiver).
 * `receiver_display_name` is a DIFFERENT constant, only accepted by the
 * sibling `getAllAssignedBadgesRequest` (used by the distinct `/assigned/all`
 * admin endpoint, which joins two aliased user tables). Sending
 * `receiver_display_name` here falls outside `acceptedSort`, so the backend
 * silently falls back to `ORDER BY id` — the AngularJS original has this
 * exact same bug (`fr.json`'s mapping is wrong there too), carried over
 * faithfully until caught here. Fixed to the value this endpoint actually
 * accepts.
 */
const SORT_COLUMNS = {
  label: 'label',
  owner: 'display_name',
  date: 'created_at',
  revoked: 'revoked_at',
} as const;

type SortColumnKey = keyof typeof SORT_COLUMNS;

export const BadgesGiven = () => {
  const { t } = useTranslation('minibadge');
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState<PeriodPickerValue>(defaultPeriod);
  const [sortColumn, setSortColumn] = useState<SortColumnKey>();
  const [isAsc, setIsAsc] = useState(true);
  const [badgeToRevoke, setBadgeToRevoke] = useState<BadgeAssigned>();

  const { badgesGiven, query: badgesGivenQuery } = useBadgesGiven({
    query: searchQuery.trim() || undefined,
    startDate: toBackendDate(period.startDate),
    endDate: toBackendDate(period.endDate),
    sortBy: sortColumn ? SORT_COLUMNS[sortColumn] : undefined,
    sortAsc: sortColumn ? isAsc : undefined,
  });
  const { mutate: revokeBadge } = useRevokeBadgeAssigned();

  const handleSort = (clicked: SortColumnKey) => {
    setIsAsc(clicked === sortColumn ? !isAsc : true);
    setSortColumn(clicked);
  };

  const handleConfirmRevoke = () => {
    if (!badgeToRevoke) return;
    revokeBadge(badgeToRevoke.id);
    setBadgeToRevoke(undefined);
  };

  const rows = badgesGiven ?? [];

  return (
    <div>
      {badgesGivenQuery.isError ? <Alert type="danger">{t('minibadge.error.get.badges')}</Alert> : null}

      <PeriodPicker value={period} onChange={setPeriod} />
      <UserSearchBar
        ariaLabel={t('minibadge.badge.given.search')}
        placeholder={t('minibadge.badge.given.search')}
        onSearch={setSearchQuery}
      />

      <div aria-live="polite">
        {badgesGivenQuery.isLoading ? (
          <LoadingScreen />
        ) : rows.length === 0 ? (
          <EmptyBadgeList />
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <SortableTableHeader<SortColumnKey>
                  label={t('minibadge.given.array.label')}
                  sortKey="label"
                  activeSortKey={sortColumn}
                  isAsc={isAsc}
                  onSort={handleSort}
                />
                <SortableTableHeader<SortColumnKey>
                  label={t('minibadge.given.array.owner')}
                  sortKey="owner"
                  activeSortKey={sortColumn}
                  isAsc={isAsc}
                  onSort={handleSort}
                />
                <SortableTableHeader<SortColumnKey>
                  label={t('minibadge.given.array.date')}
                  sortKey="date"
                  activeSortKey={sortColumn}
                  isAsc={isAsc}
                  onSort={handleSort}
                />
                <SortableTableHeader<SortColumnKey>
                  label={t('minibadge.given.array.revoked')}
                  sortKey="revoked"
                  activeSortKey={sortColumn}
                  isAsc={isAsc}
                  onSort={handleSort}
                />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((badgeGiven) => (
                <Table.Tr key={badgeGiven.id}>
                  <Table.Td>
                    {badgeGiven.badge.badgeType.pictureId ? (
                      <img src={`/minibadge/public/img/${badgeGiven.badge.badgeType.pictureId}`} alt="" />
                    ) : null}
                    {badgeGiven.badge.badgeType.label}
                  </Table.Td>
                  <Table.Td>{badgeGiven.badge.owner?.displayName}</Table.Td>
                  <Table.Td>{formatDisplayDate(badgeGiven.createdAt)}</Table.Td>
                  <Table.Td>
                    {badgeGiven.revokedAt ? (
                      <span>{t('minibadge.revoked')}</span>
                    ) : (
                      <IconButton
                        icon={<IconDelete />}
                        aria-label={t('minibadge.revoke')}
                        color="danger"
                        variant="ghost"
                        onClick={() => setBadgeToRevoke(badgeGiven)}
                      />
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </div>

      <RevokeModal
        isOpen={!!badgeToRevoke}
        onCancel={() => setBadgeToRevoke(undefined)}
        onConfirm={handleConfirmRevoke}
      />
    </div>
  );
};
