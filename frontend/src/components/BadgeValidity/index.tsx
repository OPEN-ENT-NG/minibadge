import { IconCalendar, IconClockAlert } from '@edifice.io/react/icons';
import { useTranslation } from 'react-i18next';

import { formatIsoDateFr } from '~/utils/date';
import { formatMessage } from '~/utils/translate';

/**
 * Validity status of a badge (Epic C): an "Expiré" indicator, or "Valable jusqu'au JJ/MM/AAAA" when
 * the badge has an end date that is not past yet, or nothing at all for a permanent badge.
 *
 * The expired state never relies on color alone: it always carries the word "Expiré" as text, plus an
 * icon (hidden from assistive tech, the text already says it). The danger color is only a third cue.
 *
 * Callers decide what "expired" means for what they display (see `~/utils/badgeStatus`): a received
 * badge (every assignment expired), one assignment row, or a badge type whose end date is past.
 */
export interface BadgeValidityProps {
  isExpired: boolean;
  /** End date (`YYYY-MM-DD`) to show while the badge is still valid; ignored once expired. */
  validUntil?: string | null;
  className?: string;
}

export const BadgeValidity = ({ isExpired, validUntil, className }: BadgeValidityProps) => {
  const { t } = useTranslation('minibadge');

  if (isExpired) {
    return (
      <span className={`d-inline-flex align-items-center gap-4 small fw-bold text-danger${className ? ` ${className}` : ''}`}>
        <IconClockAlert width={16} height={16} aria-hidden="true" focusable="false" />
        {t('minibadge.badge.expired')}
      </span>
    );
  }

  if (validUntil) {
    return (
      <span className={`d-inline-flex align-items-center gap-4 small text-gray-700${className ? ` ${className}` : ''}`}>
        <IconCalendar width={16} height={16} aria-hidden="true" focusable="false" />
        {formatMessage(t, 'minibadge.badge.valid.until', [formatIsoDateFr(validUntil)])}
      </span>
    );
  }

  return null;
};
