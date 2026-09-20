import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { fakeBadge, fakeBadgeType } from '~/mocks/handlers';

import { BadgeCard } from '.';

describe('BadgeCard', () => {
  it('renders the badge type label and short description', () => {
    render(<BadgeCard badge={fakeBadge} />);

    expect(screen.getByText(fakeBadge.badgeType.label)).toBeInTheDocument();
    expect(screen.getByText(fakeBadge.badgeType.descriptionShort!)).toBeInTheDocument();
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

    it('renders no footer button when footerAction is absent', () => {
      render(<BadgeCard badgeType={fakeBadgeType} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders the single footer button and calls its onClick', async () => {
      const user = userEvent.setup();
      const onFooterAction = vi.fn();
      render(
        <BadgeCard
          badgeType={fakeBadgeType}
          footerAction={{ label: 'Décerner', onClick: onFooterAction }}
        />,
      );

      const footerButton = screen.getByRole('button', { name: 'Décerner' });
      expect(footerButton).toBeInTheDocument();

      await user.click(footerButton);

      expect(onFooterAction).toHaveBeenCalledTimes(1);
    });

    /**
     * PHASE 4 (Task 2 fix): proves `onClick` (body → navigate) and
     * `footerAction` (footer → "Décerner") coexist on the SAME card without
     * either handler stealing the other's click — this is the exact
     * combination the badge-types library screen needs for every card a user
     * `canAssign()` on. jsdom/Testing Library dispatch events directly to the
     * target node rather than doing real coordinate-based hit-testing, so
     * this cannot exercise the CSS stacking fix itself (see the component's
     * doc comment for that), but it does prove both handlers are wired to
     * their own, distinct elements and fire independently.
     */
    it('calls the right handler when both onClick and footerAction are set on the same card', async () => {
      const user = userEvent.setup();
      const onBodyClick = vi.fn();
      const onFooterAction = vi.fn();
      render(
        <BadgeCard
          badgeType={fakeBadgeType}
          onClick={onBodyClick}
          footerAction={{ label: 'Décerner', onClick: onFooterAction }}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'Décerner' }));
      expect(onFooterAction).toHaveBeenCalledTimes(1);
      expect(onBodyClick).not.toHaveBeenCalled();

      await user.click(screen.getByRole('button', { name: 'card.open.resource' }));
      expect(onBodyClick).toHaveBeenCalledTimes(1);
      expect(onFooterAction).toHaveBeenCalledTimes(1);
    });
  });
});
