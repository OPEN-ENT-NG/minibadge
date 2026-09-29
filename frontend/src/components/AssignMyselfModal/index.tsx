import { Alert, Button, Modal, useUser } from '@edifice.io/react';
import { useTranslation } from 'react-i18next';

import { BadgeType } from '~/models/badgeType';
import { useAssignBadge } from '~/services/queries/badgeAssigned';
import { useGlobalSettings } from '~/services/queries/config';
import { isBadgeTypeExpired } from '~/utils/badgeStatus';
import { formatIsoDateFr } from '~/utils/date';
import { areThresholdsReached, assignableNumbersLabel } from '~/utils/threshold';
import { formatMessage } from '~/utils/translate';

/**
 * Small, dedicated confirmation modal for "Me décerner", distinct from
 * `AssignBadgeLightbox` — there's no user search since the only possible
 * owner is the connected user.
 *
 * Deliberately uses `areThresholdsReached(thresholds, 0)` (the `>=` variant,
 * checking "is the threshold already reached before this assignment"), not
 * `areThresholdsOutmoded` (the `>` variant `AssignBadgeLightbox` uses) —
 * even though confirming here adds exactly one assignation, the disable
 * check itself is evaluated at zero added assignations.
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
  // Epic C: an expired badge type can no longer be awarded, to oneself included.
  const isExpired = !!badgeType && isBadgeTypeExpired(badgeType);
  const isDisabled = isAlreadyAssigned || isThresholdBlocked || isExpired || isPending || !badgeType || !user;

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
        {isExpired ? (
          <Alert type="warning">
            {formatMessage(t, 'minibadge.badge.expired.cannot.assign', [
              formatIsoDateFr(badgeType?.setting.validUntil),
            ])}
          </Alert>
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
