import { Alert, Flex, IconButton, LoadingScreen, Table } from '@edifice.io/react';
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
 * "Badges donnés": a sorted/filterable table of the badges the current user
 * has assigned to other people, with per-row revocation.
 *
 * Deliberately has no right gating, unlike `/admin` and `/statistics` — it's
 * reachable (and shows whatever the backend returns, typically empty)
 * regardless of `canAssign`.
 *
 * A confirmed revocation invalidates the `['assigned']` query root and
 * re-fetches the whole list rather than patching local state.
 *
 * `pictureId` is optional, so the `<img>` is only rendered when it's
 * actually present — otherwise the URL would resolve to a broken
 * `.../img/undefined`.
 *
 * The results area is wrapped in `aria-live="polite"` since `LoadingScreen`
 * has no `aria-live`/`role="status"` of its own, so the loading→loaded
 * transition would otherwise be invisible to assistive tech.
 */

/**
 * SQL column names the backend expects for `sortBy`. The "owner" column is
 * `display_name` here (this query only joins one user — the badge
 * owner/receiver) — NOT `receiver_display_name`, a different constant only
 * accepted by the separate `/assigned/all` admin endpoint
 * (`routes/badges-admin`'s own `SORT_COLUMNS`, which joins two aliased user
 * tables). Sending the wrong one falls outside this endpoint's accepted
 * sort keys and the backend silently falls back to `ORDER BY id`.
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

      {/* Padded gray box matches communities' `SearchBarCommunities`. Row on
          desktop (`flex-md-row`), stacked on mobile (`direction="column"`
          is the base/mobile-first value) so `PeriodPicker` and the search bar
          each get the full width instead of being squeezed into an
          overflowing single row below `md`. `align="stretch"` is the
          mobile-first value for the same reason (full-width stacked
          controls); `align-items-md-end` restores the desktop-only bottom
          alignment below. Kept on a single row at `md`+ (`nowrap`): the
          search bar grows to fill the remaining space (`flex-fill`) next to
          the period picker. */}
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
      </Flex>

      <div aria-live="polite">
        {badgesGivenQuery.isLoading ? (
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
