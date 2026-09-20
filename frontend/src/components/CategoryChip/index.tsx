import { Badge as DsBadge } from '@edifice.io/react';

import { BadgeCategory } from '~/models/badgeCategory';

/**
 * Props verified against the installed `@edifice.io/react` type declarations
 * (`node_modules/@edifice.io/react/dist/components/Badge/Badge.d.ts`):
 * `variant` (here the `{ type: 'chip' }` variant), `className`, `children`.
 */
export interface CategoryChipProps {
  category: BadgeCategory;
  className?: string;
}

export const CategoryChip = ({ category, className }: CategoryChipProps) => {
  return (
    <DsBadge variant={{ type: 'chip' }} className={className}>
      {category.iconCssClass ? <i className={category.iconCssClass} aria-hidden="true" /> : null}
      {category.name}
    </DsBadge>
  );
};
