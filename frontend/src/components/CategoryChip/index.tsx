import { Badge as DsBadge } from '@edifice.io/react';
import { CSSProperties } from 'react';

import { BadgeCategory } from '~/models/badgeCategory';

/**
 * Props verified against the installed `@edifice.io/react` type declarations
 * (`node_modules/@edifice.io/react/dist/components/Card/Badge.d.ts`):
 * `variant` (here the `{ type: 'chip' }` variant), `className`, `children`.
 * `ChipBadgeVariant` (`{ type: 'chip' }`) has no color/level option of its
 * own (unlike `notification`/`status`/`content`).
 *
 * GOTCHA VERIFIED (why this isn't just a `bg-{color}-200` class, which was
 * tried first and silently did nothing): `Badge.js` hardcodes
 * `variant.type === "chip" && "bg-gray-200"` unconditionally into its own
 * class list, and the compiled CSS is `.bg-gray-200{background-color:
 * var(--edifice-gray-200) !important}` — every color utility
 * (`.bg-blue-200`, etc.) is ALSO `!important`. Between two `!important`
 * rules of equal specificity, the one declared LATER in the stylesheet wins
 * — verified directly against the compiled
 * `@edifice.io/bootstrap/dist/index.css`, `.bg-gray-200` sits after every
 * `.bg-{color}-200` rule, so it always won regardless of class order in the
 * `class` attribute: the chip's background stayed plain gray, only its text
 * (`text-{color}-800`, which the chip variant never sets itself, so nothing
 * competed with it) actually took the color.
 *
 * FIX: don't fight `!important` — override what `--edifice-gray-200`
 * itself RESOLVES TO on this one element instead, via an inline style
 * (`CSSProperties` custom-property keys need the `as CSSProperties` cast:
 * TypeScript's own type doesn't model arbitrary `--*` keys). `.bg-gray-200`
 * still "wins" the cascade exactly as before, but the color it paints is now
 * the one this element's inline style defines for that variable — the
 * `!important` fight becomes irrelevant since neither side is being
 * overridden, only the variable's value changes locally.
 *
 * The 4 real categories (verified against
 * `backend/src/main/resources/sql/018-create-and-insert-badge-categories.sql`'s
 * `slug` column, the only stable identifier — `name` could be relabeled,
 * `id` depends on insertion order) each get one FIXED, distinct color below
 * — a plain object literal, so it never varies between renders or reloads.
 * Any other slug (including this app's own test fixtures) falls back to the
 * default, uncolored chip rather than guessing a color for a category that
 * doesn't exist yet.
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
