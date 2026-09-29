import { render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import i18n from '~/i18n';

import { BadgeValidity } from '.';

/**
 * The test i18n backend serves no translations (keys come back as-is), so a positional `{0}` would
 * never be substituted. The one key whose substitution this component is responsible for is given
 * its real French copy here.
 */
beforeAll(() => {
  i18n.addResource('fr', 'minibadge', 'minibadge.badge.valid.until', 'Valable jusqu’au {0}');
});
afterAll(() => {
  i18n.removeResourceBundle('fr', 'minibadge');
});

describe('BadgeValidity', () => {
  it('says "Expiré" in words, not only through color', () => {
    const { container } = render(<BadgeValidity isExpired validUntil="2026-06-30" />);

    expect(screen.getByText('minibadge.badge.expired')).toBeInTheDocument();
    // The icon is decorative: the text already carries the meaning for assistive tech.
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByText(/Valable/)).not.toBeInTheDocument();
  });

  it('shows the end date in DD/MM/YYYY while the badge is still valid', () => {
    render(<BadgeValidity isExpired={false} validUntil="2027-06-30" />);

    expect(screen.getByText('Valable jusqu’au 30/06/2027')).toBeInTheDocument();
    expect(screen.queryByText('minibadge.badge.expired')).not.toBeInTheDocument();
  });

  it('renders nothing for a permanent badge', () => {
    const { container } = render(<BadgeValidity isExpired={false} validUntil={null} />);

    expect(container).toBeEmptyDOMElement();
  });
});
