import { Alert, Flex } from '@edifice.io/react';
import { useTranslation } from 'react-i18next';

import { CategoryChip } from '~/components/CategoryChip';
import { useBadgeCategories } from '~/services/queries/badgeCategories';

/**
 * Multi-select of badge categories, as a row of togglable chips.
 *
 * Deliberately NOT the single-select `Dropdown` the badge library screen uses for its category
 * filter: that comment argues against a chip row *for a toolbar filter*, where only one value can be
 * active and the control competes for horizontal space with a search bar. Here the underlying data
 * really is multi-valued (`BadgeType.categories` is an array, `rel_badge_category_badge_type` a
 * many-to-many table), the control sits in a form with its own line, and a chip row shows every
 * selected value at once instead of hiding the selection behind a trigger.
 *
 * `CategoryChip` is purely presentational (no `onClick`/`selected` of its own), so each chip is
 * wrapped in a real `<button aria-pressed>` — a toggle button, which is the correct role for an
 * independent on/off control, as opposed to the mutually exclusive radios of `PictoPicker`.
 *
 * Selecting nothing is allowed: a badge type with no category is valid server-side.
 */
export interface CategoryMultiSelectProps {
  /** Ids of the currently selected categories. */
  value: number[];
  onChange: (categoryIds: number[]) => void;
  /** Accessible name of the group (the form field's label). */
  label: string;
}

export const CategoryMultiSelect = ({ value, onChange, label }: CategoryMultiSelectProps) => {
  const { t } = useTranslation('minibadge');
  const { categories, query } = useBadgeCategories();

  const toggle = (categoryId: number) => {
    onChange(
      value.includes(categoryId)
        ? value.filter((selectedId) => selectedId !== categoryId)
        : [...value, categoryId],
    );
  };

  if (query.isError) {
    return <Alert type="danger">{t('minibadge.error.get.badge.categories.picker')}</Alert>;
  }

  return (
    <Flex wrap="wrap" gap="8" role="group" aria-label={label}>
      {(categories ?? []).map((category) => (
        <button
          key={category.id}
          type="button"
          aria-pressed={value.includes(category.id)}
          onClick={() => toggle(category.id)}
          // `border-transparent` (rather than no border at all) keeps the chip's size identical
          // whether or not it is selected, so toggling doesn't reflow the row.
          className={`btn p-0 border border-2 rounded-pill ${
            value.includes(category.id) ? 'border-primary' : 'border-transparent'
          }`}
        >
          <CategoryChip category={category} />
        </button>
      ))}
    </Flex>
  );
};
