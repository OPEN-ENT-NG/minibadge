import { Alert, Button, Flex, LoadingScreen, Table } from '@edifice.io/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';

import { CreateBadgeTypeModal } from '~/components/CreateBadgeTypeModal';
import { EmptyBadgeList } from '~/components/EmptyBadgeList';
import { PeriodPicker, PeriodPickerValue } from '~/components/PeriodPicker';
import { RevokeUsersModal } from '~/components/RevokeUsersModal';
import { SortableTableHeader } from '~/components/SortableTableHeader';
import { UserSearchBar } from '~/components/UserSearchBar';
import { useMinibadgeAccessContext } from '~/routes/root/CharterGate/context';
import { useBadgesAssignedAll } from '~/services/queries/badgeAssigned';
import { defaultPeriod, formatDisplayDate, toBackendDate } from '~/utils/date';
import { getPictoSrc } from '~/utils/picto';

/**
 * "Administration" (`/admin`): a read-only, sortable/filterable audit table
 * of every badge ever assigned on the platform (not just "mine", unlike
 * `/badges-given`), plus the "Révoquer des utilisateurs" action. No per-row
 * revocation here — this is a pure audit view.
 *
 * Redirects to `/` when the `admin` right is absent. Every hook is still
 * called unconditionally above that redirect (hooks can't be conditional) —
 * only the JSX below it is gated.
 *
 * The results area is wrapped in `aria-live="polite"` since `LoadingScreen`
 * has no `aria-live`/`role="status"` of its own, so the loading→loaded
 * transition would otherwise be invisible to assistive tech.
 */

/**
 * SQL column names this endpoint accepts. Deliberately separate from
 * `routes/badges-given`'s own `SORT_COLUMNS`: that endpoint only joins one
 * user table (the badge owner, since the assignor is always "me"), while
 * this one joins two aliased user tables (assignor + receiver), so the
 * column names differ. Sending the wrong endpoint's constant here would
 * fall outside this endpoint's accepted sort keys and silently no-op the
 * sort.
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
  const [isCreateBadgeTypeModalOpen, setIsCreateBadgeTypeModalOpen] = useState(false);

  const { badgesAssignedAll, query: badgesAssignedAllQuery } = useBadgesAssignedAll({
    query: searchQuery.trim() || undefined,
    startDate: toBackendDate(period.startDate),
    endDate: toBackendDate(period.endDate),
    sortBy: sortColumn ? SORT_COLUMNS[sortColumn] : undefined,
    sortAsc: sortColumn ? isAsc : undefined,
  });

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
        {/* Primary (creation) before destructive (revocation), so the ordinary action is the
            first one reached by keyboard and the eye. */}
        <Button color="primary" variant="filled" onClick={() => setIsCreateBadgeTypeModalOpen(true)}>
          {t('minibadge.badge.type.create')}
        </Button>
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
                      <img src={getPictoSrc(badgeAssigned.badge.badgeType.pictureId)} alt="" />
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
      <CreateBadgeTypeModal
        isOpen={isCreateBadgeTypeModalOpen}
        onClose={() => setIsCreateBadgeTypeModalOpen(false)}
      />
    </div>
  );
};
