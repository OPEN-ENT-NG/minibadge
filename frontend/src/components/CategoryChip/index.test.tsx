import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { fakeBadgeCategory } from '~/mocks/handlers';

import { CategoryChip } from '.';

describe('CategoryChip', () => {
  it('renders the category name', () => {
    render(<CategoryChip category={fakeBadgeCategory} />);

    expect(screen.getByText(fakeBadgeCategory.name)).toBeInTheDocument();
  });
});
