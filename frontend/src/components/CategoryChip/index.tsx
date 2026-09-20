import { Badge as DsBadge } from '@edifice.io/react';
import { CSSProperties } from 'react';

import { BadgeCategory } from '~/models/badgeCategory';

/**
 * `Badge`'s `chip` variant hardcodes a `bg-gray-200` class, and since Bootstrap's
 * color utilities are all `!important` with `.bg-gray-200` declared after every
 * `.bg-{color}-200` rule in the compiled CSS, it always wins the cascade — a
 * `bg-{color}-200` class on this element would silently do nothing. Overriding
 * what the `--edifice-gray-200` custom property resolves to (via inline style)
 * sidesteps that fight instead of trying to win it.
 *
 * Colors are keyed by `slug` (the stable identifier — `name`/`id` aren't).
 * Any unknown slug falls back to the default, uncolored chip.
 */
const CATEGORY_COLORS: Record<string, { backgroundVar: string; textClass: string }> = {
  APPETENCE: { backgroundVar: '--edifice-blue-200', textClass: 'text-blue-800' },
  COMPETENCE: { backgroundVar: '--edifice-green-200', textClass: 'text-green-800' },
  ENGAGEMENT: { backgroundVar: '--edifice-orange-200', textClass: 'text-orange-800' },
  GRATITUDE: { backgroundVar: '--edifice-pink-200', textClass: 'text-pink-800' },
};

export interface CategoryChipProps {
  category: BadgeCategory;
  className?: string;
}

export const CategoryChip = ({ category, className }: CategoryChipProps) => {
  const color = CATEGORY_COLORS[category.slug?.toUpperCase()];
  const classes = [color?.textClass, className].filter(Boolean).join(' ') || undefined;
  const style = color ? ({ '--edifice-gray-200': `var(${color.backgroundVar})` } as CSSProperties) : undefined;

  return (
    <DsBadge variant={{ type: 'chip' }} className={classes} style={style}>
      {category.iconCssClass ? <i className={category.iconCssClass} aria-hidden="true" /> : null}
      {category.name}
    </DsBadge>
  );
};
