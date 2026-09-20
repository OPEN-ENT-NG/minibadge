import { Heading } from '@edifice.io/react';
import { ReactNode } from 'react';

/**
 * A titled card — icon (optional) + label as an `<h3>`, then a content area
 * — used all over the Statistics screen.
 *
 * Deliberately hand-rolled instead of `@edifice.io/react`'s `Card`/`Card.Title`:
 * `Card.Title` hardcodes a hard 2-line clamp (`text-truncate-2`) on its
 * heading with no way to opt out via props. That's fine for `BadgeCard`'s
 * short, fixed names, but `label` here is often a full formatted sentence
 * with a live count baked in — materially more likely to silently clip.
 *
 * `h-100`: the Statistics grid stretches every `Grid.Col` in a row to the
 * tallest one, so without `h-100` the card itself wouldn't fill that
 * already-equal-height cell.
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
