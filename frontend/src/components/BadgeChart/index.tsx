import { VisuallyHidden } from '@edifice.io/react';
import { ApexOptions } from 'apexcharts';
import Chart from 'react-apexcharts';

/**
 * Minimal wrapper around `react-apexcharts` — there is no chart component in
 * `@edifice.io/react`.
 *
 * The SVG the chart engine renders has no text alternative for assistive
 * tech. `accessibleItems`, when provided, renders the same label/value pairs
 * the bars represent as real text, hidden visually but present in the
 * accessibility tree, via `VisuallyHidden`. `VisuallyHidden` only renders a
 * `<span>`, which is phrasing content and cannot legally contain a
 * `<ul>`/`<li>` list — so the fallback is a single run of nested `<span>`s
 * instead, kept valid HTML while still exposing every item, not just
 * however many the visible chart/cards elsewhere on the same screen happen
 * to show.
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
