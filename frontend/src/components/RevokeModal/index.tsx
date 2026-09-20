import { Button, Modal } from '@edifice.io/react';
import { useTranslation } from 'react-i18next';

/**
 * Props verified against the installed `@edifice.io/react` type declarations
 * (`node_modules/@edifice.io/react/dist/components/Modal/*.d.ts`): `Modal`
 * requires `id`/`isOpen`/`onModalClose`; `Modal.Header` requires
 * `onModalClose`; `Modal.Body`/`Modal.Footer` just take `children`.
 *
 * Default copy reuses the existing translation keys already shipped in
 * `backend/src/main/resources/i18n/fr.json` — no new i18n key added:
 * `minibadge.given.lightbox.title` ("Révocation d'un badge"),
 * `minibadge.given.lightbox.label` ("Vous êtes sur le point de révoquer un
 * badge. Voulez-vous continuer ?"), `minibadge.given.lightbox.confirm`
 * ("Révoquer"), `minibadge.cancel` ("Annuler").
 *
 * REVIEW FIX (react-reviewer, MEDIUM): this used to `return null` before
 * rendering `<Modal>` whenever `isOpen` was false. `Modal` (see
 * `node_modules/@edifice.io/react/dist/components/Modal/Modal.js`) drives its
 * own enter/leave transition via `useTransition(isOpen, ...)` and expects to
 * stay mounted with `isOpen` toggling — unmounting `<Modal>` itself (via the
 * early return) tore down that transition state instead of letting the
 * library play its own close animation. Always rendering `<Modal isOpen=...>`
 * now lets it manage its own mount/unmount internally. This does not change
 * the "closed" behavior verified by the test file: `useTransition` renders
 * nothing for the very first (never-yet-opened) `false` state, so
 * `queryByRole('dialog')` is still absent on initial render with
 * `isOpen={false}`.
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
