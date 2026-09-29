import { Alert, Button, FormControl, Modal, Select, TextArea, useEdificeClient, useToast } from '@edifice.io/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CategoryMultiSelect } from '~/components/CategoryMultiSelect';
import { PictoPicker } from '~/components/PictoPicker';
import { PictoId } from '~/config/constants';
import { ApiError } from '~/services/api/http';
import { useCreateBadgeType } from '~/services/queries/badgeTypes';
import { todayIsoDate } from '~/utils/date';

/**
 * "Créer un badge" (admin): creates a badge type visible only inside the admin's own establishment.
 *
 * Plain `useState`, no react-hook-form — that dependency was deliberately removed from minibadge in
 * an earlier cleanup, and the two things it buys the equivalent `communities` form (a maxLength
 * counter and taming a non-native `Select`) don't apply: the label has no length limit by spec, and
 * the only `Select` here appears for multi-establishment admins alone. Every other form in this app
 * (`AssignBadgeLightbox`, `RevokeUsersModal`) is `useState` + a derived `isSubmitDisabled`.
 *
 * Structure scoping: the server validates `structureId` against the caller's own structures and
 * derives it when there is exactly one, so the field is only rendered — and only sent — when the
 * admin belongs to several. Picking one silently on their behalf would create the badge in the wrong
 * school, and there is no delete endpoint to undo that.
 *
 * End date (Epic C): optional, a native date input like `PeriodPicker`'s. Left empty, the badge is
 * permanent. A past date is refused here (inline message, submit disabled) as well as by the server;
 * today is accepted — the badge is valid for the whole of its end day.
 *
 * `useToast().success(...)` needs a `<Toaster/>` somewhere on the page; `Layout` (mounted in
 * `routes/root`) provides one, and this modal only ever opens from `/admin`, inside that layout.
 */
export interface CreateBadgeTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Picks the inline error copy from the coarse `ApiError.code`.
 *
 * `services/api/http`'s shared `request()` collapses every failure into three codes, so the server's
 * own wording (notably the "this label is already taken" slug conflict) never survives the round
 * trip. What the code DOES still distinguish is a dead session from everything else — and telling an
 * admin whose session just expired to go rename their badge sends them chasing a cause that isn't
 * there. Hence: an explicit reconnect message for `unauthorized`, and for the catch-all `error` a
 * message that OFFERS the duplicate-label explanation without asserting it.
 *
 * `notfound` can't be reached from a POST to a static collection route; it falls through to the
 * generic message rather than getting invented copy of its own.
 */
const errorMessageKey = (error: Error | null): string =>
  error instanceof ApiError && error.code === 'unauthorized'
    ? 'minibadge.error.unauthorized'
    : 'minibadge.error.badge.type.create';

