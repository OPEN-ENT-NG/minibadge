import { Alert, Dropdown, Flex, Grid } from '@edifice.io/react';
import { IconFilter } from '@edifice.io/react/icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { BadgeCard } from '~/components/BadgeCard';
import { EmptyBadgeList } from '~/components/EmptyBadgeList';
import { UserSearchBar } from '~/components/UserSearchBar';
import { BadgeCategory } from '~/models/badgeCategory';
import { getBadgeTypes } from '~/services/api/badgeTypes';
import { useBadgeCategories } from '~/services/queries/badgeCategories';

/** Mirrors `string.utils.ts#unaccent` — used to sort categories by name the
 * same way `badge-types.controller.ts#orderCategoriesByName` does. */
const unaccent = (value: string): string => value.normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Mirrors `badge-types.html` + `badge-types.controller.ts` — "Bibliothèque de
 * badges": a search bar + a single category-filter dropdown to its right
 * (communities' `SearchBarResources` layout, single-select radio items — not
 * a row of always-visible chips) + an infinite-scroll grid of `BadgeCard`s
 * (catalogue mode), each navigating to `/badge-types/:id` on click — that
 * detail screen (not the card itself, communities-card-style) is where
 * "Décerner" actually lives.
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
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory>();

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

      {/* Mirrors communities' `SearchBarResources`: search bar + a single
          filter dropdown to its right, instead of a row of always-visible
          togglable category chips (4 categories today, but a row of chips
          doesn't scale — a platform could configure many more). The padded
          gray box itself matches `SearchBarCommunities`. */}
      <Flex gap="8" className="p-24 bg-gray-200 mb-16">
        <UserSearchBar
          ariaLabel={t('minibadge.badge.search')}
          placeholder={t('minibadge.badge.search')}
          onSearch={setSearchQuery}
          className="w-100"
        />
        <Dropdown>
          <Dropdown.Trigger
            label={t('minibadge.filter.by.category')}
            icon={<IconFilter />}
            variant="ghost"
            badgeContent={selectedCategory ? 1 : undefined}
          />
          <Dropdown.Menu>
            {sortedCategories.map((category) => (
              <Dropdown.RadioItem
                key={category.id}
                value={String(category.id)}
                model={selectedCategory ? String(selectedCategory.id) : ''}
                onChange={() => handleToggleCategory(category)}
              >
                {category.name}
              </Dropdown.RadioItem>
            ))}
          </Dropdown.Menu>
        </Dropdown>
      </Flex>

      {isEmpty ? (
        <EmptyBadgeList title={t('minibadge.no.result')} />
      ) : (
        <Grid>
          {badgeTypes.map((badgeType) => (
            <Grid.Col sm="4" md="4" lg="4" xl="3" key={badgeType.id}>
              <BadgeCard badgeType={badgeType} onClick={() => navigate(`/badge-types/${badgeType.id}`)} />
            </Grid.Col>
          ))}
        </Grid>
      )}

      <div ref={sentinelRef} />
    </div>
  );
};
