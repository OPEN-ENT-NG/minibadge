import { Alert, Avatar, Heading, LoadingScreen, Radio } from '@edifice.io/react';
import { IconCheck, IconHandMove, IconUser, IconUsers } from '@edifice.io/react/icons';
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
 * Mirror of `statistics.controller.ts` + `statistics.html`: "Statistiques"
 * (`/statistics`) — usage statistics for the module (participation, most/
 * least assigned/refused badge types, most active users/structures),
 * filterable by a sliding period.
 *
 * - Endpoint: `GET /minibadge/statistics?minDate=yyyy-MM-dd` (optional) —
 *   `useStatistics` (Phase 1), never consumed by a screen until now.
 * - Right gating: `isStatisticsView` (`hasWorkflow(statisticsView)`) redirects
 *   to `/` when absent, mirroring `main.ts:90-98` — same pattern as
 *   `routes/badges-admin`'s `isAdmin` guard (Phase 5): every hook is called
 *   unconditionally above the redirect, only the JSX is conditional.
 *   `isStatisticsViewAllStructures` gates extra sections/columns INSIDE this
 *   already-accessible screen only (never the route itself) — the
 *   "établissements les plus actifs" block and the structure-name column in
 *   the user grids below.
 * - Period (`selectedPeriod`, default `'all'`): changing it recomputes
 *   `minDate` and re-queries `useStatistics` from scratch (no partial merge),
 *   mirroring `onChangePeriod()` (`statistics.controller.ts:47-56`). `'all'`
 *   sends no `minDate` at all (`startDate = null`).
 * - Type toggle (`selectedType`, default `'badges'`): PURELY local — toggles
 *   which already-loaded fields are displayed, no server call
 *   (`isBadgesSelected`/`isUsersSelected`, no `ng-change` on that radio
 *   group in `statistics.html:67-78`, unlike the period radios which do have
 *   `ng-change="vm.onChangePeriod()"`).
 * - The "Par type" panel is entirely absent when the user has no type data
 *   at all (`!!mostAssignedTypes.length || !!mostRefusedTypes.length`,
 *   `statistics.html:62`) — unlike the "Participation" panel above it, which
 *   is always rendered regardless of data.
 * - GOTCHA reproduced faithfully (`statistics.html:161-172`): the
 *   "less assigned" card's TITLE shows whenever `lessAssignedTypes.length`,
 *   but the bar chart INSIDE it only renders when `lessAssignedTypes.length
 *   > 1` — with exactly 1 element the card is visible with an empty body.
 *   This is a real quirk of the source app, not a simplification to fix.
 *
 * LOADING INDICATOR (post-migration improvement plan, Constat #1): before
 * this fix, every derived array defaulted to `?? []`, so the whole dashboard
 * silently rendered as "no data" during the initial fetch. Unlike
 * `my-badges`/`badges-given` (persistent search/filter shell + partial
 * content swap), this screen's period/type radios are meaningless without
 * `statistics` already loaded once, so — mirroring `routes/badge-type-detail`
 * exactly — `LoadingScreen` replaces the ENTIRE screen while `query.isLoading`,
 * placed after the `isStatisticsView` redirect (every hook above it is still
 * called unconditionally, matching the established gating order in
 * `routes/badges-admin`/`CharterGate`).
 *
 * A11Y FIX (react-reviewer, MEDIUM): `LoadingScreen` itself has no
 * `aria-live`/`role="status"`, so its appearance/disappearance was invisible
 * to assistive tech. Unlike `my-badges`/`badges-given`/`badges-admin` (a
 * single container present across both states), this screen swaps its ENTIRE
 * return value on `query.isLoading`, so there's no shared persistent element
 * to hang `aria-busy` on — the loading return is instead wrapped in its own
 * `<div aria-live="polite">`, still the same established convention as
 * `AssignBadgeLightbox`/`RevokeUsersModal`'s search-results regions.
 */

type PeriodOption = 'all' | '30days' | '7days';
type TypeOption = 'badges' | 'users';

const minDateForPeriod = (period: PeriodOption): string | undefined => {
  if (period === 'all') return undefined;
  const days = period === '30days' ? 30 : 7;
  const date = new Date();
  date.setDate(date.getDate() - days);
  // REVIEW NOTE (react-reviewer, MEDIUM — investigated, not changed): the
  // source (`statistic.service.ts`) formats this boundary with
  // `minDate.toISOString().split('T')[0]` (UTC day boundary), whereas
  // `toIsoDate` (`~/utils/date`) uses local `getFullYear`/`getMonth`/
  // `getDate` — a real divergence near local midnight depending on the
  // user's timezone. This is intentional, not an oversight: `toIsoDate` is
  // the established local-day convention already used consistently for
  // every other period computation in this app (`defaultPeriod` in
  // `~/utils/date`, consumed by `routes/badges-given` since Phase 3 and
  // `routes/badges-admin` since Phase 5) — switching only this call site to
  // UTC would make THIS screen the inconsistent one.
  return toIsoDate(date);
};

/** Mirrors `User.getDisplayName()` (`user.model.ts:73`). */
const getUserDisplayName = (user: MinibadgeUser): string =>
  user.displayName || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();

/** Mirrors `User.getStructureName()` (`user.model.ts:79`). */
const getUserStructureName = (user: MinibadgeUser): string =>
  user.structureNames && user.structureNames.length ? user.structureNames[0] : '';

/**
 * Mirrors `Structure.displayItemDistinction` (`structure.model.ts:38-46`)
 * EXACTLY, including the lower-cased option labels — no model class exists
 * on the React side for this (per the plan: display logic lives in the
 * screen, not a port of the AngularJS class hierarchy).
 */
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
 * REVIEW FIX (react-reviewer, HIGH): textual equivalent of the "most"/"less
 * assigned" bar charts' data (`BadgeChart`'s `accessibleItems`), for
 * assistive tech — mirrors `badgeTypeChartSeries`/`badgeTypeChartCategories`
 * exactly (same source array, same `countAssigned` field, same order), so
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

  // Mirrors `main.ts:90-98`'s immediate redirect when `statisticsView` is
  // absent — every hook above this line is called unconditionally first.
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
    <div className="minibadge-statistics">
      {query.isError ? <Alert type="danger">{t('minibadge.error.get.statistics')}</Alert> : null}

      <section className="minibadge-statistics-participation">
        <Heading level="h2" id="minibadge-statistics-period-heading">
          {t('minibadge.filter.stats.per.period')}
        </Heading>
        <div role="radiogroup" aria-labelledby="minibadge-statistics-period-heading">
          <Radio
            name="statistics-period"
            value="all"
            model={selectedPeriod}
            checked={selectedPeriod === 'all'}
            onChange={() => setSelectedPeriod('all')}
            label={t('minibadge.filter.stats.complete.history')}
          />
          <Radio
            name="statistics-period"
            value="30days"
            model={selectedPeriod}
            checked={selectedPeriod === '30days'}
            onChange={() => setSelectedPeriod('30days')}
            label={t('minibadge.filter.stats.last.thirty.days')}
          />
          <Radio
            name="statistics-period"
            value="7days"
            model={selectedPeriod}
            checked={selectedPeriod === '7days'}
            onChange={() => setSelectedPeriod('7days')}
            label={t('minibadge.filter.stats.last.seven.days')}
          />
        </div>

        <p>{t('minibadge.statistics.participation')}</p>
        <div className="minibadge-statistics-cards">
          <div className="minibadge-statistics-count-allowed">
            <p>
              <IconCheck />
              <span>{formatMessage(t, 'minibadge.statistics.badges.assigned', [(statistics?.countBadgeAssigned ?? 0).toLocaleString()])}</span>
            </p>
            <p>
              <IconUser />
              <span>{formatMessage(t, 'minibadge.active.users', [(statistics?.countActiveUsers ?? 0).toLocaleString()])}</span>
            </p>
          </div>

          {showStructuresBlock ? (
            <StatisticsCard
              className="minibadge-statistics-top-structures"
              icon={<IconUsers />}
              label={t('minibadge.statistics.most.active.structures')}
            >
              <p>{formatMessage(t, 'minibadge.statistics.top', [mostAssigningStructures.length])}</p>
              <ol>
                {mostAssigningStructures.map((structure) => (
                  <li key={structure.id}>
                    {structure.name} — {displayStructureDistinction(t, structure)}
                  </li>
                ))}
              </ol>
            </StatisticsCard>
          ) : null}
        </div>
      </section>

      {showTypesPanel ? (
        <section className="minibadge-container-badges">
          <Heading level="h2" id="minibadge-statistics-type-heading">
            {t('minibadge.filter.stats.per.type')}
          </Heading>
          <div role="radiogroup" aria-labelledby="minibadge-statistics-type-heading">
            <Radio
              name="statistics-type"
              value="badges"
              model={selectedType}
              checked={selectedType === 'badges'}
              onChange={() => setSelectedType('badges')}
              label={t('minibadge.badges.option')}
            />
            <Radio
              name="statistics-type"
              value="users"
              model={selectedType}
              checked={selectedType === 'users'}
              onChange={() => setSelectedType('users')}
              label={t('minibadge.users.option')}
            />
          </div>

          {selectedType === 'badges' ? (
            <div className="minibadge-statistics-participation-content">
              <p>{t('minibadge.statistics.badges')}</p>
              <div className="minibadge-statistics-badges">
                {mostAssignedTypes.length > 0 && firstMostAssignedType ? (
                  <StatisticsCard
                    className="minibadge-statistics-top-most-allowed"
                    icon={<IconCheck />}
                    label={formatMessage(t, 'minibadge.statistics.most.allowed.badges', [
                      Math.min(3, mostAssignedTypes.length),
                    ])}
                  >
                    <div className="minibadge-most-assigned">
                      <div className="minibadge-card-simple">
                        {firstMostAssignedType.pictureId ? (
                          <img src={`/minibadge/public/img/${firstMostAssignedType.pictureId}`} alt="" />
                        ) : null}
                        <span>{firstMostAssignedType.label}</span>
                      </div>
                      <div className="minibadge-most-assigned-detail">
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
                        <div className="minibadge-most-assigned-others">
                          {otherMostAssignedTypes.map((type) => (
                            <div key={type.id} className="minibadge-card-type-statistic">
                              {type.pictureId ? (
                                <img src={`/minibadge/public/img/${type.pictureId}`} alt="" />
                              ) : null}
                              <span>{type.label}</span>
                              <span>
                                {formatMessage(t, 'minibadge.statistics.assigned.times', [
                                  (type.countAssigned ?? 0).toLocaleString(),
                                ])}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </StatisticsCard>
                ) : null}

                {mostRefusedTypes.length > 0 ? (
                  <StatisticsCard
                    className="minibadge-statistics-top-most-refused"
                    label={formatMessage(t, 'minibadge.statistics.most.refused.badges', [mostRefusedTypes.length])}
                  >
                    <div>
                      {mostRefusedTypes.map((type) => (
                        <div key={type.id} className="minibadge-card-simple">
                          {type.pictureId ? <img src={`/minibadge/public/img/${type.pictureId}`} alt="" /> : null}
                          <p>{type.label}</p>
                          <p>
                            {formatMessage(t, 'minibadge.statistics.refused.times', [type.countRefused ?? 0])}
                          </p>
                        </div>
                      ))}
                    </div>
                  </StatisticsCard>
                ) : null}
              </div>

              {mostAssignedTypes.length > 0 ? (
                <StatisticsCard
                  className="minibadge-statistics-most-allowed"
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
                  className="minibadge-statistics-less-allowed"
                  label={formatMessage(t, 'minibadge.statistics.less.allowed.badges', [lessAssignedTypes.length])}
                >
                  {/* GOTCHA (`statistics.html:167-170`): the graph is only
                      rendered above a strict length of 1 — reproduced
                      faithfully, not a simplification. */}
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
            </div>
          ) : (
            <div className="minibadge-statistics-participation">
              <p>{t('minibadge.users')}</p>
              <div className="minibadge-statistics-badges">
                {topAssigningUsers.length > 0 ? (
                  <StatisticsCard
                    className="minibadge-statistics-top-assigning-users"
                    icon={<IconHandMove />}
                    label={formatMessage(t, 'minibadge.statistics.top.assigning.users', [topAssigningUsers.length])}
                  >
                    <div>
                      {topAssigningUsers.map((user, index) => (
                        <div key={user.id} className="minibadge-card-simple">
                          {/* Decorative: the same name immediately follows as
                              text below, so a non-empty `alt` would announce
                              it twice to screen readers. */}
                          <Avatar
                            src={`/userbook/avatar/${user.id}?thumbnail=96x96`}
                            imgPlaceholder="/minibadge/public/img/default-avatar.svg"
                            alt=""
                            className="minibadge-statistics-user-img"
                          />
                          <p>{`${index + 1}. ${getUserDisplayName(user)}`}</p>
                          {isStatisticsViewAllStructures ? (
                            <p className="minibadge-statistics-user-structure">{getUserStructureName(user)}</p>
                          ) : null}
                          <p>
                            {formatMessage(t, 'minibadge.statistics.badges.assigned', [
                              (user.countAssigned ?? 0).toLocaleString(),
                            ])}
                          </p>
                        </div>
                      ))}
                    </div>
                  </StatisticsCard>
                ) : null}

                {topReceivingUsers.length > 0 ? (
                  <StatisticsCard
                    className="minibadge-statistics-top-receiving-users"
                    icon={<IconUsers />}
                    label={formatMessage(t, 'minibadge.statistics.top.receiving.users', [topReceivingUsers.length])}
                  >
                    <div>
                      {topReceivingUsers.map((user, index) => (
                        <div key={user.id} className="minibadge-card-simple">
                          <Avatar
                            src={`/userbook/avatar/${user.id}?thumbnail=96x96`}
                            imgPlaceholder="/minibadge/public/img/default-avatar.svg"
                            alt=""
                            className="minibadge-statistics-user-img"
                          />
                          <p>{`${index + 1}. ${getUserDisplayName(user)}`}</p>
                          {isStatisticsViewAllStructures ? (
                            <p className="minibadge-statistics-user-structure">{getUserStructureName(user)}</p>
                          ) : null}
                          <p>
                            {formatMessage(t, 'minibadge.statistics.badges.received', [
                              (user.countAssigned ?? 0).toLocaleString(),
                            ])}
                          </p>
                        </div>
                      ))}
                    </div>
                  </StatisticsCard>
                ) : null}
              </div>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
};
