import { EmptyScreen, emptyScreenMapping } from '@edifice.io/react';
import { useTranslation } from 'react-i18next';

/**
 * Props verified against the installed `@edifice.io/react` type declarations
 * (`node_modules/@edifice.io/react/dist/components/EmptyScreen/EmptyScreen.d.ts`):
 * `imageSrc` (required), `title`, `text`, `className`.
 *
 * `imageSrc` defaults to the design system's generic "empty" illustration
 * (`emptyScreenMapping.one.empty`) — `'minibadge'` is not one of the fixed
 * `AppKeys` the mapping supports, so a minibadge-specific illustration isn't
 * available; callers may override with their own `imageSrc`.
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
      imageSrc={imageSrc ?? emptyScreenMapping.one.empty}
      title={title}
      text={text ?? t('minibadge.badge.empty.statement')}
      className={className}
    />
  );
};
