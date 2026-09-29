import { HttpResponse, http } from 'msw';

/**
 * Minimal set of ENT Core platform endpoints hit by `@edifice.io/client`
 * while `EdificeClientProvider` bootstraps a session (useSession) and the
 * app configuration (useConf), so tests never hit the real network.
 */
const defaultHandlers = [
  http.get('/auth/oauth2/userinfo', () => {
    return HttpResponse.json({
      username: 'fake.user',
      login: 'fake.user',
      firstName: 'Fake',
      lastName: 'User',
      userId: 'a1b2c3d4',
      type: 'Personnel',
      structures: ['d4c3b2a1'],
      structureNames: ['Fake School'],
      functions: {},
      // Default fixture represents a fully-entitled user (both workflow
      // rights) so the app shell renders real screen content out of the box;
      // tests of the "no rights" / "not yet accepted" gates override this via
      // `server.use(...)`.
      authorizedActions: [
        { name: 'fr.openent.minibadge.controller.FakeRight|assign', displayName: 'assign', type: 'WORKFLOW' },
        { name: 'fr.openent.minibadge.controller.FakeRight|receive', displayName: 'receive', type: 'WORKFLOW' },
      ],
      apps: [],
    });
  }),

  http.get('/theme', () => {
    return HttpResponse.json({
      template: '/public/template/portal.html',
      logoutCallback: '',
      skin: '/assets/themes/fake/skins/default/',
      themeName: 'fake-theme',
      skinName: 'default',
    });
  }),

  http.get('/locale', () => {
    return HttpResponse.json({ locale: 'fr' });
  }),

  http.get('/i18n', () => {
    return HttpResponse.json({ status: 200 });
  }),

  http.get('/minibadge/i18n', () => {
    return HttpResponse.json({ status: 200 });
  }),

  http.get('/userbook/preference/language', () => {
    return HttpResponse.json({
      preference: '{"default-domain":"fr"}',
    });
  }),

  http.get('/userbook/preference/apps', () => {
    return HttpResponse.json({
      preference: '{"bookmarks":[],"applications":["minibadge"]}',
    });
  }),

  http.get('/userbook/api/person', () => {
    return HttpResponse.json({
      status: 'ok',
      result: [
        {
          id: 'a1b2c3d4',
          userId: 'a1b2c3d4',
          type: ['Personnel'],
        },
      ],
    });
  }),

  // `AppHeader`'s unread-messages badge polls this endpoint unconditionally.
  http.get('/conversation/api/count/inbox', () => {
    return HttpResponse.json({ count: 0 });
  }),

  // Per-app public conf, fetched unconditionally by `EdificeClientProvider`.
  http.get('/minibadge/conf/public', () => {
    return HttpResponse.json({});
  }),

  http.get('/directory/userbook/a1b2c3d4', () => {
    return HttpResponse.json({
      userid: 'a1b2c3d4',
      type: 'USERBOOK',
    });
  }),

  http.get('/workspace/quota/user/a1b2c3d4', () => {
    return HttpResponse.json({ quota: 104857600, storage: 0 });
  }),

  http.get('/applications-list', () => {
    return HttpResponse.json({
      apps: [
        {
          address: '/minibadge',
          display: true,
          displayName: 'Minibadge',
          icon: 'minibadge',
          isExternal: false,
          name: 'Minibadge',
          prefix: '/minibadge',
          scope: [],
        },
      ],
    });
  }),

  http.get('/assets/theme-conf.js', () => {
    return HttpResponse.json({ overriding: [] });
  }),

  // The following are triggered by the platform chrome rendered inside
  // `Layout` (messagerie badge, cookies banner, Zendesk help widget) —
  // none of it is minibadge-specific, but it still fires network calls
  // on mount that must resolve without hitting the real network.
  http.get('/conversation/count/INBOX', () => {
    return HttpResponse.json({ count: 0 });
  }),

  http.get('/userbook/preference/zimbra', () => {
    return HttpResponse.json({ preference: '{}' });
  }),

  http.get('/userbook/preference/rgpdCookies', () => {
    return HttpResponse.json({ preference: '{"showInfoTip":false}' });
  }),

  http.get('/zendeskGuide/config', () => {
    return HttpResponse.json({});
  }),
];

