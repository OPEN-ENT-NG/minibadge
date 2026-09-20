import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BadgeChart } from '.';

describe('BadgeChart', () => {
  it('renders without throwing for a bar chart with categories', () => {
    const { container } = render(
      <BadgeChart
        type="bar"
        series={[{ name: 'Badges', data: [1, 2, 3] }]}
        categories={['Jan', 'Feb', 'Mar']}
      />,
    );

    expect(container.firstChild).not.toBeNull();
  });

  it('renders without throwing for a donut chart with no categories', () => {
    const { container } = render(<BadgeChart type="donut" series={[1, 2, 3]} />);

    expect(container.firstChild).not.toBeNull();
  });

  it('renders no visually-hidden textual fallback when accessibleItems is omitted', () => {
    const { container } = render(
      <BadgeChart type="bar" series={[{ name: 'Badges', data: [1, 2, 3] }]} categories={['Jan', 'Feb', 'Mar']} />,
    );

    expect(container.querySelector('.visually-hidden')).toBeNull();
  });

  it('renders a visually-hidden textual list mirroring ALL of the chart data, not just the first 3', () => {
    // REVIEW FIX (react-reviewer, HIGH): a bar chart is an SVG with no text
    // alternative — anything past what the on-screen cards happen to show
    // (typically capped at 3) would otherwise be invisible to screen-reader
    // users. This asserts a 5-item chart exposes all 5, not a truncated 3.
    const accessibleItems = [
      { label: 'Badge A', value: '10 fois' },
      { label: 'Badge B', value: '8 fois' },
      { label: 'Badge C', value: '6 fois' },
      { label: 'Badge D', value: '4 fois' },
      { label: 'Badge E', value: '2 fois' },
    ];

    const { container } = render(
      <BadgeChart
        type="bar"
        series={[{ name: 'Badges', data: [10, 8, 6, 4, 2] }]}
        categories={accessibleItems.map((item) => item.label)}
        accessibleItems={accessibleItems}
      />,
    );

    const hidden = container.querySelector('.visually-hidden');
    expect(hidden).not.toBeNull();
    accessibleItems.forEach((item) => {
      expect(hidden).toHaveTextContent(`${item.label}: ${item.value}`);
    });
  });

  it('does not render the visually-hidden node when accessibleItems is an empty array', () => {
    const { container } = render(
      <BadgeChart type="bar" series={[{ name: 'Badges', data: [] }]} categories={[]} accessibleItems={[]} />,
    );

    expect(container.querySelector('.visually-hidden')).toBeNull();
  });
});
