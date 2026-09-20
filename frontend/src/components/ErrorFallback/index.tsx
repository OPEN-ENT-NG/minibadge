// A dedicated crash/error illustration DOES exist in the design system's own
// asset set (`@edifice.io/bootstrap/dist/images/emptyscreen/illu-error.svg`,
// confirmed present in the installed package and already bundled fine by
// Vite — `emptyScreenMapping` itself imports sibling assets the exact same
// way), it's just not re-exported through any `@edifice.io/react` component
// prop or hook (`grep` found it used only internally by that package's own
// `VideoEmbed` video-load-error state) — so it's imported directly here
// rather than through `emptyScreenMapping` (which only maps "empty search
// results" illustrations, semantically the wrong image for an app crash).
import illuError from '@edifice.io/bootstrap/dist/images/emptyscreen/illu-error.svg';
import { Button, EmptyScreen } from '@edifice.io/react';
import { FallbackProps } from 'react-error-boundary';

/**
 * Post-migration improvement plan, Constat #4: `react-error-boundary`
 * (already an installed dependency) was never actually used anywhere in
 * `frontend/src` — a render exception thrown by any screen (a future bug, or
 * an unanticipated malformed API response) crashed the ENTIRE React tree to
 * a blank white screen, including the navbar itself, with no message and no
 * way to recover short of a full page reload. Mounted in `main.tsx` around
 * `<RouterProvider>`, inside the `EdificeThemeProvider`/`EdificeClientProvider`/
 * `QueryClientProvider` stack so this fallback can still use design-system
 * components and (if ever needed) Edifice/Query context.
 *
 * Built from existing design-system primitives per the plan's explicit
 * instruction ("vérifier le composant EmptyScreen/Alert du design system...
 * plutôt que d'inventer un nouveau visuel") rather than a bespoke layout:
 * `EmptyScreen` (same component `~/components/EmptyBadgeList` already uses)
 * with the design system's own purpose-built error illustration (see the
 * `illuError` import above), plus a `Button` wired to `resetErrorBoundary`
 * to let the user retry without a full page reload.
 *
 * NO NEW I18N KEY (per this plan's explicit constraint): this crash-recovery
 * UI has no AngularJS original at all to port a key from — the source app
 * had zero equivalent (any uncaught error there was a silent blank screen,
 * not a recoverable UI). Exactly the same situation `AssignBadgeLightbox`'s
 * "Retirer {name}" icon button aria-label already establishes precedent for
 * (see that file's own doc comment): a plain hardcoded French string is used
 * below instead of either inventing a new translation key (would violate
 * the constraint, which is specifically about not touching the shipped
 * translation JSON files) or misappropriating an unrelated existing key
 * (e.g. one of the operation-specific `minibadge.error.get.*` strings, which
 * would misleadingly imply a specific failed request rather than an
 * unanticipated render crash).
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
