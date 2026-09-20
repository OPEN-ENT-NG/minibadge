import { Alert, Button, Flex, LoadingScreen, Table } from '@edifice.io/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';

import { EmptyBadgeList } from '~/components/EmptyBadgeList';
import { PeriodPicker, PeriodPickerValue } from '~/components/PeriodPicker';
import { RevokeUsersModal } from '~/components/RevokeUsersModal';
import { SortableTableHeader } from '~/components/SortableTableHeader';
import { UserSearchBar } from '~/components/UserSearchBar';
import { useMinibadgeAccessContext } from '~/routes/root/CharterGate/context';
import { useBadgesAssignedAll } from '~/services/queries/badgeAssigned';
import { defaultPeriod, formatDisplayDate, toBackendDate } from '~/utils/date';

/**
 * Mirror of `admin.controller.ts` + `admin.html` + `all-badges-array.ts`/`.html`:
 * "Administration" (`/admin`) — a read-only, sortable/filterable audit table
 * of EVERY badge ever assigned on the platform (not just "mine", unlike
 * `/badges-given`), plus the "Révoquer des utilisateurs" action.
 *
 * - Endpoint: `GET /minibadge/assigned/all` (`useBadgesAssignedAll`, Phase 1) —
 *   same 5 params as `/assigned/given` (`query`/`startDate`/`endDate`/
 *   `sortBy`/`sortAsc`), confirmed in `BadgeAssignedController.java#getAll`.
 * - Right gating: unlike `/badges-given` (deliberately ungated), this route
 *   redirects to `/` immediately when the `admin` workflow right is absent —
 *   mirrors `main.ts:81-89`'s `if (!model.me.hasWorkflow(rights.workflow.admin))
 *   this.$location.path('/')`, not just a hidden nav item. `isAdmin` is read
 *   from `CharterGate`'s already-resolved context (same pattern as
 *   `canAssign`/`canReceive` elsewhere), not re-fetched here. Every hook is
 *   called unconditionally ABOVE the redirect (mirrors `CharterGate`'s own
 *   `if (isLoading) return <LoadingScreen />` placement, after all its
 *   hooks) — only the JSX below it is conditional.
 * - Default period: today minus 1 month → today, identical to `/badges-given`
 *   (`admin.controller.ts:70-71`) — reuses `~/utils/date`'s helpers (Task 1)
 *   instead of redefining them.
 * - 4 sortable columns — label / assignor / owner(receiver) / date — NO
 *   per-row revocation action (`all-badges-array.html` has none; this is a
 *   pure audit view, unlike `/badges-given`'s trash icon).
 * - Row image: same `/minibadge/public/img/${pictureId}` static asset,
 *   optional exactly like `/badges-given`.
 *
 * LOADING INDICATOR (post-migration improvement plan, Constat #1 — REVIEW FIX,
 * react-reviewer, HIGH): this screen had the exact same bug already fixed in
 * `my-badges`/`badges-given`/`statistics` — `rows = badgesAssignedAll ?? []`
 * fed straight into the empty-state check, so `EmptyBadgeList` rendered
 * during the initial fetch too, indistinguishable from a genuine empty
 * result. Fixed identically to `routes/badges-given` (same shape of screen —
 * persistent period picker/search bar/"Révoquer" button shell, single
 * results area swapping between loading/empty/table): `LoadingScreen` now
 * gates `badgesAssignedAllQuery.isLoading` ahead of the empty/table check.
 *
 * A11Y FIX (react-reviewer, MEDIUM, applies to all 4 screens with a
 * `LoadingScreen`): `LoadingScreen` itself has no `aria-live`/`role="status"`,
 * so the loading→loaded transition was invisible to assistive tech. The
 * results area is wrapped in `<div aria-live="polite">`, mirroring the exact
 * pattern already established by `AssignBadgeLightbox`/`RevokeUsersModal`'s
 * search-results regions.
 */

/**
 * SQL column names THIS endpoint accepts — verified against
 * `DefaultBadgeAssignedService.java#getAllAssignedBadgesRequest`'s
 * `acceptedSort = [LABEL, CREATED_AT, REVOKED_AT, RECEIVER_DISPLAY_NAME,
 * ASSIGNOR_DISPLAY_NAME]`. Deliberately a SEPARATE mapping from
 * `routes/badges-given`'s `SORT_COLUMNS` (`display_name`, singular): that
 * endpoint only ever joins one user table (badge owner/receiver, since the
 * assignor is always "me"), whereas `/assigned/all` joins two aliased user
 * tables (assignor + receiver), so it has two distinct, differently-named
 * columns instead of one. Sending the wrong endpoint's constant here would
 * fall outside THIS endpoint's `acceptedSort` and silently no-op the sort.
 */
