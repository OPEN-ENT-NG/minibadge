import { Alert } from '@edifice.io/react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { AssignBadgeLightbox } from '~/components/AssignBadgeLightbox';
import { BadgeCard } from '~/components/BadgeCard';
import { CategoryChip } from '~/components/CategoryChip';
import { EmptyBadgeList } from '~/components/EmptyBadgeList';
import { UserSearchBar } from '~/components/UserSearchBar';
import { BadgeCategory } from '~/models/badgeCategory';
import { BadgeType } from '~/models/badgeType';
import { useMinibadgeAccessContext } from '~/routes/root/CharterGate/context';
import { getBadgeTypes } from '~/services/api/badgeTypes';
import { useBadgeCategories } from '~/services/queries/badgeCategories';

/** Mirrors `string.utils.ts#unaccent` — used to sort categories by name the
 * same way `badge-types.controller.ts#orderCategoriesByName` does. */
const unaccent = (value: string): string => value.normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Mirrors `badge-types.html` + `badge-types.controller.ts` — "Bibliothèque de
 * badges": search + single-select togglable category chips + an infinite-
 * scroll grid of `BadgeCard`s (catalogue mode), each navigating to
 * `/badge-types/:id` on body click and, only if `canAssign()`, offering a
 * single "Décerner" footer button that opens the shared `AssignBadgeLightbox`.
 *
 * PLAN CORRECTION (already flagged at the plan level, restated here): this is
 * a browse/catalogue screen, NOT a CRUD admin screen for badge types — no
 * create/edit/delete of a badge type exists anywhere in this UI (verified
 * against `badge-types.html`/`badge-types.controller.ts`).
 *
 * PAGINATION (Task 4's central gotcha, verified before committing to the
 * simplification): the real AngularJS `insertBadgeTypesKeepingOrder`
 * defends against a page arriving out of alphabetical order relative to
 * what's already loaded. Verified directly against
 * `DefaultBadgeTypeService.java#getBadgesTypesRequest`: `ORDER BY
 * UNACCENT(bt.label) LIMIT ? OFFSET ?` — the backend performs the sort BEFORE
 * paginating (a single global order, sliced), so page N is always exactly the
 * next alphabetical slice after page N-1. Appending pages in request order
 * (plain `useInfiniteQuery`) is therefore byte-for-byte equivalent to the
 * insertion-merge dance for any client that only ever requests forward pages
 * in order — which is exactly what infinite scroll does. The simplification
 * holds; the insertion-merge logic is intentionally NOT ported.
 *
 * Also deliberately does NOT send an explicit `limit` — mirrors the real
 * Angular app just as literally: `badge-types.controller.ts`'s `payload`
 * (`IBadgeTypesPayload`) only ever sets `.offset`/`.query`/`.categoryId`,
 * NEVER `.limit`, relying entirely on the backend's own default page size
 * (`RequestHelper.cappingLimit` -> `Minibadge.PAGE_SIZE`). `getNextPageParam`
 * below computes the next offset purely from the RESPONSE's own echoed
 * `limit`/`offset`/`all.length` (`RequestHelper.formatResponse`), so this
 * needs no dependency on `useGlobalSettings`'s `pageSize` at all — simpler,
 * and immune to any timing race between that query and this one.
 */
export const BadgeTypeLibrary = () => {
  const { t } = useTranslation('minibadge');
  const { canAssign } = useMinibadgeAccessContext();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory>();
  const [assignBadgeType, setAssignBadgeType] = useState<BadgeType>();

  const { categories, query: categoriesQuery } = useBadgeCategories();

  const trimmedQuery = searchQuery.trim() || undefined;
  const categoryId = selectedCategory?.id;

  const badgeTypesQuery = useInfiniteQuery({
    queryKey: ['badgeTypes', 'infinite', trimmedQuery, categoryId],
    queryFn: ({ pageParam }) => getBadgeTypes(pageParam, undefined, trimmedQuery, categoryId),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.all.length < lastPage.limit ? undefined : lastPage.offset + lastPage.limit,
  });

  const badgeTypes = badgeTypesQuery.data?.pages.flatMap((page) => page.all) ?? [];

  const sortedCategories = [...(categories ?? [])].sort((a, b) =>
    unaccent(a.name).localeCompare(unaccent(b.name)),
  );

  // Mirrors `toggleCategory`: reclicking the already-selected category
  // deselects it.
  const handleToggleCategory = (category: BadgeCategory) => {
    setSelectedCategory((current) => (current?.id === category.id ? undefined : category));
  };

  const sentinelRef = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = badgeTypesQuery;
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !isFetchingNextPage) {
        fetchNextPage();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const isEmpty = badgeTypes.length === 0 && !badgeTypesQuery.isLoading;

  return (
    <div>
      {badgeTypesQuery.isError ? <Alert type="danger">{t('minibadge.error.get.badge.types')}</Alert> : null}
      {categoriesQuery.isError ? (
        <Alert type="danger">{t('minibadge.error.get.badge.categories')}</Alert>
      ) : null}

      <UserSearchBar
        ariaLabel={t('minibadge.badge.search')}
        placeholder={t('minibadge.badge.search')}
        onSearch={setSearchQuery}
      />

      {/* No dedicated i18n key exists for "filter by category" (verified: no
          `categor*` key in `backend/src/main/resources/i18n/fr.json`), and
          the old `aria-label` reused the unrelated "search badges" string —
          screen readers announced this group as the search box. Each chip
          button already has its own accessible name (the category name), so
          the group role doesn't need a label of its own. */}
      <div role="group">
        {sortedCategories.map((category) => {
          const isSelected = selectedCategory?.id === category.id;
          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => handleToggleCategory(category)}
            >
              <CategoryChip category={category} />
            </button>
          );
        })}
      </div>

      {isEmpty ? (
        <EmptyBadgeList />
      ) : (
        <div>
          {badgeTypes.map((badgeType) => (
            <BadgeCard
              key={badgeType.id}
              badgeType={badgeType}
              onClick={() => navigate(`/badge-types/${badgeType.id}`)}
              footerAction={
                canAssign
                  ? { label: t('minibadge.badge.assign'), onClick: () => setAssignBadgeType(badgeType) }
                  : undefined
              }
            />
          ))}
        </div>
      )}

      <div ref={sentinelRef} />

      <AssignBadgeLightbox
        badgeType={assignBadgeType}
        isOpen={!!assignBadgeType}
        onClose={() => setAssignBadgeType(undefined)}
      />
    </div>
  );
};