/**
 * Fixtures + handlers for the minibadge API surface. Shapes mirror the
 * interfaces in `~/models/*` exactly.
 */
import { Badge } from '~/models/badge';
import { BadgeAssigned } from '~/models/badgeAssigned';
import { BadgeCategory } from '~/models/badgeCategory';
import { BadgeType } from '~/models/badgeType';
import { Statistics } from '~/models/statistics';
import { MinibadgeUser } from '~/models/user';

export const fakeUser: MinibadgeUser = {
  id: 'a1b2c3d4',
  firstName: 'Fake',
  lastName: 'User',
  displayName: 'Fake User',
  profile: 'Personnel',
  countAssigned: 2,
  badgeAssignedTotal: 5,
  structureIds: ['d4c3b2a1'],
  structureNames: ['Fake School'],
};

/**
 * Two extra `/admin/users-search` candidates, distinct from `fakeUser` — one
 * carrying `minibadgeUserState` (to exercise the "(Actif)"/"(Inactif)"/
 * "(Révoqué)" display suffix), the other a plain second person (to exercise
 * the plural revocation-confirmation question, which needs 2+ selected
 * users).
 */
export const fakeAdminSearchUserRevoked: MinibadgeUser = {
  id: 'q1r2s3t4',
  firstName: 'Nina',
  lastName: 'Revoked',
  displayName: 'Nina Revoked',
  profile: 'Personnel',
  structureIds: ['d4c3b2a1'],
  structureNames: ['Fake School'],
  minibadgeUserState: 'REVOKED',
};

export const fakeAdminSearchUserSecond: MinibadgeUser = {
  id: 'u5v6w7x8',
  firstName: 'Bo',
  lastName: 'Second',
  displayName: 'Bo Second',
  profile: 'Personnel',
  structureIds: ['d4c3b2a1'],
  structureNames: ['Fake School'],
};

export const fakeBadgeCategory: BadgeCategory = {
  id: 1,
  name: 'Savoir-être',
  slug: 'savoir-etre',
  iconName: 'star',
  iconCssClass: 'bi-star',
};

export const fakeBadgeType: BadgeType = {
  id: 10,
  structureId: 'd4c3b2a1',
  ownerId: 'a1b2c3d4',
  pictureId: 'picture-id-1',
  label: 'Entraide',
  createdAt: '2024-01-01 10:00:00.000',
  description: 'Badge décerné pour un acte d’entraide.',
  descriptionShort: 'Acte d’entraide',
  countAssigned: 3,
  countRefused: 0,
  setting: {
    relations: [],
    isSelfAssignable: false,
    structureId: 'd4c3b2a1',
  },
  categories: [fakeBadgeCategory],
  isSelfAssigned: false,
  owner: fakeUser,
  mostAssigningUsers: [fakeUser],
};

export const fakeBadge: Badge = {
  id: 100,
  structureId: 'd4c3b2a1',
  badgeTypeId: fakeBadgeType.id,
  ownerId: 'a1b2c3d4',
  counts: { assigned: 3 },
  badgeType: fakeBadgeType,
  owner: fakeUser,
};

/**
 * One badge fixture per status (`~/utils/badgeStatus`), so the
 * `GET /minibadge/badges` handler below can return a set that actually
 * exercises the 3-way public/private/refused split, instead of only ever
 * the single public `fakeBadge`.
 */
export const fakeBadgePrivatized: Badge = {
  ...fakeBadge,
  id: 200,
  badgeTypeId: fakeBadgeType.id,
  privatizedAt: '2024-02-01 10:00:00.000',
};

export const fakeBadgeRefused: Badge = {
  ...fakeBadge,
  id: 300,
  badgeTypeId: fakeBadgeType.id,
  refusedAt: '2024-02-02 10:00:00.000',
};

