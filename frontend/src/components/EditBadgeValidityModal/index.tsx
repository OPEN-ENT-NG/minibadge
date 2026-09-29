import { Alert, Button, FormControl, Loading, Modal, Select, useEdificeClient, useToast } from '@edifice.io/react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BadgeValidity } from '~/components/BadgeValidity';
import { ApiError } from '~/services/api/http';
import { useAllBadgeTypes, useUpdateBadgeTypeValidity } from '~/services/queries/badgeTypes';
import { isBadgeTypeExpired } from '~/utils/badgeStatus';
import { todayIsoDate } from '~/utils/date';

/**
 * "Modifier la date de fin d'un badge" (admin, Epic C): the ONE edit a local admin may make to a badge
 * type — its end date, nothing else. Without it, a badge created by the establishment whose date has
 * passed would stay un-awardable forever (there is no other edit endpoint).
 *
 * Only badge types created by one of the admin's OWN establishments are offered: central badges
 * (`structureId` absent) are configured by SQL migration, and the server refuses them anyway (403),
 * as it refuses another establishment's badge — the list below is a convenience, not the security
 * boundary.
 *
 * Changing the date only affects assignments made from now on: those already made keep the date
 * frozen into them when they were made (said explicitly in the modal, since it is not obvious).
 *
 * Same modal pattern as `CreateBadgeTypeModal`: plain `useState`, `onClose` guarded on `isOpen`
 * (the design system's `Modal` fires its Escape handler even while closed), reset on close, toast on
 * success, inline `Alert` on error — with a distinct message for an expired session.
 */
export interface EditBadgeValidityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** An expired session gets its own message, for the list load as for the update. */
const errorMessageKey = (error: Error | null, fallbackKey: string): string =>
  error instanceof ApiError && error.code === 'unauthorized' ? 'minibadge.error.unauthorized' : fallbackKey;

const SELECT_LABEL_ID = 'minibadge-edit-badge-validity-type-label';

