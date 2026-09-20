import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { fakeBadgeCategory } from '~/mocks/handlers';

import { CategoryChip } from '.';

describe('CategoryChip', () => {
  it('renders the category name', () => {
    render(<CategoryChip category={fakeBadgeCategory} />);

    expect(screen.getByText(fakeBadgeCategory.name)).toBeInTheDocument();
  });

  /**
   * The whole chip (not just its text) must be colored — `bg-gray-200` is
   * hardcoded, unconditionally, by the design system's own `chip` variant
   * (`Badge.js`), and it's `!important` in the compiled CSS, same as every
   * `bg-{color}-200` utility: a plain color class silently loses that fight
   * (see the component's own doc comment). The fix overrides what
   * `--edifice-gray-200` resolves to on this element instead, via an inline
   * style — asserted here directly, since a class-based assertion would
   * have passed even with the original (broken) approach.
   */
  it('colors the whole chip (background var override + text class) for each of the 4 real categories, fixed by slug', () => {
    const cases: [string, string, string][] = [
      ['APPETENCE', 'var(--edifice-blue-200)', 'text-blue-800'],
      ['COMPETENCE', 'var(--edifice-green-200)', 'text-green-800'],
      ['ENGAGEMENT', 'var(--edifice-orange-200)', 'text-orange-800'],
      ['GRATITUDE', 'var(--edifice-pink-200)', 'text-pink-800'],
    ];

    for (const [slug, expectedBackgroundVar, expectedTextClass] of cases) {
      const { container, unmount } = render(
        <CategoryChip category={{ ...fakeBadgeCategory, slug, name: slug }} />,
      );
      const chip = container.firstChild as HTMLElement;
      expect(chip.style.getPropertyValue('--edifice-gray-200')).toBe(expectedBackgroundVar);
      expect(chip).toHaveClass(expectedTextClass);
      unmount();
    }
  });

  it('falls back to the plain, uncolored chip for an unknown slug (e.g. this app\'s own test fixtures)', () => {
    const { container } = render(<CategoryChip category={fakeBadgeCategory} />);

    const chip = container.firstChild as HTMLElement;
    expect(chip.style.getPropertyValue('--edifice-gray-200')).toBe('');
    expect(chip.className).not.toMatch(/text-(blue|green|orange|pink)-800/);
  });
});