export const CreateBadgeTypeModal = ({ isOpen, onClose }: CreateBadgeTypeModalProps) => {
  const { t } = useTranslation('minibadge');
  const { user } = useEdificeClient();
  const { success: toastSuccess } = useToast();

  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [pictureId, setPictureId] = useState<PictoId>();
  const [structureId, setStructureId] = useState<string>();
  const [validUntil, setValidUntil] = useState('');

  const { mutate: createBadgeType, isPending, isError, error, reset } = useCreateBadgeType();

  const structures = user?.structures ?? [];
  const structureNames = user?.structureNames ?? [];
  const mustChooseStructure = structures.length > 1;

  // Reset whenever the modal closes, so the next open starts clean (mirrors `AssignBadgeLightbox`).
  useEffect(() => {
    if (!isOpen) {
      setLabel('');
      setDescription('');
      setCategoryIds([]);
      setPictureId(undefined);
      setStructureId(undefined);
      setValidUntil('');
      reset();
    }
  }, [isOpen, reset]);

  const trimmedLabel = label.trim();
  const today = todayIsoDate();
  const isPastValidUntil = !!validUntil && validUntil < today;
  const isSubmitDisabled =
    !trimmedLabel || isPending || (mustChooseStructure && !structureId) || isPastValidUntil;

  // The design system's `Modal` registers `useKeyPress(onModalClose, ['Escape'])` UNCONDITIONALLY,
  // regardless of its own `isOpen`, so a mounted-but-closed modal still fires this on any Escape
  // press anywhere on the page (see `RevokeUsersModal` for the same guard and the full write-up).
  // Harmless today — the `onClose` passed in is an idempotent state setter — but the guard is what
  // keeps it harmless the day that handler grows a side effect.
  const handleClose = () => {
    if (isOpen) onClose();
  };

  const handleSubmit = () => {
    if (isSubmitDisabled) return;
    createBadgeType(
      {
        label: trimmedLabel,
        description: description.trim() || undefined,
        pictureId,
        categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
        // Omitted for a single-establishment admin: the server derives it, and sending a value the
        // client guessed would be ignored anyway (it is re-validated server-side regardless).
        structureId: mustChooseStructure ? structureId : undefined,
        validUntil: validUntil || undefined,
      },
      {
        onSuccess: () => {
          toastSuccess(t('minibadge.badge.type.create.success'));
          handleClose();
        },
      },
    );
  };

  return (
    <Modal id="minibadge-create-badge-type" isOpen={isOpen} onModalClose={handleClose} size="lg" scrollable>
      <Modal.Header onModalClose={handleClose}>{t('minibadge.badge.type.create.modal.title')}</Modal.Header>
      <Modal.Body>
        <p className="small text-gray-700">{t('minibadge.badge.type.create.info')}</p>

        <FormControl id="minibadge-create-badge-type-label" isRequired className="mb-16">
          <FormControl.Label>{t('minibadge.badge.type.create.label')}</FormControl.Label>
          <FormControl.Input
            type="text"
            size="md"
            placeholder={t('minibadge.badge.type.create.label.placeholder')}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
        </FormControl>

        <FormControl id="minibadge-create-badge-type-description" className="mb-16">
          <FormControl.Label>{t('minibadge.badge.type.create.description')}</FormControl.Label>
          <TextArea
            size="md"
            placeholder={t('minibadge.badge.type.create.description.placeholder')}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </FormControl>

        <FormControl
          id="minibadge-create-badge-type-valid-until"
          status={isPastValidUntil ? 'invalid' : undefined}
          className="mb-16"
        >
          <FormControl.Label>{t('minibadge.badge.type.create.valid.until')}</FormControl.Label>
          <FormControl.Input
            type="date"
            size="md"
            min={today}
            value={validUntil}
            onChange={(event) => setValidUntil(event.target.value)}
            aria-invalid={isPastValidUntil || undefined}
            aria-describedby="minibadge-create-badge-type-valid-until-help"
          />
          {/* `FormControl.Text` takes no `id`: the wrapper carries the one `aria-describedby` points to. */}
          <div id="minibadge-create-badge-type-valid-until-help">
            <FormControl.Text>
              {isPastValidUntil
                ? t('minibadge.error.badge.type.validity.past')
                : t('minibadge.badge.type.create.valid.until.help')}
            </FormControl.Text>
          </div>
        </FormControl>

        {mustChooseStructure ? (
          <FormControl id="minibadge-create-badge-type-structure" isRequired className="mb-16">
            <FormControl.Label>{t('minibadge.badge.type.create.structure')}</FormControl.Label>
            <Select
              placeholderOption={t('minibadge.badge.type.create.structure.placeholder')}
              options={structures.map((id, index) => ({ value: id, label: structureNames[index] ?? id }))}
              selectedValue={structureId}
              onValueChange={(option) => setStructureId(typeof option === 'string' ? option : option.value)}
            />
          </FormControl>
        ) : null}

        <h3 className="h6 mb-8">{t('minibadge.badge.type.create.categories')}</h3>
        <div className="mb-16">
          <CategoryMultiSelect
            value={categoryIds}
            onChange={setCategoryIds}
            label={t('minibadge.badge.type.create.categories')}
          />
        </div>

        <h3 className="h6 mb-8">{t('minibadge.badge.type.create.picto')}</h3>
        <PictoPicker value={pictureId} onChange={setPictureId} label={t('minibadge.badge.type.create.picto')} />

        {isError ? (
          <Alert type="danger" className="mt-16">
            {t(errorMessageKey(error))}
          </Alert>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <Button color="tertiary" variant="ghost" onClick={handleClose}>
          {t('minibadge.cancel')}
        </Button>
        <Button color="primary" variant="filled" onClick={handleSubmit} disabled={isSubmitDisabled}>
          {t('minibadge.badge.type.create.submit')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