export const EditBadgeValidityModal = ({ isOpen, onClose }: EditBadgeValidityModalProps) => {
  const { t } = useTranslation('minibadge');
  const { user } = useEdificeClient();
  const { success: toastSuccess } = useToast();

  const [typeId, setTypeId] = useState<number>();
  const [validUntil, setValidUntil] = useState('');

  // Only fetched once the modal is actually opened: it walks every page of the library.
  const { badgeTypes, query: badgeTypesQuery } = useAllBadgeTypes(isOpen);
  const { mutate: updateValidity, isPending, isError, error, reset } = useUpdateBadgeTypeValidity();

  const myStructures = user?.structures ?? [];
  const localBadgeTypes = (badgeTypes ?? []).filter(
    (badgeType) => !!badgeType.structureId && myStructures.includes(badgeType.structureId),
  );
  const selected = localBadgeTypes.find((badgeType) => badgeType.id === typeId);

  const [openCount, setOpenCount] = useState(0);

  // The design system's `Select` forwards no ARIA prop to its trigger (a `role="combobox"` button),
  // and `FormControl.Label`'s `htmlFor` targets the FormControl id, not that button — so the combobox
  // would be announced by its current text alone ("Choisir un badge"). Name it after the visible
  // label, followed by its own content (the selected badge), once it is in the DOM.
  const selectWrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const trigger = selectWrapperRef.current?.querySelector<HTMLElement>('[role="combobox"]');
    if (!trigger) return;
    trigger.setAttribute('aria-labelledby', trigger.id ? `${SELECT_LABEL_ID} ${trigger.id}` : SELECT_LABEL_ID);
  });

  useEffect(() => {
    if (!isOpen) {
      setTypeId(undefined);
      setValidUntil('');
      setOpenCount((count) => count + 1);
      reset();
    }
  }, [isOpen, reset]);

  const today = todayIsoDate();
  const isPastDate = !!validUntil && validUntil < today;
  const isSubmitDisabled = !selected || isPastDate || isPending;

  const handleClose = () => {
    if (isOpen) onClose();
  };

  const handleSelect = (value: string) => {
    const badgeType = localBadgeTypes.find((candidate) => String(candidate.id) === value);
    setTypeId(badgeType?.id);
    // Start from the badge's current end date, so "just push it back a year" is one edit.
    setValidUntil(badgeType?.setting?.validUntil?.slice(0, 10) ?? '');
    reset();
  };

  const handleSubmit = () => {
    if (isSubmitDisabled || !selected) return;
    updateValidity(
      { typeId: selected.id, validUntil: validUntil || null },
      {
        onSuccess: () => {
          toastSuccess(t('minibadge.badge.type.validity.success'));
          handleClose();
        },
      },
    );
  };

  return (
    <Modal id="minibadge-edit-badge-validity" isOpen={isOpen} onModalClose={handleClose} size="md">
      <Modal.Header onModalClose={handleClose}>{t('minibadge.badge.type.validity.modal.title')}</Modal.Header>
      <Modal.Body>
        <p className="small text-gray-700">{t('minibadge.badge.type.validity.info')}</p>

        {badgeTypesQuery.isPending && isOpen ? (
          <Loading isLoading loadingPosition="left" className="my-16">
            {t('minibadge.loading')}
          </Loading>
        ) : null}

        {badgeTypesQuery.isError ? (
          <Alert type="danger">{t(errorMessageKey(badgeTypesQuery.error, 'minibadge.error.get.badge.types'))}</Alert>
        ) : null}

        {badgeTypesQuery.isSuccess && localBadgeTypes.length === 0 ? (
          <p>{t('minibadge.badge.type.validity.none')}</p>
        ) : null}

        {localBadgeTypes.length > 0 ? (
          <>
            <FormControl id="minibadge-edit-badge-validity-type" isRequired className="mb-16">
              <FormControl.Label>
                <span id={SELECT_LABEL_ID}>{t('minibadge.badge.type.validity.badge')}</span>
              </FormControl.Label>
              {/* Left uncontrolled on purpose: the design system's `Select` copies `selectedValue` into its
                  own state in an effect keyed on `selectedValue`, and fires `onValueChange` from another
                  effect keyed on that state. An OBJECT option (a new reference on every render of this
                  modal) would therefore re-fire `onValueChange` after every render, re-running
                  `handleSelect` and resetting the date being edited (see
                  `@edifice.io/react/dist/components/Select/Select.js`). It is remounted (`key`) on every
                  open instead, so each opening starts clean. */}
              <div ref={selectWrapperRef}>
                <Select
                  key={openCount}
                  placeholderOption={t('minibadge.badge.type.validity.badge.placeholder')}
                  options={localBadgeTypes.map((badgeType) => ({ value: String(badgeType.id), label: badgeType.label }))}
                  onValueChange={(option) => handleSelect(typeof option === 'string' ? option : String(option.value))}
                />
              </div>
            </FormControl>

            {selected ? (
              <div className="mb-16">
                <BadgeValidity isExpired={isBadgeTypeExpired(selected, today)} validUntil={selected.setting?.validUntil} />
              </div>
            ) : null}

            <FormControl id="minibadge-edit-badge-validity-date" status={isPastDate ? 'invalid' : undefined}>
              <FormControl.Label>{t('minibadge.badge.type.validity.date')}</FormControl.Label>
              <FormControl.Input
                type="date"
                size="md"
                min={today}
                value={validUntil}
                disabled={!selected}
                onChange={(event) => setValidUntil(event.target.value)}
                aria-invalid={isPastDate || undefined}
                aria-describedby="minibadge-edit-badge-validity-date-help"
              />
              {/* `FormControl.Text` takes no `id`: the wrapper carries the one `aria-describedby` points to. */}
              <div id="minibadge-edit-badge-validity-date-help">
                <FormControl.Text>
                  {isPastDate ? t('minibadge.error.badge.type.validity.past') : t('minibadge.badge.type.validity.date.help')}
                </FormControl.Text>
              </div>
            </FormControl>
          </>
        ) : null}

        {isError ? (
          <Alert type="danger" className="mt-16">
            {t(errorMessageKey(error, 'minibadge.error.badge.type.validity.update'))}
          </Alert>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <Button color="tertiary" variant="ghost" onClick={handleClose}>
          {t('minibadge.cancel')}
        </Button>
        <Button color="primary" variant="filled" onClick={handleSubmit} disabled={isSubmitDisabled}>
          {t('minibadge.badge.type.validity.submit')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
