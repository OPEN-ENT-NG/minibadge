import { IconCheck } from '@edifice.io/react/icons';
import { CSSProperties, KeyboardEvent, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { PICTO_IDS, PictoId } from '~/config/constants';
import { getPictoSrc } from '~/utils/picto';

/**
 * Picto selector for the badge creation form: a grid of the 29 curated illustrations.
 *
 * Implemented as a REAL `role="radiogroup"` with a roving tabindex — exactly one of the 29 options
 * is in the tab order at a time, and the arrow keys move between them. The sibling `communities` app
 * builds its equivalent cover picker out of `div role="button" tabIndex={0}` elements, which puts
 * every single image in the tab order; reproducing that here would add 29 tab stops in the middle of
 * a short form. `RadioCard` from the design system can't be used either — it accepts no `children`,
 * which is precisely why `communities` had to write its own `RadioCardCover`.
 *
 * Selection is signalled by more than colour (a check mark badge on top of the thicker border), so it
 * stays perceivable without colour vision.
 */
export interface PictoPickerProps {
  /**
   * Currently selected picto id, or `undefined` while nothing is picked. Typed as `PictoId` rather
   * than `string`: the curated bank is the ONLY legal source of a value here (an id outside it
   * resolves to a 404 image), and `PICTO_IDS` is already a `readonly` tuple, so the constraint is
   * free. The wire payload (`BadgeTypeCreatePayload.pictureId`) stays a plain `string` on purpose —
   * the backend's JSON schema accepts any string there.
   */
  value?: PictoId;
  onChange: (pictoId: PictoId) => void;
  /** Accessible name of the whole group (the form field's label). */
  label: string;
}

/**
 * i18n key of one option's accessible name: `as-numerique.svg` -> `minibadge.picto.as-numerique`.
 *
 * Deriving the name from the filename instead (`as numerique`) was wrong twice over: it dropped the
 * French accents (`egalite genre`, `travail equipe`) AND left all 29 options in French inside an
 * otherwise fully translated modal — invisible to sighted users, since the tiles are icon-only, but
 * the entire accessible name of the control for a screen-reader user.
 */
const pictoLabelKey = (pictoId: PictoId): string => `minibadge.picto.${pictoId.replace(/\.svg$/, '')}`;

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
  gap: '8px',
};

export const PictoPicker = ({ value, onChange, label }: PictoPickerProps) => {
  const { t } = useTranslation('minibadge');
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectedIndex = PICTO_IDS.findIndex((pictoId) => pictoId === value);
  // With nothing selected yet, the FIRST option holds the group's single tab stop: a radiogroup
  // where every option is `tabIndex={-1}` would be unreachable by keyboard altogether.
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;

  const moveTo = (index: number) => {
    const nextIndex = (index + PICTO_IDS.length) % PICTO_IDS.length;
    onChange(PICTO_IDS[nextIndex]);
    buttonRefs.current[nextIndex]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        moveTo(index + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        moveTo(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        moveTo(0);
        break;
      case 'End':
        event.preventDefault();
        moveTo(PICTO_IDS.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div role="radiogroup" aria-label={label} style={gridStyle}>
      {PICTO_IDS.map((pictoId, index) => {
        const isSelected = pictoId === value;
        return (
          <button
            key={pictoId}
            ref={(node) => {
              buttonRefs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={t(pictoLabelKey(pictoId))}
            tabIndex={index === activeIndex ? 0 : -1}
            onClick={() => onChange(pictoId)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`position-relative d-flex align-items-center justify-content-center p-4 rounded border border-2 bg-white ${
              isSelected ? 'border-primary' : 'border-gray-400'
            }`}
            style={{ aspectRatio: '1', maxWidth: '100%' }}
          >
            <img src={getPictoSrc(pictoId)} alt="" style={{ maxWidth: '100%', maxHeight: '100%' }} />
            {/* Non-chromatic selection cue: the check mark, not just the border colour. */}
            {isSelected ? (
              <span
                aria-hidden="true"
                className="position-absolute top-0 end-0 d-flex align-items-center justify-content-center bg-primary text-white rounded-circle"
                style={{ width: '16px', height: '16px', transform: 'translate(25%, -25%)' }}
              >
                <IconCheck width={10} height={10} />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
};
