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

/** Strips accents so category names sort consistently regardless of
 * diacritics. */
const unaccent = (value: string): string => value.normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * "Bibliothèque de badges": search bar + a category-filter dropdown, plus an
 * infinite-scroll grid of `BadgeCard`s (browse/catalogue screen — there's no
 * create/edit/delete of a badge type anywhere in this UI; that lives in the
 * detail screen).
 *
 * Pages are appended in request order with no client-side merge/sort: the
 * backend (`DefaultBadgeTypeService.java#getBadgesTypesRequest`) always
 * orders by `UNACCENT(label)` BEFORE paginating (`LIMIT ? OFFSET ?`), so
 * each page is already the next alphabetical slice — appending pages in
 * request order is therefore equivalent to a sorted merge for a client that
 * only ever requests forward pages, which is exactly what infinite scroll
 * does here.
 *
 * No explicit `limit` is sent — `getNextPageParam` computes the next offset
 * purely from the response's own echoed `limit`/`offset`/`all.length`, so it
 * has no dependency on `useGlobalSettings`'s `pageSize` and can't race
 * against it.
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

      {/* A single filter dropdown, not a row of always-visible togglable
          category chips (4 categories today, but a row of chips doesn't
          scale as more get configured). Row on desktop (`flex-md-row`),
          stacked full-width on mobile (`direction="column"` is the
          base/mobile-first value) — without it, the search bar's
          `flex-fill` and the filter dropdown fought for space on a single
          un-wrapping row below `md` and overflowed instead of stacking. */}
      <Flex direction="column" align="stretch" gap="8" className="p-24 bg-gray-200 mb-16 flex-md-row">
        <UserSearchBar
          ariaLabel={t('minibadge.badge.search')}
          placeholder={t('minibadge.badge.search')}
          onSearch={setSearchQuery}
          className="flex-fill"
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
