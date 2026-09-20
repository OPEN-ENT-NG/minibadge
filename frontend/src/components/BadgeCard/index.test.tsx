import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { fakeBadge, fakeBadgeType } from '~/mocks/handlers';

import { BadgeCard } from '.';

describe('BadgeCard', () => {
  it('renders the badge type label and full short description', () => {
    render(<BadgeCard badge={fakeBadge} />);

    expect(screen.getByText(fakeBadge.badgeType.label)).toBeInTheDocument();
    expect(screen.getByText(fakeBadge.badgeType.descriptionShort!)).toBeInTheDocument();
  });

  it('does not truncate the description to a single line (not rendered via Card.Text)', () => {
    const longDescription = 'Une description volontairement longue pour vérifier qu’elle ne soit pas coupée après une seule ligne.';
    render(
      <BadgeCard badge={{ ...fakeBadge, badgeType: { ...fakeBadge.badgeType, descriptionShort: longDescription } }} />,
    );

    const description = screen.getByText(longDescription);
    expect(description).not.toHaveClass('text-truncate');
    expect(description).not.toHaveClass('text-truncate-1');
  });

  it('renders the badge type categories as (colored) chips', () => {
    render(<BadgeCard badge={fakeBadge} />);

    expect(screen.getByText(fakeBadge.badgeType.categories[0].name)).toBeInTheDocument();
  });

  it('renders no category chips when the badge type has none', () => {
    render(<BadgeCard badge={{ ...fakeBadge, badgeType: { ...fakeBadge.badgeType, categories: [] } }} />);

    expect(screen.queryByText(fakeBadge.badgeType.categories[0].name)).not.toBeInTheDocument();
  });

  it('does not render a clickable overlay when no onClick is given', () => {
    render(<BadgeCard badge={fakeBadge} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<BadgeCard badge={fakeBadge} onClick={onClick} />);

    await user.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders no actions menu when actions is absent or empty', () => {
    const { rerender } = render(<BadgeCard badge={fakeBadge} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    rerender(<BadgeCard badge={fakeBadge} actions={[]} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('opens the actions menu and calls the right action on click, then closes it', async () => {
    const user = userEvent.setup();
    const onPrivatize = vi.fn();
    const onRefuse = vi.fn();
    render(
      <BadgeCard
        badge={fakeBadge}
        actions={[
          { label: 'Rendre privé', icon: <span />, onClick: onPrivatize },
          { label: 'Refuser', icon: <span />, onClick: onRefuse },
        ]}
      />,
    );

    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button'));

    expect(screen.getByRole('menuitem', { name: 'Rendre privé' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Refuser' })).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: 'Refuser' }));

    expect(onRefuse).toHaveBeenCalledTimes(1);
    expect(onPrivatize).not.toHaveBeenCalled();
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
  });

  /**
   * PHASE 4 (Task 2): the "catalogue" usage mode — a bare `BadgeType` instead
   * of an owned `Badge` (the badge-types library screen has no `Badge`
   * instance to show, only the type itself).
   */
  describe('catalogue mode (badgeType instead of badge)', () => {
    it('renders the badge type label and short description from a bare BadgeType', () => {
      render(<BadgeCard badgeType={fakeBadgeType} />);

      expect(screen.getByText(fakeBadgeType.label)).toBeInTheDocument();
      expect(screen.getByText(fakeBadgeType.descriptionShort!)).toBeInTheDocument();
    });

    it('strips HTML markup from the description instead of showing the literal tags', () => {
      render(
        <BadgeCard badgeType={{ ...fakeBadgeType, descriptionShort: '<p>Acte</p><p>d’entraide</p>' }} />,
      );

      expect(screen.getByText('Acte d’entraide')).toBeInTheDocument();
      expect(screen.queryByText(/<p>/)).not.toBeInTheDocument();
    });

    it('renders no footer at all in catalogue mode (no more "Décerner" shortcut on the card)', () => {
      render(<BadgeCard badgeType={fakeBadgeType} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders the badge type picture as a cover image', () => {
      // Decorative (`alt=""`, matching `routes/statistics`/`routes/badge-type-detail`'s
      // same badge pictures) — excluded from the accessibility tree's "img"
      // role by design, so queried by tag instead of by role.
      const { container } = render(<BadgeCard badgeType={fakeBadgeType} />);

      const image = container.querySelector('img');
      expect(image).toHaveAttribute('src', expect.stringContaining(`/minibadge/public/img/${fakeBadgeType.pictureId}`));
    });
  });
});
