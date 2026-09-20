import { IconRafterDown } from '@edifice.io/react/icons';
import { ReactNode, useEffect, useRef, useState } from 'react';

import { BadgeCard, BadgeCardAction } from '~/components/BadgeCard';
import { Badge } from '~/models/badge';

/**
 * Mirror of `minibadge-badge-list` (`badge-list.directive.ts` +
 * `badge-list.html`): a clickable header (label/icon/count) that
 * collapses/expands a grid of `BadgeCard`s.
 *
 * OPEN/CLOSE LOGIC — verified line-by-line against
 * `badge-list.directive.ts#checkOpenedListStatus` (not just against the
 * plan's paraphrase of it, which reads as if `defaultOpen={false}` still
 * auto-reopens on an empty→non-empty transition; the real source guards the
 * OPENING branch only, not the closing one):
 *
 * ```ts
 * if ((!oldBadges || !oldBadges.length) && (newBadges && !!newBadges.length) &&
 *     !(typeof isDefaultOpenedList === 'boolean' && isDefaultOpenedList === false))
 *   isOpenedList = true;
 * else if (oldBadges && newBadges && !!oldBadges.length && (!newBadges || !newBadges.length))
 *   isOpenedList = false;
 * ```
 *
 * i.e. transitioning from an empty list to a non-empty one auto-*opens* the
 * section, UNLESS `defaultOpen` was explicitly passed as `false` (the
 * "refused" section on `main.html`) — that guard exists only on the opening
 * branch. Transitioning from non-empty back to empty always auto-*closes*
 * it, with no such guard, regardless of `defaultOpen`. `forceOpen` mirrors
 * `is-opened-option` — bound only on the refused section on `main.html`,
 * forcing the body visible (without touching the collapsed/expanded state
 * itself) whenever there is an active search query.
 */
export interface BadgeSectionProps {
  label: string;
  icon?: ReactNode;
  badges: Badge[];
  /** Explicit `false` mirrors `is-default-opened-list="false"`. Omit/`true` for the default (auto-open) sections. */
  defaultOpen?: boolean;
  /** Mirrors `is-opened-option`: forces the body visible regardless of the collapsed state. */
  forceOpen?: boolean;
  getActions?: (badge: Badge) => BadgeCardAction[];
  className?: string;
}

export const BadgeSection = ({
  label,
  icon,
  badges,
  defaultOpen,
  forceOpen,
  getActions,
  className,
}: BadgeSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen === true);
  const previousLengthRef = useRef(badges.length);

  useEffect(() => {
    const previousLength = previousLengthRef.current;
    const currentLength = badges.length;

    if (previousLength === 0 && currentLength > 0 && defaultOpen !== false) {
      setIsOpen(true);
    } else if (previousLength > 0 && currentLength === 0) {
      setIsOpen(false);
    }

    previousLengthRef.current = currentLength;
  }, [badges.length, defaultOpen]);

  const hasBadges = badges.length > 0;
  const isVisible = (isOpen || !!forceOpen) && hasBadges;

  const handleToggle = () => {
    if (hasBadges) setIsOpen((previous) => !previous);
  };

  return (
    <section className={className}>
      <button
        type="button"
        className="minibadge-badge-section-header d-flex align-items-center gap-8"
        onClick={handleToggle}
        aria-expanded={isVisible}
        disabled={!hasBadges}
      >
        <IconRafterDown
          className={isVisible ? 'minibadge-badge-section-icon-opened' : undefined}
          style={{ transform: isVisible ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        />
        {icon}
        <span>{label}</span>
        <span>({badges.length})</span>
      </button>
      {isVisible ? (
        <div className="minibadge-badge-cards flex-row f-wrap">
          {badges.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} actions={getActions ? getActions(badge) : undefined} />
          ))}
        </div>
      ) : null}
    </section>
  );
};
