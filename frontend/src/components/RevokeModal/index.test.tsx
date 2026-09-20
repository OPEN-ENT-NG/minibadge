import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RevokeModal } from '.';

describe('RevokeModal', () => {
  it('renders nothing when closed', () => {
    render(<RevokeModal isOpen={false} onCancel={vi.fn()} onConfirm={vi.fn()} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the confirm/cancel actions when open', async () => {
    render(<RevokeModal isOpen={true} onCancel={vi.fn()} onConfirm={vi.fn()} />);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('minibadge.given.lightbox.title')).toBeInTheDocument();
    expect(screen.getByText('minibadge.given.lightbox.label')).toBeInTheDocument();
  });

  it('calls onConfirm when the confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<RevokeModal isOpen={true} onCancel={vi.fn()} onConfirm={onConfirm} />);

    await screen.findByRole('dialog');
    await user.click(screen.getByText('minibadge.given.lightbox.confirm'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when the cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<RevokeModal isOpen={true} onCancel={onCancel} onConfirm={vi.fn()} />);

    await screen.findByRole('dialog');
    await user.click(screen.getByText('minibadge.cancel'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
