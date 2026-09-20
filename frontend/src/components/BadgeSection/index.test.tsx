import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { fakeBadge } from '~/mocks/handlers';
import { Badge } from '~/models/badge';

import { BadgeSection } from '.';

const otherBadge: Badge = { ...fakeBadge, id: 101 };

describe('BadgeSection', () => {
  it('renders no cards and stays closed when there are no badges', () => {
    render(<BadgeSection label="Badges publics" badges={[]} />);

    expect(screen.queryByText(fakeBadge.badgeType.label)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Badges publics/ })).toHaveAttribute('aria-expanded', 'false');
  });

  it('does not auto-open just because badges are already non-empty on the very first render', () => {
    render(<BadgeSection label="Badges publics" badges={[fakeBadge]} />);

    // Mirrors the real AngularJS $watch: its very first invocation has
    // oldValue === newValue (same reference), so no empty->non-empty
    // transition is observed yet on first mount either.
    expect(screen.queryByText(fakeBadge.badgeType.label)).not.toBeInTheDocument();
  });

  it('auto-opens when transitioning from empty to non-empty (default behavior)', () => {
    const { rerender } = render(<BadgeSection label="Badges publics" badges={[]} />);
    expect(screen.queryByText(fakeBadge.badgeType.label)).not.toBeInTheDocument();

    rerender(<BadgeSection label="Badges publics" badges={[fakeBadge]} />);

    expect(screen.getByText(fakeBadge.badgeType.label)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Badges publics/ })).toHaveAttribute('aria-expanded', 'true');
  });

  it('auto-closes when transitioning from non-empty back to empty', () => {
    const { rerender } = render(<BadgeSection label="Badges publics" badges={[]} />);
    rerender(<BadgeSection label="Badges publics" badges={[fakeBadge]} />);
    expect(screen.getByText(fakeBadge.badgeType.label)).toBeInTheDocument();

    rerender(<BadgeSection label="Badges publics" badges={[]} />);

    expect(screen.queryByText(fakeBadge.badgeType.label)).not.toBeInTheDocument();
  });

  it('respects defaultOpen={false}: stays closed initially even when badges are non-empty from the start', () => {
    render(<BadgeSection label="Badges refusés" badges={[fakeBadge]} defaultOpen={false} />);

    expect(screen.queryByText(fakeBadge.badgeType.label)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Badges refusés/ })).toHaveAttribute('aria-expanded', 'false');
  });

  it('defaultOpen={false} never auto-opens on an empty->non-empty transition (guard verified against the real source)', () => {
    const { rerender } = render(<BadgeSection label="Badges refusés" badges={[]} defaultOpen={false} />);

    rerender(<BadgeSection label="Badges refusés" badges={[fakeBadge]} defaultOpen={false} />);

    expect(screen.queryByText(fakeBadge.badgeType.label)).not.toBeInTheDocument();
  });

  it('the closing branch resets the open state unconditionally, even under defaultOpen={false} (no guard on that branch in the real source)', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<BadgeSection label="Badges refusés" badges={[fakeBadge]} defaultOpen={false} />);

    // Manually open it (the only way to open a defaultOpen={false} section).
    await user.click(screen.getByRole('button', { name: /Badges refusés/ }));
    expect(screen.getByText(fakeBadge.badgeType.label)).toBeInTheDocument();

    // Transition to empty, then back to non-empty: if the closing branch had
    // reset the open state (as the real source does, unconditionally), the
    // reopen is blocked by the defaultOpen={false} guard on the opening
    // branch, so it must come back closed.
    rerender(<BadgeSection label="Badges refusés" badges={[]} defaultOpen={false} />);
    rerender(<BadgeSection label="Badges refusés" badges={[fakeBadge]} defaultOpen={false} />);

    expect(screen.queryByText(fakeBadge.badgeType.label)).not.toBeInTheDocument();
  });

  it('forceOpen shows the body regardless of the collapsed state, without touching it (is-opened-option)', () => {
    render(<BadgeSection label="Badges refusés" badges={[fakeBadge]} defaultOpen={false} forceOpen />);

    expect(screen.getByText(fakeBadge.badgeType.label)).toBeInTheDocument();
  });

  it('clicking the header toggles the section open/closed when it has badges', async () => {
    const user = userEvent.setup();
    render(<BadgeSection label="Badges publics" badges={[fakeBadge, otherBadge]} defaultOpen />);

    expect(screen.getAllByText(fakeBadge.badgeType.label).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /Badges publics/ }));
    expect(screen.queryByText(fakeBadge.badgeType.label)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Badges publics/ }));
    expect(screen.getAllByText(fakeBadge.badgeType.label).length).toBeGreaterThan(0);
  });

  it('clicking the header does nothing when the section has no badges', async () => {
    const user = userEvent.setup();
    render(<BadgeSection label="Badges publics" badges={[]} />);

    const header = screen.getByRole('button', { name: /Badges publics/ });
    expect(header).toBeDisabled();
    await user.click(header);

    expect(header).toHaveAttribute('aria-expanded', 'false');
  });

  it('passes per-badge actions computed by getActions to each BadgeCard', async () => {
    const user = userEvent.setup();
    const onPrivatize = vi.fn();
    render(
      <BadgeSection
        label="Badges publics"
        badges={[fakeBadge]}
        defaultOpen
        getActions={() => [{ label: 'Rendre privé', icon: <span />, onClick: onPrivatize }]}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'card.open.menu' }));
    await user.click(screen.getByRole('menuitem', { name: 'Rendre privé' }));

    expect(onPrivatize).toHaveBeenCalledTimes(1);
  });
});
