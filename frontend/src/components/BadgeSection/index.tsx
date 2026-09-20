import { Flex, Grid } from '@edifice.io/react';
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
      {/* Divider-style section header — mirrors communities' `Section`
          (`CommunitiesInvitationsList.tsx`: a `h4 text-gray-500` label
          followed by a line filling the remaining width). Kept as a
          `<button>` (not a plain divider) since, unlike communities' static
          sections, this one still collapses/expands (see the OPEN/CLOSE
          LOGIC above) — button-reset utilities remove the native chrome so
          the label+line still reads as a divider. */}
      <button
        type="button"
        className="w-100 p-0 border-0 bg-transparent text-start mb-16"
        onClick={handleToggle}
        aria-expanded={isVisible}
        disabled={!hasBadges}
      >
        <Flex align="center" gap="8" className="w-100">
          <IconRafterDown style={{ transform: isVisible ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
          {icon}
          <span className="h4 text-gray-500 mb-0">
            {label} ({badges.length})
          </span>
          <div className="bg-gray-500" style={{ height: 1, flex: 1, marginLeft: 10 }} />
        </Flex>
      </button>
      {isVisible ? (
        <Grid>
          {badges.map((badge) => (
            <Grid.Col sm="4" md="4" lg="4" xl="3" key={badge.id}>
              <BadgeCard badge={badge} actions={getActions ? getActions(badge) : undefined} />
            </Grid.Col>
          ))}
        </Grid>
      ) : null}
    </section>
  );
};
