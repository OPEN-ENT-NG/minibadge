import { Alert, Avatar, Flex, Grid, Heading, LoadingScreen, SegmentedControl } from '@edifice.io/react';
import { IconCheck, IconHandMove, IconUser, IconUsers } from '@edifice.io/react/icons';
import { IconMinibadge } from '@edifice.io/react/icons/apps';
import { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';

import { BadgeChart } from '~/components/BadgeChart';
import { StatisticsCard } from '~/components/StatisticsCard';
import { BadgeType } from '~/models/badgeType';
import { MinibadgeStructure } from '~/models/statistics';
import { MinibadgeUser } from '~/models/user';
import { useMinibadgeAccessContext } from '~/routes/root/CharterGate/context';
import { useStatistics } from '~/services/queries/statistics';
import { toIsoDate } from '~/utils/date';
import { formatMessage } from '~/utils/translate';

/**
 * "Statistiques" (`/statistics`) — usage statistics for the module
 * (participation, most/least assigned/refused badge types, most active
 * users/structures), filterable by a sliding period.
 *
 * - Right gating: `isStatisticsView` redirects to `/` when absent — every
 *   hook is called unconditionally above the redirect, only the JSX is
 *   conditional. `isStatisticsViewAllStructures` gates extra sections/columns
 *   INSIDE this already-accessible screen only (never the route itself) —
 *   the "établissements les plus actifs" block and the structure-name column
 *   in the user grids below.
 * - Period (`selectedPeriod`, default `'all'`): changing it recomputes
 *   `minDate` and re-queries `useStatistics` from scratch (no partial merge).
 *   `'all'` sends no `minDate` at all.
 * - Type toggle (`selectedType`, default `'badges'`): purely local — toggles
 *   which already-loaded fields are displayed, no server call.
 * - The "Par type" panel is entirely absent when the user has no type data
 *   at all — unlike the "Participation" panel above it, which is always
 *   rendered regardless of data.
 * - GOTCHA: the "less assigned" card's title shows whenever
 *   `lessAssignedTypes.length`, but the bar chart inside it only renders
 *   when `lessAssignedTypes.length > 1` — with exactly 1 element the card is
 *   visible with an empty body. Intentional, not a bug to fix.
 *
 * This screen's period/type radios are meaningless without `statistics`
 * already loaded once, so `LoadingScreen` replaces the entire screen while
 * `query.isLoading` (placed after the `isStatisticsView` redirect; every
 * hook above it is still called unconditionally).
 *
 * `LoadingScreen` itself has no `aria-live`/`role="status"`, so its
 * appearance/disappearance would otherwise be invisible to assistive tech —
 * since this screen swaps its entire return value on `query.isLoading`
 * (no shared persistent element to hang `aria-busy` on), the loading return
 * is wrapped in its own `<div aria-live="polite">` instead.
 */

type PeriodOption = 'all' | '30days' | '7days';
type TypeOption = 'badges' | 'users';

const minDateForPeriod = (period: PeriodOption): string | undefined => {
  if (period === 'all') return undefined;
  const days = period === '30days' ? 30 : 7;
  const date = new Date();
  date.setDate(date.getDate() - days);
  // `toIsoDate` uses the local calendar day (`getFullYear`/`getMonth`/
  // `getDate`), not UTC — this is the convention used consistently for every
  // other period computation in this app (`defaultPeriod` in `~/utils/date`),
  // so this call site stays local too rather than becoming the odd one out.
  return toIsoDate(date);
};

const getUserDisplayName = (user: MinibadgeUser): string =>
  user.displayName || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();

const getUserStructureName = (user: MinibadgeUser): string =>
  user.structureNames && user.structureNames.length ? user.structureNames[0] : '';

/** The option/participant labels are deliberately lower-cased here. */
const displayStructureDistinction = (t: TFunction, structure: MinibadgeStructure): string => {
  const optionsLabel = t('minibadge.badges.option').toLowerCase();
  const baseText = `${(structure.countAssigned ?? 0).toLocaleString()} ${optionsLabel}`;
  const participantsLabel = t('minibadge.participants').toLowerCase();
  const participantsText = `${(structure.countActiveUsers ?? 0).toLocaleString()} ${participantsLabel}`;
  return `${baseText} - ${participantsText}`;
};

const badgeTypeChartSeries = (t: TFunction, types: BadgeType[]) => [
  { name: t('minibadge.number'), data: types.map((type) => type.countAssigned ?? 0) },
];

const badgeTypeChartCategories = (types: BadgeType[]): string[] => types.map((type) => type.label);

/**
 * Textual equivalent of the "most"/"less assigned" bar charts' data
 * (`BadgeChart`'s `accessibleItems`), for assistive tech — same source
 * array, same order as `badgeTypeChartSeries`/`badgeTypeChartCategories`, so
 * every bar the chart draws also has a corresponding text item, including
 * everything past the 3 the compact cards on the same screen show.
 */
const badgeTypeAccessibleItems = (t: TFunction, types: BadgeType[]) =>
  types.map((type) => ({
    label: type.label,
    value: formatMessage(t, 'minibadge.statistics.assigned.times', [
      (type.countAssigned ?? 0).toLocaleString(),
    ]),
  }));

export const Statistics = () => {
  const { t } = useTranslation('minibadge');
  const { isStatisticsView, isStatisticsViewAllStructures } = useMinibadgeAccessContext();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('all');
  const [selectedType, setSelectedType] = useState<TypeOption>('badges');

  const { statistics, query } = useStatistics(minDateForPeriod(selectedPeriod));

  // Every hook above this line is called unconditionally first.
  if (!isStatisticsView) {
    return <Navigate to="/" replace />;
  }

  if (query.isLoading) {
    return (
      <div aria-live="polite">
        <LoadingScreen />
      </div>
    );
  }

  const mostAssignedTypes = statistics?.mostAssignedTypes ?? [];
  const lessAssignedTypes = statistics?.lessAssignedTypes ?? [];
  const mostRefusedTypes = statistics?.mostRefusedTypes ?? [];
  const mostAssigningStructures = statistics?.mostAssigningStructures ?? [];
  const topAssigningUsers = statistics?.topAssigningUsers ?? [];
  const topReceivingUsers = statistics?.topReceivingUsers ?? [];

  const firstMostAssignedType = mostAssignedTypes[0];
  const otherMostAssignedTypes = mostAssignedTypes.length > 1 ? mostAssignedTypes.slice(1, 3) : [];

  const showTypesPanel = mostAssignedTypes.length > 0 || mostRefusedTypes.length > 0;
  const showStructuresBlock = isStatisticsViewAllStructures && mostAssigningStructures.length > 0;

  return (
    <div>
      {query.isError ? <Alert type="danger">{t('minibadge.error.get.statistics')}</Alert> : null}

      <section className="mb-16">
        {/* Padded gray box matches the search-bar screens
            (`SearchBarCommunities` style). `SegmentedControl` (Ant Design
            under the hood, per `@edifice.io/react`) replaces the vertical
            radio list with a single-row group of selectable buttons. */}
        <div className="p-24 bg-gray-200 mb-16">
          <Heading level="h2" headingStyle="h3" id="minibadge-statistics-period-heading" className="mb-8">
            {t('minibadge.filter.stats.per.period')}
          </Heading>
          {/* Ant Design's `Segmented` (behind `SegmentedControl`) never wraps
              its options onto multiple lines and never shrinks below its
              content width — with 3 options this overflows past the
              viewport on narrow phones, dragging the whole page into
              horizontal scroll. `overflow-auto` contains that scroll to
              just this widget, same pattern as wrapping a too-wide table. */}
          <div className="overflow-auto">
            <SegmentedControl
              aria-labelledby="minibadge-statistics-period-heading"
              value={selectedPeriod}
              onChange={(value) => setSelectedPeriod(value as PeriodOption)}
              options={[
                { value: 'all', label: t('minibadge.filter.stats.complete.history') },
                { value: '30days', label: t('minibadge.filter.stats.last.thirty.days') },
                { value: '7days', label: t('minibadge.filter.stats.last.seven.days') },
              ]}
            />
          </div>
        </div>

        {/* Section heading, like "Filtrer par période"/"Filtrer par type"
            above — moved OUT of the card (it used to be `StatisticsCard`'s
            own icon+label row, small and boxed-in) so it reads as a real
            section title over its own two cards below. */}
        <Heading level="h2" headingStyle="h3" className="mb-8">
          {t('minibadge.statistics.participation')}
        </Heading>
        <Grid className="mb-16">
          <Grid.Col sm="4" md="4" lg="6" xl="6">
            <StatisticsCard
              centered
              className="bg-blue-200 text-center"
              icon={<IconMinibadge width={32} height={32} />}
              label={formatMessage(t, 'minibadge.statistics.badges.assigned', [(statistics?.countBadgeAssigned ?? 0).toLocaleString()])}
            >
              {null}
            </StatisticsCard>
          </Grid.Col>
          <Grid.Col sm="4" md="4" lg="6" xl="6">
            <StatisticsCard
              centered
              className="bg-green-200 text-center"
              icon={<IconUser width={32} height={32} />}
              label={formatMessage(t, 'minibadge.active.users', [(statistics?.countActiveUsers ?? 0).toLocaleString()])}
            >
              {null}
            </StatisticsCard>
          </Grid.Col>
        </Grid>

        <Grid>
          {showStructuresBlock ? (
            <Grid.Col sm="4" md="4" lg="6" xl="6">
              <StatisticsCard icon={<IconUsers />} label={t('minibadge.statistics.most.active.structures')}>
                <p>{formatMessage(t, 'minibadge.statistics.top', [mostAssigningStructures.length])}</p>
                <ol>
                  {mostAssigningStructures.map((structure) => (
                    <li key={structure.id}>
                      {structure.name} — {displayStructureDistinction(t, structure)}
                    </li>
                  ))}
                </ol>
              </StatisticsCard>
            </Grid.Col>
          ) : null}
        </Grid>
      </section>

      {showTypesPanel ? (
        <section>
          <div className="p-24 bg-gray-200 mb-16">
            <Heading level="h2" headingStyle="h3" id="minibadge-statistics-type-heading" className="mb-8">
              {t('minibadge.filter.stats.per.type')}
            </Heading>
            {/* Same overflow fix as the period filter above. */}
            <div className="overflow-auto">
              <SegmentedControl
                aria-labelledby="minibadge-statistics-type-heading"
                value={selectedType}
                onChange={(value) => setSelectedType(value as TypeOption)}
                options={[
                  { value: 'badges', label: t('minibadge.badges.option') },
                  { value: 'users', label: t('minibadge.users.option') },
                ]}
              />
            </div>
          </div>

          {selectedType === 'badges' ? (
            <div>
              <p className="mb-8">{t('minibadge.statistics.badges')}</p>
              <Grid className="mb-16">
                {mostAssignedTypes.length > 0 && firstMostAssignedType ? (
                  <Grid.Col sm="4" md="4" lg="6" xl="6">
                    <StatisticsCard
                      icon={<IconCheck />}
                      label={formatMessage(t, 'minibadge.statistics.most.allowed.badges', [
                        Math.min(3, mostAssignedTypes.length),
                      ])}
                    >
                      <Flex direction="column" gap="16">
                        <Flex align="center" gap="8">
                          {firstMostAssignedType.pictureId ? (
                            <img src={`/minibadge/public/img/${firstMostAssignedType.pictureId}`} alt="" />
                          ) : null}
                          <span>{firstMostAssignedType.label}</span>
                        </Flex>
                        <div>
                          <p>
                            {formatMessage(t, 'minibadge.statistics.assigned.times', [
                              (firstMostAssignedType.countAssigned ?? 0).toLocaleString(),
                            ])}
                          </p>
                          {firstMostAssignedType.mostAssigningUsers?.length ? (
                            <>
                              <p>
                                {formatMessage(t, 'minibadge.statistics.top', [
                                  firstMostAssignedType.mostAssigningUsers.length,
                                ])}
                              </p>
                              <ul>
                                {firstMostAssignedType.mostAssigningUsers.map((user) => (
                                  <li key={user.id}>
                                    {getUserDisplayName(user)} — {(user.countAssigned ?? 0).toLocaleString()}
                                  </li>
                                ))}
                              </ul>
                            </>
                          ) : null}
                        </div>
                        {otherMostAssignedTypes.length > 0 ? (
                          <Grid>
                            {otherMostAssignedTypes.map((type) => (
                              <Grid.Col sm="4" md="4" lg="6" xl="6" key={type.id}>
                                <Flex direction="column" align="center" gap="8" className="text-center">
                                  {type.pictureId ? (
                                    <img src={`/minibadge/public/img/${type.pictureId}`} alt="" />
                                  ) : null}
                                  <span>{type.label}</span>
                                  <span>
                                    {formatMessage(t, 'minibadge.statistics.assigned.times', [
                                      (type.countAssigned ?? 0).toLocaleString(),
                                    ])}
                                  </span>
                                </Flex>
                              </Grid.Col>
                            ))}
                          </Grid>
                        ) : null}
                      </Flex>
                    </StatisticsCard>
                  </Grid.Col>
                ) : null}

                {mostRefusedTypes.length > 0 ? (
                  <Grid.Col sm="4" md="4" lg="6" xl="6">
                    <StatisticsCard
                      label={formatMessage(t, 'minibadge.statistics.most.refused.badges', [mostRefusedTypes.length])}
                    >
                      <Grid>
                        {mostRefusedTypes.map((type) => (
                          <Grid.Col sm="4" md="4" lg="6" xl="6" key={type.id}>
                            <Flex direction="column" align="center" gap="8" className="text-center">
                              {type.pictureId ? <img src={`/minibadge/public/img/${type.pictureId}`} alt="" /> : null}
                              <p className="mb-0">{type.label}</p>
                              <p className="mb-0">
                                {formatMessage(t, 'minibadge.statistics.refused.times', [type.countRefused ?? 0])}
                              </p>
                            </Flex>
                          </Grid.Col>
                        ))}
                      </Grid>
                    </StatisticsCard>
                  </Grid.Col>
                ) : null}
              </Grid>

              <Flex direction="column" gap="16">
                {mostAssignedTypes.length > 0 ? (
                  <StatisticsCard
                    label={formatMessage(t, 'minibadge.statistics.most.allowed.badges', [mostAssignedTypes.length])}
                  >
                    <BadgeChart
                      className="minibadge-chart-most-assigned"
                      type="bar"
                      series={badgeTypeChartSeries(t, mostAssignedTypes)}
                      categories={badgeTypeChartCategories(mostAssignedTypes)}
                      accessibleItems={badgeTypeAccessibleItems(t, mostAssignedTypes)}
                    />
                  </StatisticsCard>
                ) : null}

                {lessAssignedTypes.length > 0 ? (
                  <StatisticsCard
                    label={formatMessage(t, 'minibadge.statistics.less.allowed.badges', [lessAssignedTypes.length])}
                  >
                    {/* The graph is intentionally only rendered above a
                        strict length of 1 — see the class doc comment. */}
                    {lessAssignedTypes.length > 1 ? (
                      <BadgeChart
                        className="minibadge-chart-less-assigned"
                        type="bar"
                        series={badgeTypeChartSeries(t, lessAssignedTypes)}
                        categories={badgeTypeChartCategories(lessAssignedTypes)}
                        accessibleItems={badgeTypeAccessibleItems(t, lessAssignedTypes)}
                      />
                    ) : null}
                  </StatisticsCard>
                ) : null}
              </Flex>
            </div>
          ) : (
            <div>
              <p className="mb-8">{t('minibadge.users')}</p>
              <Grid>
                {topAssigningUsers.length > 0 ? (
                  <Grid.Col sm="4" md="4" lg="6" xl="6">
                    <StatisticsCard
                      icon={<IconHandMove />}
                      label={formatMessage(t, 'minibadge.statistics.top.assigning.users', [topAssigningUsers.length])}
                    >
                      <Grid>
                        {topAssigningUsers.map((user, index) => (
                          <Grid.Col sm="4" md="4" lg="6" xl="6" key={user.id}>
                            <Flex direction="column" align="center" gap="8" className="text-center">
                              {/* Decorative: the same name immediately follows as
                                  text below, so a non-empty `alt` would announce
                                  it twice to screen readers. */}
                              <Avatar
                                src={`/userbook/avatar/${user.id}?thumbnail=96x96`}
                                imgPlaceholder="/minibadge/public/img/default-avatar.svg"
                                alt=""
                              />
                              <div>
                                <p className="mb-0">{`${index + 1}. ${getUserDisplayName(user)}`}</p>
                                {isStatisticsViewAllStructures ? (
                                  <p className="text-muted small mb-0">{getUserStructureName(user)}</p>
                                ) : null}
                                <p className="mb-0">
                                  {formatMessage(t, 'minibadge.statistics.badges.assigned', [
                                    (user.countAssigned ?? 0).toLocaleString(),
                                  ])}
                                </p>
                              </div>
                            </Flex>
                          </Grid.Col>
                        ))}
                      </Grid>
                    </StatisticsCard>
                  </Grid.Col>
                ) : null}

                {topReceivingUsers.length > 0 ? (
                  <Grid.Col sm="4" md="4" lg="6" xl="6">
                    <StatisticsCard
                      icon={<IconUsers />}
                      label={formatMessage(t, 'minibadge.statistics.top.receiving.users', [topReceivingUsers.length])}
                    >
                      <Grid>
                        {topReceivingUsers.map((user, index) => (
                          <Grid.Col sm="4" md="4" lg="6" xl="6" key={user.id}>
                            <Flex direction="column" align="center" gap="8" className="text-center">
                              <Avatar
                                src={`/userbook/avatar/${user.id}?thumbnail=96x96`}
                                imgPlaceholder="/minibadge/public/img/default-avatar.svg"
                                alt=""
                              />
                              <div>
                                <p className="mb-0">{`${index + 1}. ${getUserDisplayName(user)}`}</p>
                                {isStatisticsViewAllStructures ? (
                                  <p className="text-muted small mb-0">{getUserStructureName(user)}</p>
                                ) : null}
                                <p className="mb-0">
                                  {formatMessage(t, 'minibadge.statistics.badges.received', [
                                    (user.countAssigned ?? 0).toLocaleString(),
                                  ])}
                                </p>
                              </div>
                            </Flex>
                          </Grid.Col>
                        ))}
                      </Grid>
                    </StatisticsCard>
                  </Grid.Col>
                ) : null}
              </Grid>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
};
