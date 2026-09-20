import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatisticsCard } from '.';

describe('StatisticsCard', () => {
  it('renders the label as a heading', () => {
    render(<StatisticsCard label="Les badges">content</StatisticsCard>);

    expect(screen.getByRole('heading', { name: 'Les badges' })).toBeInTheDocument();
  });

  it('renders the provided icon next to the label', () => {
    render(
      <StatisticsCard label="Les badges" icon={<span data-testid="fake-icon" />}>
        content
      </StatisticsCard>,
    );

    expect(screen.getByTestId('fake-icon')).toBeInTheDocument();
  });

  it('renders no icon element when none is provided', () => {
    render(<StatisticsCard label="Les badges">content</StatisticsCard>);

    expect(screen.queryByTestId('fake-icon')).not.toBeInTheDocument();
  });

  it('renders its children', () => {
    render(
      <StatisticsCard label="Les badges">
        <p>child content</p>
      </StatisticsCard>,
    );

    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  it('does not shrink or center the heading by default (centered=false)', () => {
    render(<StatisticsCard label="Les badges">content</StatisticsCard>);

    const heading = screen.getByRole('heading', { name: 'Les badges' });
    expect(heading).not.toHaveClass('h5');
    expect(heading).not.toHaveClass('align-items-center');
  });

  it('stacks the icon above a smaller, centered label when centered is true (KPI-tile style)', () => {
    render(
      <StatisticsCard centered label="42 badges décernés" icon={<span data-testid="fake-icon" />}>
        content
      </StatisticsCard>,
    );

    const heading = screen.getByRole('heading', { name: '42 badges décernés' });
    // `headingStyle="h5"` only changes the visual size class, not the real
    // (semantic) heading level, which stays h3 — the page's heading
    // hierarchy is unaffected by this purely visual option.
    expect(heading.tagName).toBe('H3');
    expect(heading).toHaveClass('h5');
    expect(heading).toHaveClass('flex-column');
    expect(heading).toHaveClass('align-items-center');
  });
});
