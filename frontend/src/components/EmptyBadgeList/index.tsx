import { EmptyScreen } from '@edifice.io/react';
import { useTranslation } from 'react-i18next';

import illuSearch from '~/assets/illu-search.svg';

/**
 * Props verified against the installed `@edifice.io/react` type declarations
 * (`node_modules/@edifice.io/react/dist/components/EmptyScreen/EmptyScreen.d.ts`):
 * `imageSrc` (required), `title`, `text`, `className`.
 *
 * `imageSrc` defaults to `illu-search.svg`, copied into this project's own
 * `src/assets/` (not resolved through `@edifice.io/bootstrap`'s bundled
 * images or `emptyScreenMapping`, neither of which ship this specific
 * illustration) — `'minibadge'` isn't one of the fixed `AppKeys`
 * `emptyScreenMapping` supports either way, so there's no design-system
 * asset specific to this app; callers may override with their own
 * `imageSrc`.
 *
 * `text` defaults to the existing `minibadge.badge.empty.statement` key
 * ("Aucun badge ne correspond à votre recherche", already shipped in
 * `backend/src/main/resources/i18n/fr.json`) — no new i18n key added.
 */
export interface EmptyBadgeListProps {
  title?: string;
  text?: string;
  imageSrc?: string;
  className?: string;
}

export const EmptyBadgeList = ({ title, text, imageSrc, className }: EmptyBadgeListProps) => {
  const { t } = useTranslation('minibadge');

  return (
    <EmptyScreen
      imageSrc={imageSrc ?? illuSearch}
      title={title}
      text={text ?? t('minibadge.badge.empty.statement')}
      className={className}
    />
  );
};
