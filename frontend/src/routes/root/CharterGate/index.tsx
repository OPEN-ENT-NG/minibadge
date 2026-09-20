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
 * Application-wide gate, mounted once in `routes/root/index.tsx` around
 * `<Outlet />` (per the plan: `initInfos()` in `main.ts:63-102` runs for
 * *every* route action, not just `badgeReceived` — this is a layout concern,
 * not something the `my-badges` screen owns).
 *
 * SOURCE OF TRUTH for the two overlays below:
 * - Chart lightbox: `view-src/minibadge.html:39-46` (`<minibadge-chart>`,
 *   only rendered `ng-if="vm.isAllowedToUseMinibadge"`) +
 *   `ts/directives/chart/chart.html` (welcome/consent copy, the two
 *   checkboxes, the disabled-until-valid submit) +
 *   `ts/directives/chart/chart.directive.ts` (`changeChartAcceptationStatus`/
 *   `changeMinibadgeAcceptationStatus`: unchecking either one force-unchecks
 *   both — they're not independent toggles) + `main.ts:117-134`
 *   (`chartValidate`/`resetChartValues`).
 * - Revoked notice: the SAME template's nested `<lightbox ... class="minibadge-revoke">`
 *   (`chart.html:46-63`) — a one-button informational notice
 *   (`minibadge.revoke.modal.*` keys), NOT the confirm/cancel
 *   `RevokeModal` component built in Phase 1 for the unrelated "revoke a
 *   given badge assignment" screen (`minibadge.given.lightbox.*` keys,
 *   `/minibadge/revoked/given/:badgeId`). Closing it
 *   (`closeRevokeModal`) only flips a local flag — no request is made, no
 *   query is invalidated — so a reload shows it again as long as
 *   `revokedAt` is still set server-side. Mirrored here with local
 *   component state, not a mutation.
 *
 * Renders a `LoadingScreen` while the gate's own data
 * (`useMinibadgeAccess`) is still loading, then the chart lightbox if it
 * must be shown, then the revoked notice, then finally `children` — mirrors
 * the plan's explicit "render children only once the gate is resolved"
 * (a deliberate simplification over the real AngularJS, which renders the
 * screen immediately and only pops the lightbox in later once loaded).
 *
 * REVIEW FIX (react-reviewer, CRITICAL): the shared `Modal` component
 * (`node_modules/@edifice.io/react/dist/components/Modal/Modal.js`) calls
 * `useKeyPress(onModalClose, ["Escape"])` UNCONDITIONALLY — it does not check
 * its own `isOpen` prop before firing. Both modals below are always mounted
 * (only `isOpen` toggles their visibility), so before this fix any Escape
 * keypress anywhere in the app — even with neither modal visible — called
 * BOTH `handleCloseLightbox` (a real `viewChart` mutation) AND
 * `setIsRevokedNoticeDismissed(true)` (pre-emptively suppressing a notice
 * that hadn't even appeared yet). Both `onModalClose` handlers (passed to
 * both `<Modal>` and its `<Modal.Header>`) are now guarded so they only act
 * while their own modal is actually open/visible.
 *
 * REVIEW FIX (react-reviewer, HIGH): the original AngularJS app always shows
 * a settings/gear button (`view-src/minibadge.html:26-29`,
 * `ng-if="vm.isAllowedToUseMinibadge"`) that calls `vm.openChartLightbox()`,
 * letting a user who dismissed the charter without accepting reopen it at
 * will. This port had no equivalent: once `readChart` became truthy,
 * `isChartLightboxOpen` was permanently `false` with no way back in. Fixed
 * by accepting an externally-controlled `isChartForcedOpen` prop (the
 * lightbox's `isOpen` becomes `isChartLightboxOpen || isChartForcedOpen`) —
 * driven by a "reopen charter" header action in `routes/root/index.tsx`,
 * mirroring the original's gear button placement/gating. Controlled from
 * the parent (rather than an internal `isForcedOpen` state toggled via a
 * ref/imperative handle) because the trigger button lives in `AppHeader`,
 * rendered as a SIBLING of `CharterGate` in `Root` (not a descendant), so
 * `Root` is the natural common ancestor to own this bit of shared state.
 */
export interface CharterGateProps {
  children: ReactNode;
  /** See the Fix 2 deviation note above. Defaults to `false` for callers
   * (mostly tests) that don't need the reopen escape hatch. */
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

  // Mirrors `resetChartValues` (`main.ts:128-134`): whenever the persisted
  // chart changes, the two checkboxes reflect its current acceptance state.
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

  // Fix 1: only close (and only run the side effects above) while this
  // modal is actually the one showing — see the class doc comment.
  const handleLightboxModalClose = () => {
    if (isLightboxVisible) handleCloseLightbox();
  };

  const handleValidate = () =>
    validateCharter(
      { chart, isChartAccepted, isMinibadgeAccepted, hasAssignWorkflow, hasReceiveWorkflow },
      {
        // A successful save closes a FORCED reopen too — without this the
        // "reopen charter" (Fix 2) lightbox would never close on its own
        // after clicking "Valider" on an already-accepted chart, since
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
        {/* Title changed to `minibadge.chart.title` (the actual official
            name of what this modal is — "Conditions générales d'utilisation
            des badges sur l'ENT") instead of the generic `chart.welcome`
            greeting, which is now the body's own lead-in line below (still
            shown, just no longer doubling as the modal's title while a
            near-identical `<h2>` repeated it again inside the body). */}
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
          {/* REVIEW FIX (react-reviewer, HIGH): `useValidateCharter` failing
              used to produce zero visible feedback — the button just
              re-enabled with no explanation. Mirrors `main.ts:117-119`'s
              `notify.error('minibadge.error.chart.validate')`; that key is
              already shipped in `i18n/fr.json`. */}
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