const SORT_COLUMNS = {
  label: 'label',
  assignor: 'assignor_display_name',
  owner: 'receiver_display_name',
  date: 'created_at',
} as const;

type SortColumnKey = keyof typeof SORT_COLUMNS;

export const BadgesAdmin = () => {
  const { t } = useTranslation('minibadge');
  const { isAdmin } = useMinibadgeAccessContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState<PeriodPickerValue>(defaultPeriod);
  const [sortColumn, setSortColumn] = useState<SortColumnKey>();
  const [isAsc, setIsAsc] = useState(true);
  const [isRevokeUsersModalOpen, setIsRevokeUsersModalOpen] = useState(false);

  const { badgesAssignedAll, query: badgesAssignedAllQuery } = useBadgesAssignedAll({
    query: searchQuery.trim() || undefined,
    startDate: toBackendDate(period.startDate),
    endDate: toBackendDate(period.endDate),
    sortBy: sortColumn ? SORT_COLUMNS[sortColumn] : undefined,
    sortAsc: sortColumn ? isAsc : undefined,
  });

  // Mirrors `main.ts:82`'s immediate `$location.path('/')` redirect when the
  // `admin` right is absent.
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleSort = (clicked: SortColumnKey) => {
    setIsAsc(clicked === sortColumn ? !isAsc : true);
    setSortColumn(clicked);
  };

  const rows = badgesAssignedAll ?? [];

  return (
    <div>
      {badgesAssignedAllQuery.isError ? <Alert type="danger">{t('minibadge.error.get.badges')}</Alert> : null}

      {/* Padded gray box matches communities' `SearchBarCommunities`. Row on
          desktop (`flex-md-row`), stacked on mobile (`direction="column"`
          is the base/mobile-first value) so `PeriodPicker`, the search bar
          and the revoke button each get the full width instead of being
          squeezed into an overflowing single row below `md`. `align="stretch"`
          is the mobile-first value for the same reason (full-width stacked
          controls); `align-items-md-end` restores the desktop-only bottom
          alignment below. Kept on a single row at `md`+ (`nowrap`): the
          search bar grows to fill the remaining space (`flex-fill`) between
          the two fixed-width controls on either side of it. */}
      {/* `align-items-md-end`, not `"center"`: `PeriodPicker`'s label sits
          above its inputs, making it taller than the label-less search bar —
          centering by overall height would misalign the actual input
          fields. Aligning to the end (bottom) levels the two input rows. */}
      <Flex
        direction="column"
        align="stretch"
        wrap="nowrap"
        gap="16"
        className="p-24 bg-gray-200 mb-16 flex-md-row align-items-md-end"
      >
        <PeriodPicker value={period} onChange={setPeriod} />
        <UserSearchBar
          ariaLabel={t('minibadge.badge.given.search')}
          placeholder={t('minibadge.badge.given.search')}
          onSearch={setSearchQuery}
          className="flex-fill"
        />
        <Button color="danger" variant="filled" onClick={() => setIsRevokeUsersModalOpen(true)}>
          {t('minibadge.revoke.users.modal.title')}
        </Button>
      </Flex>

      <div aria-live="polite">
        {badgesAssignedAllQuery.isLoading ? (
          <LoadingScreen />
        ) : rows.length === 0 ? (
          <EmptyBadgeList title={t('minibadge.no.result')} />
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
                  label={t('minibadge.badges.assigned.by')}
                  sortKey="assignor"
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
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((badgeAssigned) => (
                <Table.Tr key={badgeAssigned.id}>
                  <Table.Td>
                    {badgeAssigned.badge.badgeType.pictureId ? (
                      <img src={`/minibadge/public/img/${badgeAssigned.badge.badgeType.pictureId}`} alt="" />
                    ) : null}
                    {badgeAssigned.badge.badgeType.label}
                  </Table.Td>
                  <Table.Td>{badgeAssigned.assignorDisplayName}</Table.Td>
                  <Table.Td>{badgeAssigned.badge.owner?.displayName}</Table.Td>
                  <Table.Td>{formatDisplayDate(badgeAssigned.createdAt)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </div>

      <RevokeUsersModal isOpen={isRevokeUsersModalOpen} onClose={() => setIsRevokeUsersModalOpen(false)} />
    </div>
  );
};