export const fakeBadgeAssigned: BadgeAssigned = {
  id: 1000,
  assignorId: 'a1b2c3d4',
  assignorDisplayName: 'Fake User',
  createdAt: '2024-01-02 10:00:00.000',
  updatedAt: '2024-01-02 10:00:00.000',
  acceptedAt: '2024-01-02 10:00:00.000',
  badge: fakeBadge,
  assignor: fakeUser,
};

/**
 * A second given-badge fixture, deliberately distinct from
 * `fakeBadgeAssigned` in every sortable column (badge type label, receiver
 * display name, creation date, revocation date) and already revoked. Lets
 * the `/minibadge/assigned/given` handler below prove real
 * `sortBy`/`sortAsc`/`startDate`/`endDate` handling (not just that some
 * response comes back), and lets `routes/badges-given` exercise the
 * "already revoked" row (the "Révocation" text instead of the trash icon)
 * without a dedicated mutation.
 */
export const fakeBadgeAssignedRevoked: BadgeAssigned = {
  id: 1001,
  assignorId: 'a1b2c3d4',
  assignorDisplayName: 'Fake User',
  createdAt: '2024-01-10 10:00:00.000',
  updatedAt: '2024-01-15 10:00:00.000',
  revokedAt: '2024-01-15 10:00:00.000',
  badge: {
    ...fakeBadge,
    id: 400,
    badgeType: { ...fakeBadgeType, id: 20, label: 'Zèle' },
    owner: { ...fakeUser, id: 'z9y8x7w6', displayName: 'Zoe Receiver' },
  },
  assignor: fakeUser,
};

/**
 * A second `/assigned/all` fixture, distinct from `fakeBadgeAssigned` in
 * every one of the 4 admin-table sortable columns (label, assignor display
 * name, owner/receiver display name, creation date) — this endpoint sorts
 * on `assignor_display_name`/`receiver_display_name` (see
 * `routes/badges-admin/index.tsx`'s `SORT_COLUMNS`), not the single-user
 * `display_name` `/assigned/given` uses, so it needs its own assignor
 * identity distinct from `fakeBadgeAssigned`'s.
 */
export const fakeBadgeAssignedAllSecond: BadgeAssigned = {
  id: 2000,
  assignorId: 'z9y8x7w6',
  assignorDisplayName: 'Zoe Assignor',
  createdAt: '2024-01-20 10:00:00.000',
  updatedAt: '2024-01-20 10:00:00.000',
  badge: {
    ...fakeBadge,
    id: 500,
    badgeType: { ...fakeBadgeType, id: 30, label: 'Curiosité' },
    owner: { ...fakeUser, id: 'm1n2o3p4', displayName: 'Marc Owner' },
  },
  assignor: { ...fakeUser, id: 'z9y8x7w6', displayName: 'Zoe Assignor' },
};

/**
 * A second badge-type fixture, distinct from `fakeBadgeType`, purely so
 * `fakeStatistics.mostAssignedTypes` can have 2 elements — exercising
 * `mostAssignedTypes.slice(1, 3)` (the "other top badges" compact cards)
 * without inflating to 3+ (a real 3rd-place scenario isn't needed to prove
 * the slice works). No `mostAssigningUsers` of its own, unlike
 * `fakeBadgeType` — proves the "top assigning users" sub-list is only
 * rendered for the FIRST (detailed) element, never the compact ones.
 */
export const fakeBadgeTypeSecond: BadgeType = {
  ...fakeBadgeType,
  id: 40,
  pictureId: 'picture-id-2',
  label: 'Persévérance',
  countAssigned: 1,
  countRefused: 2,
  mostAssigningUsers: undefined,
};

