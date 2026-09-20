import { Button, Card, Dropdown } from '@edifice.io/react';
import { IconOptions } from '@edifice.io/react/icons';
import { useTranslation } from 'react-i18next';

import { Badge } from '~/models/badge';
import { BadgeType } from '~/models/badgeType';

/**
 * Props verified against the installed `@edifice.io/react` type declarations
 * (`node_modules/@edifice.io/react/dist/components/Card/Card.d.ts`):
 * `isClickable`, `isSelectable`, `isSelected`, `onClick`, `className`.
 *
 * IMPLEMENTATION TRAP AVOIDED: `Card`'s own default for `isSelectable` is
 * `true` (see `Card.js`'s `Root` destructuring, `isSelectable = true`), and
 * `CardHeader` then renders an "options menu" icon button whenever it's
 * truthy — including when `undefined` is passed through (default parameters
 * apply on `undefined`, not just on an omitted prop). Explicitly defaulting
 * to `false` here avoids silently showing that menu button on every card.
 * Likewise `isClickable` is forced to `!!onClick`, since `Card` also renders
 * a full-cover invisible `<button>` whenever it's true — pointless (and bad
 * for a11y) when there is no `onClick` to wire it to.
 *
 * Deliberately does NOT attempt to render `badge.badgeType.pictureId` as an
 * `<img>`/`Card.Image` — this phase has no verified way to resolve a picture
 * id to a workspace document URL (out of scope, not invented; left for the
 * screen that actually needs it, per the plan's "don't invent unseen fields"
 * guidance).
 *
 * REVIEW FIX (react-reviewer, MEDIUM): `isSelectable` used to be an exposed
 * prop with no `onSelect` ever passed to `Card`. `Card` wires its
 * options-menu button (rendered by `CardHeader` whenever `isSelectable` is
 * truthy) to `onSelect` from `CardContext` — so flipping `isSelectable` on
 * would have shown a dead button. This phase builds infrastructure, not
 * screen behavior, so `isSelectable` is dropped from the public API entirely
 * and hardcoded `false` here (a plain, non-selectable badge card). Add
 * `onSelect?: () => void` back (with `isSelectable={!!onSelect}`) if/when a
 * future screen actually needs selection.
 *
 * PHASE 2 (Task 3): `actions` — mirrors the AngularJS `ActionOption` model
 * (`label`, `icon`, `action`) used by `minibadge.controller.ts` to attach a
 * per-status quick-action menu (Privatiser/Refuser/Publier/Accepter) to each
 * badge card. `Card.onSelect`/`isSelectable` (verified in `Card.d.ts`/
 * `CardHeader.js`) only wires a single generic callback to one fixed
 * "options" icon button — it cannot render a list of distinct labelled
 * actions, so this composes `Dropdown` (verified in `Dropdown.d.ts`) instead,
 * exactly as prescribed by the plan.
 *
 * PLACEMENT: `Card.Header` (verified in `CardHeader.js`) takes **no props at
 * all** — it's rendered unconditionally by `Card` itself right after
 * `CardContext.Provider`, reading only `isSelectable`/`isClickable`/`onSelect`
 * from context, and cannot host arbitrary children. `Card.Footer` is the only
 * slot that actually accepts `children`, so the actions menu lives there.
 *
 * KNOWN LIMITATION, narrowed in Phase 4: when `isClickable` (i.e. `onClick`
 * is also passed) `CardHeader` renders an absolutely positioned, full-cover
 * invisible `<button className="position-absolute ... opacity-0 z-1 w-100">`
 * (verified in `CardHeader.js`) over the whole card for navigation. Being a
 * positioned element, it paints above `Card.Footer`'s content (a plain,
 * non-positioned `<div className="card-footer">`, per `CardFooter.js`) and
 * would silently intercept every click meant for that footer — CSS stacking
 * order, not z-index magnitude, decides this (a positioned element always
 * paints above a non-positioned sibling regardless of DOM order or z-index
 * value). Phase 4's catalogue card needs `onClick` (body → navigate) AND
 * `footerAction` (footer → "Décerner") TOGETHER on the very same card
 * whenever `canAssign()` — unlike the Phase 2 `actions` case, this combo IS
 * actually exercised, so it's fixed here rather than merely documented: the
 * `footerAction` button below is wrapped in `position-relative z-2` (Bootstrap
 * utility classes, matching `CardHeader.js`'s own `z-1`/`z-3` convention,
 * `@edifice.io/bootstrap` already a dependency) so it wins the stacking
 * comparison against the overlay's `z-1` within their shared (unpositioned
 * `.card`/`.card-footer`) stacking context. The Phase 2 `actions` Dropdown is
 * NOT given the same treatment — no real screen combines `actions` with
 * `onClick` on the same card, so that combination remains an accepted,
 * documented (not fixed) limitation.
 *
 * PHASE 4 (Task 2): a second "catalogue" usage mode, for the badge-types
 * library screen (`routes/badge-types`) and its shared `AssignBadgeLightbox`
 * card preview (`sniplet-badge-assign.html:8`,
 * `<minibadge-card-type badge-type="vm.badgeType">`). Two changes, both
 * additive and designed to coexist with the Phase 2 `actions` mode without
 * conflict:
 *
 * - `badgeType?: BadgeType` — the catalogue screen has no owned `Badge`
 *   instance to show, only a bare `BadgeType` (mirrors `minibadge-card-type`
 *   taking `badge-type` directly, unlike the Phase 1/2 usage which always had
 *   a `Badge`). `badge` and `badgeType` are mutually exclusive (enforced by
 *   the union below) — exactly one is ever provided by a real caller, so
 *   there is no ambiguity about which one "wins".
 * - `onClick` already existed (Task 2's own note: "déjà existant ? vérifier"
 *   — confirmed, nothing to add) and is exactly the catalogue's
 *   "clic sur le corps → navigue vers le détail" behavior.
 * - `footerAction?: BadgeCardFooterAction` — the catalogue's single
 *   "Décerner" footer button (`badge-types.controller.ts`'s
 *   `getCardFooter`/`CARD_FOOTER.AWARD_BADGE`, only shown when
 *   `canAssign()`), rendered in the same `Card.Footer` slot the Phase 2
 *   `actions` Dropdown uses. The real product never shows both at once (no
 *   screen has both a per-status actions menu AND a "Décerner" button on the
 *   same card), so `actions` is checked first and `footerAction` only
 *   renders when `actions` is absent/empty — this is a coexistence
 *   safeguard, not a feature to combine.
 */
