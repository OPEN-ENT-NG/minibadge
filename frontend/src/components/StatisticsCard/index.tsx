import { Heading } from '@edifice.io/react';
import { ReactNode } from 'react';

/**
 * Mirror of `minibadge-statistics-card` (`statistics-card.directive.ts` +
 * `.html`): a titled card — icon (optional) + label as an `<h3>`, then a
 * content area — used all over the Statistics screen (Phase 6). No logic of
 * its own, exactly like the source directive.
 *
 * REVIEW FIX (react-reviewer, MEDIUM): the previous justification for not
 * reusing `@edifice.io/react`'s `Card` here was incomplete/wrong on two
 * points, caught in review — corrected below with what was actually
 * verified this time, reading `Card`/`CardTitle`/`CardBody`/`CardHeader`/
 * `CardContext`'s `.d.ts` AND `.js` sources directly (not just the types):
 *
 * - `Card.Body`'s `gap`/`space`/`padding` props are all optional
 *   (`gap?: "0" | "8" | "16" | null`, etc. — `CardBody.d.ts`), so it DOES
 *   work as a plain `children` wrapper when omitted (`CardBody.js`: with no
 *   `space`, neither class is even added). That was wrong in the prior
 *   comment.
 * - `Card.Title` (`children: ReactNode; className?: string` —
 *   `CardTitle.d.ts`) WAS considered this time as the icon+label slot, and
 *   `Card`'s `isSelectable`/`isClickable` defaulting to `true` (the actual
 *   reason `Card.Header`'s unconditional render matters) is NOT a blocker
 *   either — `BadgeCard` (Phase 2/4, `components/BadgeCard/index.tsx`)
 *   already establishes the fix for that exact trap: pass
 *   `isSelectable={false} isClickable={false}` explicitly.
 *
 * The REAL, verified blocker: `CardTitle.js` hardcodes
 * `"card-title body text-break text-truncate text-truncate-2"` on its
 * wrapping `<h3>` — `text-truncate-2` (confirmed in
 * `node_modules/@edifice.io/bootstrap/dist/index.css`) is
 * `-webkit-line-clamp: 2` with `overflow` hidden, i.e. a HARD, unconditional
 * 2-line clamp with no way to opt out via props. `BadgeCard` can accept that
 * for its short, fixed badge-type names; `StatisticsCard`'s `label` is very
 * often a full formatted sentence with a live count baked in (e.g.
 * `minibadge.statistics.most.allowed.badges`/`...most.active.structures`,
 * built through `formatMessage`), which is materially more likely to
 * silently clip in French on real screen widths — a genuine visual
 * regression `Card.Title` would introduce and the current unclamped
 * `Heading` doesn't have. So the hand-rolled approach stays: `Heading`
 * (`level`/`children`/`className`, no unrelated constraints) for the label,
 * plain semantic HTML for the rest — same approach `BadgeSection` (Phase 2)
 * already uses for its own titled-container case.
 *
 * Visual chrome (`bg-white rounded-4 shadow-sm p-16`): this component had
 * NONE at all despite its name — a bare `<section>`, indistinguishable from
 * plain text on the page. `h-100` matches `BadgeCard`'s own convention: the
 * Statistics grid (`Grid`, CSS Grid with default `align-items: stretch`)
 * already stretches every `Grid.Col` in a row to the tallest one; without
 * `h-100` the card itself wouldn't fill that already-equal-height cell.
 */
export interface StatisticsCardProps {
  icon?: ReactNode;
  label: string;
  children: ReactNode;
  className?: string;
  /**
   * KPI-tile style: stacks the icon above the label, both centered, label
   * rendered smaller (`headingStyle="h5"` — a Bootstrap size override,
   * `Heading`'s semantic `level` stays `h3`, so the page's heading hierarchy
   * is unaffected). Defaults to `false` — the icon sitting inline next to
   * the label at full `h3` size, unchanged for every other card on the page.
   */
  centered?: boolean;
}

export const StatisticsCard = ({ icon, label, children, className, centered }: StatisticsCardProps) => {
  return (
    <section className={`bg-white rounded-4 shadow-sm p-16 h-100${className ? ` ${className}` : ''}`}>
      <Heading
        level="h3"
        headingStyle={centered ? 'h5' : undefined}
        className={centered ? 'd-flex flex-column align-items-center gap-8' : undefined}
      >
        {icon}
        <span>{label}</span>
      </Heading>
      <div>{children}</div>
    </section>
  );
};
