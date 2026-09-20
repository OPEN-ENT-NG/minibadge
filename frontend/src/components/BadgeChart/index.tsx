import { VisuallyHidden } from '@edifice.io/react';
import { ApexOptions } from 'apexcharts';
import Chart from 'react-apexcharts';

/**
 * Minimal wrapper around `react-apexcharts`, chosen because the `apexcharts`
 * engine is already what the current AngularJS frontend uses for its charts
 * (see `chart.directive.ts` / `column-graph.directive.ts`), guaranteeing
 * visual parity once the Statistics screen (Phase 6) is ported. There is no
 * chart component in `@edifice.io/react` (verified: no `Chart` export in
 * `node_modules/@edifice.io/react/dist/components/index.d.ts`) — this is a
 * genuine gap, not a design-system wrapper.
 *
 * Props verified against the installed `react-apexcharts` type declaration
 * (`node_modules/react-apexcharts/types/react-apexcharts.d.ts`): `type`,
 * `series`, `options`, `height`.
 *
 * REVIEW FIX (react-reviewer, HIGH): the SVG the chart engine renders has no
 * text alternative at all for assistive tech — a screen-reader user gets
 * nothing. `accessibleItems`, when provided, renders the exact same
 * label/value pairs the bars represent as real text, hidden visually but
 * present in the accessibility tree, via `@edifice.io/react`'s own
 * `VisuallyHidden` (verified: `VisuallyHidden` IS exported from
 * `node_modules/@edifice.io/react/dist/components/index.d.ts`, so no ad-hoc
 * sr-only CSS class is needed). `VisuallyHidden` only renders a `<span>`
 * (`VisuallyHidden.js`), which is phrasing content and cannot legally
 * contain a `<ul>`/`<li>` list — so the fallback is a single run of nested
 * `<span>`s (also phrasing content) rather than list markup, kept valid
 * HTML while still exposing every item, not just however many the visible
 * chart/cards elsewhere on the same screen happen to show.
 */
export type BadgeChartType = 'bar' | 'line' | 'pie' | 'donut';

export interface BadgeChartAccessibleItem {
  label: string;
  /** Already formatted for display (e.g. via `formatMessage`), not a raw number. */
  value: string;
}

export interface BadgeChartProps {
  type: BadgeChartType;
  series: ApexOptions['series'];
  categories?: string[];
  height?: number | string;
  className?: string;
  /** Textual equivalent of the chart's data, for assistive tech (see class doc). */
  accessibleItems?: BadgeChartAccessibleItem[];
}

export const BadgeChart = ({
  type,
  series,
  categories,
  height = 300,
  className,
  accessibleItems,
}: BadgeChartProps) => {
  const options: ApexOptions = {
    chart: {
      type,
      toolbar: { show: false },
    },
    ...(categories ? { xaxis: { categories } } : {}),
  };

  return (
    <div className={className}>
      <Chart type={type} series={series} options={options} height={height} />
      {accessibleItems && accessibleItems.length > 0 ? (
        <VisuallyHidden>
          <span>
            {accessibleItems.map((item, index) => (
              <span key={`${item.label}-${index}`}>
                {`${item.label}: ${item.value}`}
                {index < accessibleItems.length - 1 ? ', ' : ''}
              </span>
            ))}
          </span>
        </VisuallyHidden>
      ) : null}
    </div>
  );
};
