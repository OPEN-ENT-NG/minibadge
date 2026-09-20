// Imported directly rather than through `emptyScreenMapping`, which only
// maps "empty search results" illustrations — the wrong image for a crash.
import illuError from '@edifice.io/bootstrap/dist/images/emptyscreen/illu-error.svg';
import { Button, EmptyScreen } from '@edifice.io/react';
import { FallbackProps } from 'react-error-boundary';

/**
 * Mounted in `main.tsx` around `<RouterProvider>` so a render exception in
 * any screen shows this instead of crashing the whole React tree to a blank
 * white screen. `resetErrorBoundary` lets the user retry without a full
 * page reload.
 *
 * Hardcoded French strings instead of an i18n key: no existing key fits an
 * unanticipated render crash without misleadingly implying a specific
 * failed request.
 */
export const ErrorFallback = ({ resetErrorBoundary }: FallbackProps) => {
  return (
    <div role="alert">
      <EmptyScreen
        imageSrc={illuError}
        title="Une erreur inattendue est survenue"
        text="Veuillez réessayer. Si le problème persiste, contactez votre administrateur."
      />
      <Button color="primary" variant="filled" onClick={resetErrorBoundary}>
        Réessayer
      </Button>
    </div>
  );
};
