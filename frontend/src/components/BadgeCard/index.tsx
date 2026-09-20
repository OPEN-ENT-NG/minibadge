import commonPlaceholder from '@edifice.io/bootstrap/dist/images/common/image-placeholder.png';
import { Card, Dropdown, Flex, Image } from '@edifice.io/react';
import { IconOptions } from '@edifice.io/react/icons';
import { useTranslation } from 'react-i18next';

import { CategoryChip } from '~/components/CategoryChip';
import { Badge } from '~/models/badge';
import { BadgeType } from '~/models/badgeType';
import { stripHtmlTags } from '~/utils/stripHtml';

/**
 * `isSelectable`/`isClickable` GOTCHA (verified in `Card.js`): `Card`'s own
 * default for `isSelectable` is `true`, and whenever it's truthy `CardHeader`
 * renders an "options menu" icon button unconditionally — including when
 * `undefined` is passed through (default parameters apply on `undefined`,
 * not just on an omitted prop). Hardcoded `false` here (no `onSelect` is
 * ever wired) avoids silently showing that dead button. `isClickable` is
 * forced to `!!onClick` for the same reason: `Card` renders a full-cover
 * invisible `<button>` whenever it's true, which would be a pointless (and
 * bad for a11y) click target with no handler.
 *
 * Image: `type.pictureId` resolves to `/minibadge/public/img/{id}` — the
 * same URL pattern already used by `routes/statistics` and
 * `routes/badge-type-detail`. Rendered as a direct child of `Card` (a
 * sibling of `Card.Body`, not nested inside it) so it isn't inset by
 * `Card.Body`'s own padding — `Card`'s root has `overflow: hidden` and its
 * own `border-radius`, so a full-width image flush against the top edge is
 * clipped to the card's rounded corners for free, communities-style,
 * without any custom CSS. `Card.Image`'s own `landscape` variant was tried
 * first but doesn't actually constrain a height in the installed CSS (its
 * `--edifice-aspect-ratio` custom property is declared but never consumed
 * by any `aspect-ratio` rule) — `Image`'s `ratio="21"` (a shorter box than
 * `"16"`) uses the standard, reliable Bootstrap `.ratio.ratio-21x9`
 * mechanism instead. `objectFit="contain"` (not `"cover"`) shows the whole
 * picture rather than cropping it to fill the box — badge pictures are
 * small illustrations, not photos meant to bleed off the edges — with a
 * neutral background behind it (own wrapper `<div>`: `Image`'s `ratio`
 * wrapper only ever gets the two `ratio`/`ratio-Nx9` classes, `className`
 * only reaches the inner `<img>`, so there's no other way to color the
 * letterboxing `contain` can leave). `imgPlaceholder` covers a broken/
 * missing picture (falls back to the design system's own generic
 * placeholder via `useImage`'s `onError`); `type.pictureId` being absent
 * altogether is handled explicitly (`imageSrc` below), since `Image`'s
 * `src` is a required prop and only a load *failure* falls back
 * automatically.
 *
 * Categories: overlaid in the top-right corner of the image (the image's
 * wrapper `<div>` is `position-relative`, the chips row `position-absolute
 * top-0 end-0`) rather than in `Card.Body` — a floating tag, not a body
 * element. No `z-index` fight needed against `CardHeader`'s invisible
 * full-cover click overlay (see the `isClickable` gotcha above): that
 * overlay is `opacity-0`, so whichever of the two paints "on top" per
 * stacking order, the chips stay visible either way — only click
 * interception would need it, and the chips have no click handler of their
 * own to steal.
 *
 * Description: shown in FULL, not via `Card.Text` — `CardText.js` hardcodes
 * `text-truncate text-truncate-1` unconditionally (a `className` prop only
 * ever ADDS classes via `clsx`, it can't remove those two), which was
 * cutting the description down to a single line. Rendered as a plain `<p>`
 * instead, carrying the same typographic classes (`card-text small
 * text-break`) minus the two truncating ones. Real badge type descriptions
 * can also contain HTML markup (the source rendered them via `bind-html`);
 * this app never uses `dangerouslySetInnerHTML` for admin-authored content,
 * so `stripHtmlTags` (see its own doc comment) shows the text without ever
 * rendering that markup.
 *
 * `actions` mirrors the AngularJS `ActionOption` model (`label`, `icon`,
 * `action`): the "my-badges" screen's per-status quick-action menu
 * (Privatiser/Refuser/Publier/Accepter). `Card.onSelect`/`isSelectable` only
 * wires a single generic callback to one fixed icon button — it can't render
 * a list of distinct labelled actions, so this composes `Dropdown` instead,
 * in `Card.Footer` (the only slot that accepts arbitrary children).
 *
 * `h-100`: both real usages (`components/BadgeSection`, `routes/badge-types`)
 * place this inside `Grid.Col` — `Grid`'s own `.grid` class is `display:
 * grid` with no `align-items` override, so grid cells already stretch to the
 * tallest row member for free. `Card`'s root has no height of its own
 * though (a plain flex column sized to its content), so without `h-100` it
 * wouldn't actually fill that already-stretched cell — cards with a longer
 * (untruncated) description would end up taller than their row siblings.
 * `Card.Body`'s own `flex: 1 1 auto` then absorbs the extra height, keeping
 * `Card.Footer`'s actions menu pinned to the bottom on every card, short or
 * long. Outside a grid, `height: 100%` on a parent with no definite height
 * simply resolves to `auto` (CSS spec), so this is a no-op there.
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
  const type = badge ? badge.badgeType : badgeType;
  const imageSrc = type.pictureId ? `/minibadge/public/img/${type.pictureId}` : commonPlaceholder;
  const description = type.descriptionShort ? stripHtmlTags(type.descriptionShort) : undefined;

  return (
    <Card
      isClickable={!!onClick}
      isSelectable={false}
      isSelected={!!isSelected}
      onClick={onClick}
      className={`h-100${className ? ` ${className}` : ''}`}
    >
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