export const fakeStatistics: Statistics = {
  countBadgeAssigned: 42,
  countActiveUsers: 12,
  mostAssignedTypes: [fakeBadgeType, fakeBadgeTypeSecond],
  // Deliberately length 1: the default fixture exercises the GOTCHA in
  // `statistics.html:167-170` (the "less assigned" card's title shows, but
  // its bar chart is only rendered above a strict length of 1) out of the
  // box, without needing a dedicated `server.use(...)` override.
  lessAssignedTypes: [fakeBadgeType],
  mostRefusedTypes: [fakeBadgeTypeSecond],
  mostAssigningStructures: [
    { id: 'd4c3b2a1', name: 'Fake School', countAssigned: 3, countActiveUsers: 12 },
  ],
  topAssigningUsers: [fakeUser],
  topReceivingUsers: [fakeUser],
};

/**
 * Returned instead of `fakeStatistics` whenever `minDate` is present on the
 * request — deliberately different (`countBadgeAssigned`/`countActiveUsers`,
 * and an EMPTY `mostAssignedTypes`/`mostRefusedTypes`) so a test can prove a
 * period change genuinely triggers a fresh request and swaps the displayed
 * data, rather than only proving that SOME response came back.
 */
export const fakeStatisticsFiltered: Statistics = {
  ...fakeStatistics,
  countBadgeAssigned: 7,
  countActiveUsers: 3,
  mostAssignedTypes: [],
  mostRefusedTypes: [],
};

/**
 * `lessAssignedTypes` of length 2 — the counterpart to `fakeStatistics`'s
 * default length-1 fixture, proving the bar chart DOES render once the
 * length threshold (`> 1`) is crossed.
 */
export const fakeStatisticsMultipleLessAssigned: Statistics = {
  ...fakeStatistics,
  lessAssignedTypes: [fakeBadgeType, fakeBadgeTypeSecond],
};

/** Both type arrays empty: the "Par type" panel must be entirely absent. */
export const fakeStatisticsNoTypes: Statistics = {
  ...fakeStatistics,
  mostAssignedTypes: [],
  mostRefusedTypes: [],
  lessAssignedTypes: [],
};

/**
 * `mostAssignedTypes` of length 4, i.e. one MORE than the 3 the "most
 * allowed badges" compact cards ever display
 * (`otherMostAssignedTypes = mostAssignedTypes.slice(1, 3)`, on top of
 * `firstMostAssignedType`). Lets a test prove the chart's visually-hidden
 * textual fallback exposes ALL 4 labels, not just the 3 rendered as visible
 * text elsewhere on the same screen.
 */
export const fakeStatisticsManyMostAssigned: Statistics = {
  ...fakeStatistics,
  mostAssignedTypes: [
    fakeBadgeType,
    fakeBadgeTypeSecond,
    { ...fakeBadgeType, id: 41, label: 'Créativité', countAssigned: 5, mostAssigningUsers: undefined },
    { ...fakeBadgeType, id: 42, label: 'Ponctualité', countAssigned: 2, mostAssigningUsers: undefined },
  ],
};

/**
 * The handlers below read `request.url.searchParams` and return a
 * distinguishable response (an empty list when a `query` param doesn't
 * match the fixture, or a 400 when a genuinely required param is
 * missing/malformed) rather than a fixed fixture regardless of what was
 * asked for, so the corresponding `services/queries/*.test.tsx` tests can
 * prove the param was actually sent and read.
 */

/**
 * Helpers for the `/minibadge/assigned/given` handler below — kept outside
 * the handlers array since they're plain data-shaping functions, not
 * request handlers themselves.
 */
function isCreatedWithinRange(
  createdAt: string | undefined,
  startDateDDMMYYYY: string,
  endDateDDMMYYYY: string,
): boolean {
  if (!createdAt) return false;
  const createdAtDate = new Date(createdAt.replace(' ', 'T'));
  const [startDay, startMonth, startYear] = startDateDDMMYYYY.split('-').map(Number);
  const [endDay, endMonth, endYear] = endDateDDMMYYYY.split('-').map(Number);
  const rangeStart = new Date(startYear, startMonth - 1, startDay);
  const rangeEnd = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
  return createdAtDate >= rangeStart && createdAtDate <= rangeEnd;
}

