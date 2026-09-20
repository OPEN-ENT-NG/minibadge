import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EmptyBadgeList } from '.';

describe('EmptyBadgeList', () => {
  it('renders the default empty-list text', () => {
    render(<EmptyBadgeList />);

    expect(screen.getByText('minibadge.badge.empty.statement')).toBeInTheDocument();
  });

  it('renders custom title/text when provided', () => {
    render(<EmptyBadgeList title="Titre" text="Texte personnalisé" />);

    expect(screen.getByText('Titre')).toBeInTheDocument();
    expect(screen.getByText('Texte personnalisé')).toBeInTheDocument();
  });
});
