import commonPlaceholder from '@edifice.io/bootstrap/dist/images/common/image-placeholder.png';
import { Card, Dropdown, Flex, Image } from '@edifice.io/react';
import { IconOptions } from '@edifice.io/react/icons';
import { useTranslation } from 'react-i18next';

import { BadgeValidity } from '~/components/BadgeValidity';
import { CategoryChip } from '~/components/CategoryChip';
import { Badge } from '~/models/badge';
import { BadgeType } from '~/models/badgeType';
import { isBadgeTypeExpired, isExpiredBadge } from '~/utils/badgeStatus';
import { getPictoSrc } from '~/utils/picto';
import { stripHtmlTags } from '~/utils/stripHtml';

/**
 * `Card`'s own default for `isSelectable` is `true`, and whenever it's
 * truthy `CardHeader` renders an "options menu" icon button unconditionally
 * — including when `undefined` is passed through (default parameters apply
 * on `undefined`, not just on an omitted prop). Hardcoded `false` here (no
 * `onSelect` is ever wired) avoids silently showing that dead button.
 * `isClickable` is always `false` too: see "Click target" below.
 *
 * Image: rendered as a direct child of `Card` (a sibling of `Card.Body`, not
 * nested inside it) so it isn't inset by `Card.Body`'s own padding —
 * `Card`'s root has `overflow: hidden` and its own `border-radius`, so a
 * full-width image flush against the top edge is clipped to the card's
 * rounded corners for free, without any custom CSS. `Card.Image`'s own
 * `landscape` variant doesn't actually constrain a height in the installed
 * CSS (its `--edifice-aspect-ratio` custom property is declared but never
 * consumed by any `aspect-ratio` rule), so `Image`'s `ratio="21"` uses the
 * standard Bootstrap `.ratio.ratio-21x9` mechanism instead.
 * `objectFit="contain"` (not `"cover"`) shows the whole picture rather than
 * cropping it — badge pictures are small illustrations, not photos meant to
 * bleed off the edges — with a neutral background behind it (own wrapper
 * `<div>`, since `Image`'s `className` only reaches the inner `<img>`, not
 * its `ratio` wrapper, leaving no other way to color the letterboxing
 * `contain` can produce). `type.pictureId` being absent is handled
 * explicitly via `imageSrc` below, since `Image`'s `src` is a required prop
 * and only a load *failure* falls back to `imgPlaceholder` automatically.
 *
 * Categories: overlaid in the top-right corner of the image (the image's
 * wrapper `<div>` is `position-relative`, the chips row `position-absolute
 * top-0 end-0`) rather than in `Card.Body` — a floating tag, not a body
 * element. No `z-index` fight needed against `CardHeader`'s invisible
 * full-cover click overlay: that overlay is `opacity-0`, so whichever of the
 * two paints on top, the chips stay visible either way — only click
 * interception would need it, and the chips have no click handler of their
 * own to steal.
 *
 * Description: shown in full via a plain `<p>`, not `Card.Text` —
 * `CardText.js` hardcodes `text-truncate text-truncate-1` unconditionally (a
 * `className` prop only ever adds classes, it can't remove those two),
 * which would cut the description down to a single line. Descriptions can
 * contain HTML markup; this app never uses `dangerouslySetInnerHTML` for
 * admin-authored content, so `stripHtmlTags` shows the text without ever
 * rendering that markup.
 *
 * Click target: `Card`'s own `isClickable` overlay is a full-cover `<button>` whose accessible name is
 * the fixed, generic `aria-label="card.open.resource"` — it cannot be overridden, and it hides
 * everything the card says (label, "Expiré"). So `isClickable` stays `false` and this component
 * renders the same invisible full-cover button itself, named after what it opens: the badge label,
 * plus "Expiré" when it is.
 *
 * Validity (Epic C): a received `badge` shows "Expiré" once all its assignments have expired (the
 * public/private/refused section it sits in is unchanged — expiry is an overlay, not a status); a
 * library `badgeType` shows its end date, or "Expiré" once that date is past. A received badge never
 * shows the type's CURRENT end date: its own assignments carry the date frozen when they were made.
 *
 * `actions` composes a `Dropdown` in `Card.Footer` (the only slot that
 * accepts arbitrary children) because `Card.onSelect`/`isSelectable` only
 * wire a single generic callback to one fixed icon button — they can't
 * render a list of distinct labelled actions.
 *
 * `h-100`: both real usages place this inside `Grid.Col` — `Grid`'s own
 * `.grid` class is `display: grid` with no `align-items` override, so grid
 * cells already stretch to the tallest row member for free. `Card`'s root
 * has no height of its own though (a plain flex column sized to its
 * content), so without `h-100` it wouldn't actually fill that
 * already-stretched cell — cards with a longer description would end up
 * taller than their row siblings. `Card.Body`'s own `flex: 1 1 auto` then
 * absorbs the extra height, keeping `Card.Footer`'s actions menu pinned to
 * the bottom on every card, short or long. Outside a grid, `height: 100%`
 * on a parent with no definite height simply resolves to `auto`, so this is
 * a no-op there.
 */