function sortValueFor(item: BadgeAssigned, sortBy: string): string {
  switch (sortBy) {
    case 'label':
      return item.badge.badgeType.label;
    // The accepted sort column for the owner/receiver name is
    // `display_name`, not `receiver_display_name` (see
    // `routes/badges-given/index.tsx`'s `SORT_COLUMNS`).
    case 'display_name':
      return item.badge.owner?.displayName ?? '';
    case 'revoked_at':
      return item.revokedAt ?? '';
    case 'created_at':
    default:
      return item.createdAt ?? '';
  }
}

const minibadgeHandlers = [
  // Badges — kept as the single public `fakeBadge` by default (see
  // `services/queries/badges.test.tsx`, which asserts exactly `[fakeBadge]`).
  // `query` filters by badge type label (case-insensitive, mirroring other
  // list endpoints below), so `useBadges(searchQuery)` tests can prove the
  // param is forwarded and read. `routes/my-badges` tests that need all 3
  // statuses (`fakeBadge`/`fakeBadgePrivatized`/`fakeBadgeRefused`) override
  // this handler via `server.use(...)`.
  http.get('/minibadge/badges', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('query');
    const all =
      query && !fakeBadgeType.label.toLowerCase().includes(query.toLowerCase()) ? [] : [fakeBadge];
    return HttpResponse.json({ all });
  }),
  http.put('/minibadge/types/:typeId/badge/publish', () => HttpResponse.json({})),
  http.put('/minibadge/types/:typeId/badge/privatize', () => HttpResponse.json({})),
  http.put('/minibadge/types/:typeId/badge/refuse', () => HttpResponse.json({})),

  /**
   * BadgeTypes — `offset` is required server-side (no default); `query`
   * filters the fixture by label to prove it's read.
   *
   * Genuinely slices `offset`..`offset+limit` (default `limit` 10 when the
   * param is absent, echoing back whatever `limit` WAS requested) so a real
   * `useInfiniteQuery` "next page" request can be proven to work — still
   * only ever backed by the single `fakeBadgeType` fixture; real multi-page
   * scroll behavior is exercised by a dedicated `server.use(...)` override
   * with more fixtures in `routes/badge-types/index.test.tsx`.
   */
  http.get('/minibadge/types', ({ request }) => {
    const url = new URL(request.url);
    const offsetParam = url.searchParams.get('offset');
    if (offsetParam === null || Number.isNaN(Number(offsetParam))) {
      return new HttpResponse(null, { status: 400 });
    }
    const offset = Number(offsetParam);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam !== null && !Number.isNaN(Number(limitParam)) ? Number(limitParam) : 10;
    const query = url.searchParams.get('query');
    const filtered =
      query && !fakeBadgeType.label.toLowerCase().includes(query.toLowerCase()) ? [] : [fakeBadgeType];
    const all = filtered.slice(offset, offset + limit);
    return HttpResponse.json({ all, limit, offset });
  }),
  http.get('/minibadge/types/:typeId', () => HttpResponse.json(fakeBadgeType)),
  // Epic C: echoes the normalized body back, as `BadgeTypeController#updateBadgeTypeValidity` does.
  http.put('/minibadge/types/:typeId/validity', async ({ params, request }) => {
    const body = (await request.json()) as { validUntil: string | null };
    return HttpResponse.json({ id: Number(params.typeId), validUntil: body.validUntil });
  }),
  http.get('/minibadge/types/:typeId/assigners', () =>
    HttpResponse.json({ all: [fakeUser], page: 0, pageCount: 1, userAssignersTotal: 1 }),
  ),
  http.get('/minibadge/types/:typeId/receivers', () =>
    HttpResponse.json({ all: [fakeUser], page: 0, pageCount: 1, receiversTotal: 1 }),
  ),

  // BadgeCategory
  http.get('/minibadge/categories', () => HttpResponse.json([fakeBadgeCategory])),

  // BadgeAssigned — `query` filters the fixture by the assignor's display
  // name to prove the param is actually forwarded and read (see
  // `BadgeAssignedFilters` in `services/api/badgeAssigned.ts`).
  /**
   * `startDate`+`endDate` gate a second fixture (`fakeBadgeAssignedRevoked`)
   * into the response, filtered by its real `createdAt` against the
   * requested range (parsed as `DD-MM-YYYY`); `sortBy`/`sortAsc` then really
   * reorder whatever that narrowed down to. Below any sort, the two
   * fixtures are deliberately returned in "wrong" (non-ascending) order, so
   * a test can prove a sort click genuinely reorders rows rather than
   * merely matching an already-sorted fixture list. No `startDate`/
   * `endDate` still falls back to the single-item branch, so
   * `services/queries/badgeAssigned.test.tsx`'s exact `[fakeBadgeAssigned]`
   * assertions keep passing unchanged.
   */
  http.get('/minibadge/assigned/given', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('query');
    const sortBy = url.searchParams.get('sortBy');
    const sortAsc = url.searchParams.get('sortAsc');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    let all: BadgeAssigned[] =
      startDate && endDate
        ? [fakeBadgeAssignedRevoked, fakeBadgeAssigned].filter((item) =>
            isCreatedWithinRange(item.createdAt, startDate, endDate),
          )
        : [fakeBadgeAssigned];

    // The real backend's `WHERE` clause searches the badge owner/receiver's
    // display name and the badge type label — never the assignor's name,
    // since the assignor is always "me" for this endpoint (already scoped
    // to the current user).
    if (query) {
      const lowerQuery = query.toLowerCase();
      all = all.filter(
        (item) =>
          (item.badge.owner?.displayName ?? '').toLowerCase().includes(lowerQuery) ||
          item.badge.badgeType.label.toLowerCase().includes(lowerQuery),
      );
    }

    if (sortBy) {
      const direction = sortAsc === 'false' ? -1 : 1;
      all = [...all].sort(
        (a, b) => sortValueFor(a, sortBy).localeCompare(sortValueFor(b, sortBy)) * direction,
      );
    }

    return HttpResponse.json({ all });
  }),
  /**
   * Same pattern as `/minibadge/assigned/given` above: `startDate`+`endDate`
   * gate `fakeBadgeAssignedAllSecond` into the response (same
   * `isCreatedWithinRange` helper); no dates still falls back to the
   * single-item branch, so `services/queries/badgeAssigned.test.tsx`'s exact
   * `[fakeBadgeAssigned]` assertions keep passing unchanged. `sortBy`
   * accepts this endpoint's OWN 4 columns
   * (`label`/`assignor_display_name`/`receiver_display_name`/`created_at` —
   * see `routes/badges-admin/index.tsx`'s `SORT_COLUMNS`), distinct from
   * `/assigned/given`'s `display_name`.
   */
  http.get('/minibadge/assigned/all', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('query');
    const sortBy = url.searchParams.get('sortBy');
    const sortAsc = url.searchParams.get('sortAsc');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    let all: BadgeAssigned[] =
      startDate && endDate
        ? [fakeBadgeAssignedAllSecond, fakeBadgeAssigned].filter((item) =>
            isCreatedWithinRange(item.createdAt, startDate, endDate),
          )
        : [fakeBadgeAssigned];

    if (query) {
      const lowerQuery = query.toLowerCase();
      all = all.filter(
        (item) =>
          (item.assignorDisplayName ?? '').toLowerCase().includes(lowerQuery) ||
          (item.badge.owner?.displayName ?? '').toLowerCase().includes(lowerQuery) ||
          item.badge.badgeType.label.toLowerCase().includes(lowerQuery),
      );
    }

    if (sortBy) {
      const direction = sortAsc === 'false' ? -1 : 1;
      const sortValueForAll = (item: BadgeAssigned): string => {
        switch (sortBy) {
          case 'label':
            return item.badge.badgeType.label;
          case 'assignor_display_name':
            return item.assignorDisplayName ?? '';
          case 'receiver_display_name':
            return item.badge.owner?.displayName ?? '';
          case 'created_at':
          default:
            return item.createdAt ?? '';
        }
      };
      all = [...all].sort((a, b) => sortValueForAll(a).localeCompare(sortValueForAll(b)) * direction);
    }

    return HttpResponse.json({ all });
  }),
  http.put('/minibadge/revoked/given/:badgeId', () => new HttpResponse(null, { status: 200 })),
  http.post('/minibadge/types/:typeId/assign', () => HttpResponse.json({})),

  /** Returns the distinguishable `fakeStatisticsFiltered` whenever `minDate` is present. */
  http.get('/minibadge/statistics', ({ request }) => {
    const url = new URL(request.url);
    const minDate = url.searchParams.get('minDate');
    return HttpResponse.json(minDate ? fakeStatisticsFiltered : fakeStatistics);
  }),
  http.get('/minibadge/statistics/synchronize', () =>
    HttpResponse.json({ message: 'minibadge.statistics.synchronize.unnecessary' }),
  ),

  // Users — `query` filters the fixture by display name to prove it's read.
  http.get('/minibadge/type/:typeId/users-search', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('query');
    const all =
      query && !(fakeUser.displayName ?? '').toLowerCase().includes(query.toLowerCase())
        ? []
        : [fakeUser];
    return HttpResponse.json({ all });
  }),
  /**
   * Filters a small candidate pool by display name, same as every other
   * search handler above — `query=fake` still resolves to exactly
   * `[fakeUser]` (the only candidate whose name contains "fake"), so
   * `services/queries/users.test.tsx`'s existing assertions are unaffected.
   */
  http.get('/minibadge/admin/users-search', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('query');
    const candidates = [fakeUser, fakeAdminSearchUserRevoked, fakeAdminSearchUserSecond];
    const all = query
      ? candidates.filter((user) => (user.displayName ?? '').toLowerCase().includes(query.toLowerCase()))
      : candidates;
    return HttpResponse.json({ all });
  }),

  // Config
  http.get('/minibadge/config', () =>
    HttpResponse.json({
      default_max_assignable: 3,
      default_period_assignable: 'DAY',
      most_assigned_type_list_size: 15,
      less_assigned_type_list_size: 15,
      most_refused_type_list_size: 3,
      most_assigning_user_list_size: 3,
      most_assigning_structure_list_size: 5,
      top_most_assigning_user_list_size: 3,
      top_most_receiving_user_list_size: 3,
      type_lists_users_size: 10,
    }),
  ),

  // Settings
  http.get('/minibadge/global-settings', () =>
    HttpResponse.json({
      pageSize: 10,
      thresholdSettings: [
        {
          structureId: 'd4c3b2a1',
          maxAssignable: 3,
          periodAssignable: 'DAY',
          assignationsNumber: 0,
        },
      ],
    }),
  ),

  // Minibadge charter
  http.put('/minibadge/accept', () => HttpResponse.json({})),
  http.put('/minibadge/refuse', () => HttpResponse.json({})),
  http.put('/minibadge/revoke', () => HttpResponse.json({})),
  http.get('/minibadge/revoked', () => HttpResponse.json({ revoked: false })),

  // Minibadge "chart" (charter consent) — a generic ENT Core user
  // preference, NOT a `/minibadge/*` route. Default fixture: charter
  // already fully accepted, so the transverse `CharterGate` lets the
  // default fixture user straight through without a lightbox — dedicated
  // `CharterGate` tests override this via `server.use(...)` to exercise the
  // "not yet accepted" and other states.
  http.get('/userbook/preference/minibadge.chart', () =>
    HttpResponse.json({
      preference: JSON.stringify({
        acceptChart: '2024-01-01T00:00:00.000Z',
        acceptAssign: '2024-01-01T00:00:00.000Z',
        acceptReceive: '2024-01-01T00:00:00.000Z',
        readChart: '2024-01-01T00:00:00.000Z',
        validateChart: '2024-01-01T00:00:00.000Z',
      }),
    }),
  ),
  http.put('/userbook/preference/minibadge.chart', () => HttpResponse.json({})),
];

export const handlers = [...defaultHandlers, ...minibadgeHandlers];
