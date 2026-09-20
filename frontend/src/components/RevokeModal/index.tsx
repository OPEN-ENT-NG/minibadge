import { Button, Modal } from '@edifice.io/react';
import { useTranslation } from 'react-i18next';

/**
 * `Modal` drives its own enter/leave transition via `isOpen` and expects to
 * stay mounted, so it must always be rendered (never conditionally skipped
 * with an early `return null`) — unmounting it directly would tear down
 * that transition instead of letting it play its own close animation.
 */
export interface RevokeModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  text?: string;
}

export const RevokeModal = ({ isOpen, onCancel, onConfirm, title, text }: RevokeModalProps) => {
  const { t } = useTranslation('minibadge');

  return (
    <Modal id="revoke-modal" isOpen={isOpen} onModalClose={onCancel}>
      <Modal.Header onModalClose={onCancel}>
        {title ?? t('minibadge.given.lightbox.title')}
      </Modal.Header>
      <Modal.Body>{text ?? t('minibadge.given.lightbox.label')}</Modal.Body>
      <Modal.Footer>
        <Button color="tertiary" variant="ghost" onClick={onCancel}>
          {t('minibadge.cancel')}
        </Button>
        <Button color="danger" variant="filled" onClick={onConfirm}>
          {t('minibadge.given.lightbox.confirm')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
