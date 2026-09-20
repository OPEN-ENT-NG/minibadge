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
});
