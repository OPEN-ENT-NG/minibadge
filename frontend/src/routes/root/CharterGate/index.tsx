import { Alert, Button, Checkbox, Flex, LoadingScreen, Modal } from '@edifice.io/react';
import { ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  useMinibadgeAccess,
  useValidateCharter,
  useViewChart,
} from '~/services/queries/charter';

import { MinibadgeAccessContext } from './context';

/**
 * Application-wide gate mounted once around `<Outlet />`, gating every
 * route behind the charter acceptance flow and the admin-revocation notice.
 *
 * Dismissing the revoked notice only flips local state — no request is
 * made and no query is invalidated — so it reappears on the next reload as
 * long as `revokedAt` is still set server-side.
 *
 * Renders a `LoadingScreen` while the gate's own data
 * (`useMinibadgeAccess`) is still loading, then the chart lightbox if it
 * must be shown, then the revoked notice, then finally `children`.
 *
 * `Modal` calls `useKeyPress(onModalClose, ["Escape"])` unconditionally
 * regardless of its own `isOpen` prop, and both modals below stay mounted
 * at all times (only `isOpen` toggles their visibility) — so each
 * `onModalClose` handler (passed to both `<Modal>` and its `<Modal.Header>`)
 * must guard on its own modal's open state, or a single Escape press
 * anywhere in the app would fire both of them at once.
 *
 * `isChartForcedOpen` lets a caller (a "reopen charter" header action) show
 * the lightbox again even after it's already been accepted — the
 * lightbox's `isOpen` becomes `isChartLightboxOpen || isChartForcedOpen`.
 * Controlled from the parent rather than owned internally because the
 * trigger button lives in `AppHeader`, rendered as a sibling of
 * `CharterGate` in `Root`, not a descendant.
 */
export interface CharterGateProps {
  children: ReactNode;
  /** Defaults to `false` for callers (mostly tests) that don't need the
   * reopen escape hatch. */
  isChartForcedOpen?: boolean;
  /** Called once the forced-open lightbox is dismissed, so the parent can
   * reset its trigger state back to `false`. */
  onChartForcedClose?: () => void;
}

