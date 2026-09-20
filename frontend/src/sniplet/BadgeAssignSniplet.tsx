import { ERROR_CODE } from '@edifice.io/client';
import { Alert, EdificeClientProvider, EdificeThemeProvider } from '@edifice.io/react';
import { QueryCache, QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Subscription } from 'rxjs';

import { AssignBadgeLightbox } from '~/components/AssignBadgeLightbox';
import { BadgeType } from '~/models/badgeType';
import { badgeTypeQueryOptions } from '~/services/queries/badgeTypes';

import { SnipletBadgeAssignService } from './snipletBadgeAssignService';

/**
 * No global `@edifice.io/bootstrap` CSS import here: this sniplet is
 * embedded into a host portal page, which is expected to already have the
 * design-system CSS loaded.
 *
 * A single module-level `QueryClient` rather than one per mount: the
 * sniplet is expected to be mounted at most once per page in practice, and
 * sharing the client across remounts (if the portal ever tears down and
 * recreates the host element) keeps the badge-type cache warm rather than
 * refetching every time.
 */
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: unknown) => {
      if (error === ERROR_CODE.NOT_LOGGED_IN) {
        window.location.replace('/auth/login');
      }
    },
  }),
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2,
    },
  },
});

export interface BadgeAssignSnipletProps {
  service: SnipletBadgeAssignService;
}

/**
 * Root component mounted by `main.tsx`'s `controller.init()` on the DOM node
 * the sniplet owns. Renders the same `AssignBadgeLightbox` the main SPA uses
 * for "Décerner" — see `BadgeAssignSnipletContent` below for how it's driven
 * by `service`.
 */
export function BadgeAssignSniplet({ service }: BadgeAssignSnipletProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <EdificeClientProvider params={{ app: 'minibadge' }}>
        <EdificeThemeProvider>
          <BadgeAssignSnipletContent service={service} />
        </EdificeThemeProvider>
      </EdificeClientProvider>
    </QueryClientProvider>
  );
}

/**
 * Subscribes to the two ways a portal page can ask this sniplet to open:
 * - `getBadgeTypeSubject()`: caller already has the full `BadgeType` — open
 *   immediately.
 * - `getBadgeTypeIdSubject()`: caller only has an id — resolve it via the
 *   same query definition `~/services/queries/badgeTypes.ts#useBadgeType`
 *   uses (`badgeTypeQueryOptions`), fetched imperatively through
 *   `QueryClient#fetchQuery` so a repeat request for the same id still
 *   re-triggers the open, unlike a `useQuery(..., { enabled })` keyed on
 *   state that wouldn't change.
 */
function BadgeAssignSnipletContent({ service }: BadgeAssignSnipletProps) {
  const { t } = useTranslation('minibadge');
  const [badgeType, setBadgeType] = useState<BadgeType | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);
  // Set when a `sendBadgeTypeId` resolution fails: unlike the `sendBadgeType`
  // path, there's no badge type here to open `AssignBadgeLightbox` with, so
  // this component renders its own visible `Alert` for that case (the
  // `console.error` in the `.catch` below is developer-facing only and gives
  // the end user zero feedback on its own).
  const [resolveError, setResolveError] = useState(false);
  const reactQueryClient = useQueryClient();
  // Identifies the most recently issued `sendBadgeTypeId` resolution, so that
  // if two calls overlap (a slower earlier request settling after a faster
  // later one), the stale one's `.then`/`.catch` can recognize it's been
  // superseded and bail out instead of clobbering state with outdated data.
  const latestRequestIdRef = useRef(0);
  // Guards against calling `setState` after this component has unmounted
  // while a `fetchQuery` promise is still in flight.
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const subscription = new Subscription();

    subscription.add(
      service.getBadgeTypeSubject().subscribe((type) => {
        setBadgeType(type);
        setIsOpen(true);
        setResolveError(false);
      }),
    );

    subscription.add(
      service.getBadgeTypeIdSubject().subscribe((typeId) => {
        setResolveError(false);
        const requestId = ++latestRequestIdRef.current;

        reactQueryClient
          .fetchQuery(badgeTypeQueryOptions(typeId))
          .then((type) => {
            if (!isMountedRef.current || requestId !== latestRequestIdRef.current) {
              // Unmounted, or superseded by a newer `sendBadgeTypeId` call
              // that was issued before this one settled — ignore.
              return;
            }
            setBadgeType(type);
            setIsOpen(true);
          })
          .catch((error: unknown) => {
            // The portal's `notify` helper (from the `entcore` package) is
            // deliberately NOT imported into this standalone bundle (only
            // framework-agnostic pieces are ported here) — logging is kept
            // for developers, but the `Alert` rendered below `resolveError`
            // is what actually surfaces this to the end user.
            console.error('minibadge: failed to resolve badge type for sniplet', error);
            if (!isMountedRef.current || requestId !== latestRequestIdRef.current) {
              return;
            }
            setResolveError(true);
          });
      }),
    );

    return () => subscription.unsubscribe();
  }, [service, reactQueryClient]);

  // Resets so a later `sendBadgeType`/`sendBadgeTypeId` (possibly for a
  // different badge type) starts clean.
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setBadgeType(undefined);
  }, []);

  return (
    <>
      {resolveError ? <Alert type="danger">{t('minibadge.error.get.badge.type')}</Alert> : null}
      <AssignBadgeLightbox badgeType={badgeType} isOpen={isOpen} onClose={handleClose} />
    </>
  );
}
