import { Button, useToast } from '@edifice.io/react';
import { IconDownload } from '@edifice.io/react/icons';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiError } from '~/services/api/http';
import { useDownloadCertificate } from '~/services/queries/badges';
import { useGlobalSettings } from '~/services/queries/config';
import { saveBlob } from '~/utils/download';

/** Same name as the server's `Content-Disposition` (`CertificateHelper.PDF_FILENAME`). */
export const CERTIFICATE_FILENAME = 'minibadge-certificat.pdf';

/**
 * Picks the toast copy from the coarse `ApiError.code`: a 503 means the platform PDF service is not
 * available right now (temporary), an expired session gets its own message, anything else is a
 * generic download failure.
 */
const errorMessageKey = (error: Error): string => {
  if (error instanceof ApiError) {
    if (error.code === 'unauthorized') return 'minibadge.error.unauthorized';
    if (error.code === 'unavailable') return 'minibadge.error.certificate.unavailable';
  }
  return 'minibadge.error.certificate.download';
};

/**
 * "Télécharger mon certificat" (Epic D): downloads the PDF certificate of the badges the user received.
 *
 * Only rendered when `GET /global-settings` says the platform PDF service is configured
 * (`pdfExportEnabled`, decided at server startup) — hidden while that is loading or unknown.
 *
 * While the PDF is being generated the button is `aria-disabled` (with a click guard), not `disabled`:
 * a `disabled` button drops the keyboard focus the user just clicked it with. A ref guards the same-tick
 * double click `isPending` cannot see yet, so a double click never asks for two. A visually hidden live
 * region announces the generation; errors surface as a toast — even if the button unmounted meanwhile,
 * the callbacks being the mutation's own.
 */
export interface CertificateDownloadButtonProps {
  /** Classes of the wrapper, only rendered along with the button (no empty gap when it is hidden). */
  className?: string;
}

export const CertificateDownloadButton = ({ className }: CertificateDownloadButtonProps) => {
  const { t } = useTranslation('minibadge');
  const { globalSettings } = useGlobalSettings();
  const { error: toastError } = useToast();
  const requestedRef = useRef(false);
  const { mutate: download, isPending } = useDownloadCertificate({
    onSuccess: (blob) => saveBlob(blob, CERTIFICATE_FILENAME),
    onError: (error) => toastError(t(errorMessageKey(error))),
  });

  if (globalSettings?.pdfExportEnabled !== true) {
    return null;
  }

  const handleClick = () => {
    if (isPending || requestedRef.current) return;
    requestedRef.current = true;
    download(undefined, {
      onSettled: () => {
        requestedRef.current = false;
      },
    });
  };

  return (
    <div className={className}>
      <Button
        type="button"
        color="primary"
        variant="outline"
        leftIcon={<IconDownload />}
        onClick={handleClick}
        isLoading={isPending}
        aria-disabled={isPending || undefined}
        aria-busy={isPending || undefined}
      >
        {t('minibadge.certificate.download')}
      </Button>
      {/* Rendered before any click: a live region only announces changes made after it is in the page. */}
      <span role="status" aria-live="polite" className="visually-hidden">
        {isPending ? t('minibadge.certificate.generating') : ''}
      </span>
    </div>
  );
};