export const CharterGate = ({
  children,
  isChartForcedOpen = false,
  onChartForcedClose,
}: CharterGateProps) => {
  const { t } = useTranslation('minibadge');
  const {
    isLoading,
    isChartLightboxOpen,
    isRevoked,
    chart,
    hasAssignWorkflow,
    hasReceiveWorkflow,
    canAssign,
    canReceive,
    isAdmin,
    isStatisticsView,
    isStatisticsViewAllStructures,
  } = useMinibadgeAccess();
  const { mutate: viewChart } = useViewChart();
  const {
    mutate: validateCharter,
    isPending: isValidating,
    isError: isValidateError,
  } = useValidateCharter();

  const [isChartAccepted, setIsChartAccepted] = useState(!!chart.acceptChart);
  const [isMinibadgeAccepted, setIsMinibadgeAccepted] = useState(
    !!chart.acceptChart && (!!chart.acceptAssign || !!chart.acceptReceive),
  );
  const [isRevokedNoticeDismissed, setIsRevokedNoticeDismissed] = useState(false);

  // Whenever the persisted chart changes, the two checkboxes reflect its
  // current acceptance state.
  useEffect(() => {
    setIsChartAccepted(!!chart.acceptChart);
    setIsMinibadgeAccepted(!!chart.acceptChart && (!!chart.acceptAssign || !!chart.acceptReceive));
  }, [chart.acceptChart, chart.acceptAssign, chart.acceptReceive]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  const handleChartAcceptedChange = (checked: boolean) => {
    setIsChartAccepted(checked);
    if (!checked) setIsMinibadgeAccepted(false);
  };

  const handleMinibadgeAcceptedChange = (checked: boolean) => {
    setIsMinibadgeAccepted(checked);
    if (!checked) setIsChartAccepted(false);
  };

  const isLightboxVisible = isChartLightboxOpen || isChartForcedOpen;

  const handleCloseLightbox = () => {
    viewChart(chart);
    onChartForcedClose?.();
  };

  // Only close (and only run the side effects above) while this modal is
  // actually the one showing — see the class doc comment.
  const handleLightboxModalClose = () => {
    if (isLightboxVisible) handleCloseLightbox();
  };

  const handleValidate = () =>
    validateCharter(
      { chart, isChartAccepted, isMinibadgeAccepted, hasAssignWorkflow, hasReceiveWorkflow },
      {
        // A successful save closes a forced reopen too — without this the
        // reopen-charter lightbox would never close on its own after
        // clicking "Valider" on an already-accepted chart, since
        // `isChartLightboxOpen` alone wouldn't flip (it's already `false`).
        // Harmless no-op the rest of the time (`isChartForcedOpen` is
        // already `false`).
        onSuccess: () => onChartForcedClose?.(),
      },
    );

  const showRevokedModal = isRevoked && !isRevokedNoticeDismissed;

  const handleRevokedModalClose = () => {
    if (showRevokedModal) setIsRevokedNoticeDismissed(true);
  };

  return (
    <>
      <Modal id="minibadge-chart-lightbox" isOpen={isLightboxVisible} onModalClose={handleLightboxModalClose} size="lg" scrollable>
        <Modal.Header onModalClose={handleLightboxModalClose}>{t('minibadge.chart.title')}</Modal.Header>
        <Modal.Body>
          <p className="lead mb-16">{t('minibadge.chart.welcome')}</p>
          <p className="mb-16">{t('minibadge.chart.consent.needing')}</p>
          <p className="mb-8">{t('minibadge.chart.text.1')}</p>
          <p className="mb-16">{t('minibadge.chart.text.2')}</p>
          {/* Only translated key with markup (an inline <ul>): the app's own
              i18n bundle, not user input. Boxed (gray background, padded,
              rounded) so the actual commitments stand out from the
              surrounding prose instead of blending into one long block of
              text. */}
          <div
            className="bg-gray-200 rounded-4 p-16 mb-16"
            dangerouslySetInnerHTML={{ __html: t('minibadge.chart.text.3') }}
          />
          <p className="mb-16">{t('minibadge.chart.text.4')}</p>
          <Flex direction="column" gap="8">
            <Checkbox
              label={t('minibadge.chart.accept')}
              checked={isChartAccepted}
              onChange={(event) => handleChartAcceptedChange(event.target.checked)}
            />
            <Checkbox
              label={t('minibadge.chart.receive.accept')}
              checked={isMinibadgeAccepted}
              onChange={(event) => handleMinibadgeAcceptedChange(event.target.checked)}
            />
          </Flex>
          {isValidateError ? (
            <Alert type="danger" className="mt-16">{t('minibadge.error.chart.validate')}</Alert>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button
            color="primary"
            variant="filled"
            onClick={handleValidate}
            disabled={(isMinibadgeAccepted && !isChartAccepted) || isValidating}
          >
            {t('minibadge.validate')}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        id="minibadge-revoked"
        isOpen={showRevokedModal}
        onModalClose={handleRevokedModalClose}
      >
        <Modal.Header onModalClose={handleRevokedModalClose}>
          {t('minibadge.revoke.modal.title')}
        </Modal.Header>
        <Modal.Body>
          <p>{t('minibadge.revoke.modal.text1')}</p>
          <p>{t('minibadge.revoke.modal.text2')}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button color="primary" variant="filled" onClick={() => setIsRevokedNoticeDismissed(true)}>
            {t('minibadge.revoke.modal.button')}
          </Button>
        </Modal.Footer>
      </Modal>

      {!isLightboxVisible && !showRevokedModal ? (
        <MinibadgeAccessContext.Provider
          value={{ canAssign, canReceive, isAdmin, isStatisticsView, isStatisticsViewAllStructures }}
        >
          {children}
        </MinibadgeAccessContext.Provider>
      ) : null}
    </>
  );
};
