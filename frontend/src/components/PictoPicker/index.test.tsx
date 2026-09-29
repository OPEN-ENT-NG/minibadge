import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PICTO_IDS, PictoId } from '~/config/constants';

import { PictoPicker } from '.';

function renderPicker({ value }: { value?: PictoId } = {}) {
  const onChange = vi.fn();
  const utils = render(<PictoPicker value={value} onChange={onChange} label="Illustration" />);
  return { ...utils, onChange };
}

describe('PictoPicker', () => {
  it('renders one radio per curated picto inside a single radiogroup', () => {
    renderPicker();

    const group = screen.getByRole('radiogroup', { name: 'Illustration' });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(PICTO_IDS.length);
  });

  /**
   * The tiles are icon-only, so each option's `aria-label` IS its entire accessible name. Deriving
   * it from the SVG filename left all 29 in French (accents stripped: `egalite genre`) inside a
   * modal otherwise fully translated — so every option must name an i18n key, never a filename.
   * Translations aren't loaded under test (`t` echoes the key back), which is exactly what makes
   * "a key, not a filename" assertable here.
   */
  it('names every option from an i18n key rather than from its filename', () => {
    renderPicker();

    PICTO_IDS.forEach((pictoId) => {
      const key = `minibadge.picto.${pictoId.replace(/\.svg$/, '')}`;
      expect(screen.getByRole('radio', { name: key })).toBeInTheDocument();
    });
    expect(screen.queryByRole('radio', { name: 'egalite genre' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'travail equipe' })).not.toBeInTheDocument();
  });

  it('selects a picto on click', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPicker();

    await user.click(screen.getByRole('radio', { name: 'minibadge.picto.solidaire' }));

    expect(onChange).toHaveBeenCalledWith('solidaire.svg');
  });

  it('marks only the selected picto as checked', () => {
    renderPicker({ value: 'merci.svg' });

    expect(screen.getByRole('radio', { name: 'minibadge.picto.merci' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'minibadge.picto.bravo' })).not.toBeChecked();
    expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(1);
  });

  /**
   * The whole point of the roving tabindex: 29 options must cost ONE tab stop, not 29. The sibling
   * `communities` cover picker (`div role="button" tabIndex={0}` per image) does the opposite.
   */
  it('keeps exactly one option in the tab order', () => {
    renderPicker({ value: 'merci.svg' });

    const tabbable = screen.getAllByRole('radio').filter((radio) => radio.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toHaveAccessibleName('minibadge.picto.merci');
  });

  it('puts the tab stop on the first option while nothing is selected, so the group stays reachable', async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.tab();

    expect(screen.getByRole('radio', { name: 'minibadge.picto.animation' })).toHaveFocus();
  });

  it('moves selection and focus with the arrow keys', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPicker({ value: 'animation.svg' });

    await user.tab();
    await user.keyboard('{ArrowRight}');

    expect(onChange).toHaveBeenCalledWith(PICTO_IDS[1]);
    expect(screen.getByRole('radio', { name: 'minibadge.picto.artistique' })).toHaveFocus();
  });

  it('wraps around from the first option to the last with ArrowLeft', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPicker({ value: PICTO_IDS[0] });

    await user.tab();
    await user.keyboard('{ArrowLeft}');

    expect(onChange).toHaveBeenCalledWith(PICTO_IDS[PICTO_IDS.length - 1]);
  });

  it('jumps to the first and last option with Home and End', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPicker({ value: PICTO_IDS[3] });

    await user.tab();
    await user.keyboard('{End}');
    expect(onChange).toHaveBeenLastCalledWith(PICTO_IDS[PICTO_IDS.length - 1]);

    await user.keyboard('{Home}');
    expect(onChange).toHaveBeenLastCalledWith(PICTO_IDS[0]);
  });

  it('renders every picto image from the centralized resolver', () => {
    renderPicker();

    const images = screen.getAllByRole('presentation', { hidden: true });
    expect(images.length).toBeGreaterThanOrEqual(PICTO_IDS.length);
    PICTO_IDS.forEach((pictoId) => {
      expect(
        images.some((image) => image.getAttribute('src') === `/minibadge/public/img/${pictoId}`),
      ).toBe(true);
    });
  });
});