export interface BadgeCardAction {
  label: string;
  /** `JSX.Element`, not the broader `ReactNode` — matches `Dropdown.Item`'s own `icon` prop type. */
  icon: JSX.Element;
  onClick: () => void;
}

export interface BadgeCardFooterAction {
  label: string;
  onClick: () => void;
}

type BadgeCardSource = { badge: Badge; badgeType?: never } | { badge?: never; badgeType: BadgeType };

export type BadgeCardProps = BadgeCardSource & {
  isSelected?: boolean;
  onClick?: () => void;
  actions?: BadgeCardAction[];
  footerAction?: BadgeCardFooterAction;
  className?: string;
};

export const BadgeCard = ({
  badge,
  badgeType,
  isSelected,
  onClick,
  actions,
  footerAction,
  className,
}: BadgeCardProps) => {
  const { t } = useTranslation();
  const type = badge ? badge.badgeType : badgeType;

  return (
    <Card
      isClickable={!!onClick}
      isSelectable={false}
      isSelected={!!isSelected}
      onClick={onClick}
      className={className}
    >
      <Card.Body>
        <Card.Title>{type.label}</Card.Title>
        {type.descriptionShort ? <Card.Text>{type.descriptionShort}</Card.Text> : null}
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
      ) : footerAction ? (
        <Card.Footer>
          <div className="position-relative z-2">
            <Button color="primary" variant="filled" onClick={footerAction.onClick}>
              {footerAction.label}
            </Button>
          </div>
        </Card.Footer>
      ) : null}
    </Card>
  );
};
