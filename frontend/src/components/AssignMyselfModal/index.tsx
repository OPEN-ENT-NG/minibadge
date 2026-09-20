import { Alert, Button, Modal, useUser } from '@edifice.io/react';
import { useTranslation } from 'react-i18next';

import { BadgeType } from '~/models/badgeType';
import { useAssignBadge } from '~/services/queries/badgeAssigned';
import { useGlobalSettings } from '~/services/queries/config';
import { areThresholdsReached, assignableNumbersLabel } from '~/utils/threshold';

/**
 * Mirrors `badge-assign-myself.directive.ts` + `badge-assign-myself.html` — a
 * small, dedicated confirmation modal for "Me décerner", distinct from the
 * shared `AssignBadgeLightbox` (no user search: the only possible owner is
 * the connected user, `model.me.userId` in the source ->
 * `useUser().user.userId` here).
 *
 * GOTCHA (verified against the real source, not assumed to mirror
 * `AssignBadgeLightbox`'s own disable logic just because both are "an assign
 * button"): `badge-assign-myself.html:25`'s
 * `ng-disabled="vm.numberAssignable <= 0 || vm.badgeType.isSelfAssigned"`
 * binds `numberAssignable` to `setting.assignableNumbers(0)` — addingNumber
 * `0`, not `1`, even though confirming adds exactly one assignation. As shown
 * in `utils/threshold.ts`'s doc comment, `assignableNumbers(0) <= 0` is
 * algebraically `isThresholdReached(0)` (the `>=` variant) — NOT
 * `isThresholdOutmoded` (the `>` variant the shared lightbox uses for its own
 * "Décerner" button). Ported as `areThresholdsReached(thresholds, 0)` here,
 * deliberately different from `AssignBadgeLightbox`.
 */
export interface AssignMyselfModalProps {
  badgeType: BadgeType | undefined;
  isOpen: boolean;
  onClose: () => void;
  onAssigned?: () => void;
}

export const AssignMyselfModal = ({ badgeType, isOpen, onClose, onAssigned }: AssignMyselfModalProps) => {
  const { t } = useTranslation('minibadge');
  const { user } = useUser();
  const { globalSettings } = useGlobalSettings();
  const { mutate: assignBadge, isPending, isError } = useAssignBadge();

  const thresholdSettings = globalSettings?.thresholdSettings ?? [];
  const numberAssignableLabel = assignableNumbersLabel(thresholdSettings, 0);
  const isAlreadyAssigned = !!badgeType?.isSelfAssigned;
  const isThresholdBlocked = areThresholdsReached(thresholdSettings, 0);
  const isDisabled = isAlreadyAssigned || isThresholdBlocked || isPending || !badgeType || !user;

  const handleClose = () => onClose();

  const handleAssign = () => {
    if (isDisabled || !badgeType || !user) return;
    assignBadge(
      { typeId: badgeType.id, ownerIds: [user.userId] },
      {
        onSuccess: () => {
          onAssigned?.();
          handleClose();
        },
      },
    );
  };

  return (
    <Modal id="minibadge-assign-myself-modal" isOpen={isOpen} onModalClose={handleClose}>
      <Modal.Header onModalClose={handleClose}>
        {t('minibadge.badge.assign')} {badgeType?.label}
      </Modal.Header>
      <Modal.Body>
        <h3>{t('minibadge.badge.assign.myself.question')}</h3>
        {isAlreadyAssigned ? (
          <Alert type="warning">{t('minibadge.badge.assign.myself.already.assigned')}</Alert>
        ) : null}
        <p>
          {t('minibadge.threshold.remaining')}&nbsp;: {numberAssignableLabel}
        </p>
        {isError ? <Alert type="danger">{t('minibadge.error.assign')}</Alert> : null}
      </Modal.Body>
      <Modal.Footer>
        <Button color="tertiary" variant="ghost" onClick={handleClose}>
          {t('minibadge.cancel')}
        </Button>
        <Button color="primary" variant="filled" onClick={handleAssign} disabled={isDisabled}>
          {t('minibadge.badge.assign.myself.button')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