export interface BadgeCardAction {
  label: string;
  /** `JSX.Element`, not the broader `ReactNode` — matches `Dropdown.Item`'s own `icon` prop type. */
  icon: JSX.Element;
  onClick: () => void;
}

type BadgeCardSource = { badge: Badge; badgeType?: never } | { badge?: never; badgeType: BadgeType };

export type BadgeCardProps = BadgeCardSource & {
  isSelected?: boolean;
  onClick?: () => void;
  actions?: BadgeCardAction[];
  className?: string;
};

export const BadgeCard = ({ badge, badgeType, isSelected, onClick, actions, className }: BadgeCardProps) => {
  const { t } = useTranslation();
  const { t: tMinibadge } = useTranslation('minibadge');
  const type = badge ? badge.badgeType : badgeType;
  const imageSrc = getPictoSrc(type.pictureId) ?? commonPlaceholder;
  const description = type.descriptionShort ? stripHtmlTags(type.descriptionShort) : undefined;
  const isExpired = badge ? isExpiredBadge(badge) : isBadgeTypeExpired(type);
  const validUntil = badge ? undefined : type.setting?.validUntil;

  return (
    <Card
      isClickable={false}
      isSelectable={false}
      isSelected={!!isSelected}
      className={`h-100${onClick ? ' c-pointer' : ''}${className ? ` ${className}` : ''}`}
    >
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="position-absolute bottom-0 end-0 top-0 start-0 opacity-0 z-1 w-100"
          aria-label={isExpired ? `${type.label}, ${tMinibadge('minibadge.badge.expired')}` : type.label}
        />
      ) : null}
      <div className="bg-gray-200 position-relative">
        <Image src={imageSrc} imgPlaceholder={commonPlaceholder} alt="" ratio="21" objectFit="contain" />
        {type.categories.length > 0 ? (
          <Flex wrap="wrap" justify="end" gap="8" className="position-absolute top-0 end-0 p-8">
            {type.categories.map((category) => (
              <CategoryChip key={category.id} category={category} />
            ))}
          </Flex>
        ) : null}
      </div>
      <Card.Body flexDirection="column" gap="8">
        <Card.Title>{type.label}</Card.Title>
        <BadgeValidity isExpired={isExpired} validUntil={validUntil} />
        {description ? <p className="card-text small text-break mb-0">{description}</p> : null}
      </Card.Body>
      {actions && actions.length > 0 ? (
        <Card.Footer>
          <Dropdown>
            <Dropdown.Trigger icon={<IconOptions />} variant="ghost" aria-label={t('card.open.menu')} />
            <Dropdown.Menu>
              {actions.map((action) => (
                <Dropdown.Item key={action.label} icon={action.icon} onClick={action.onClick}>
                  {action.label}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </Card.Footer>
      ) : null}
    </Card>
  );
};
