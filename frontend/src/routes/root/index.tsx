import { AppHeader, Button, Layout } from '@edifice.io/react';
import { IconSettings } from '@edifice.io/react/icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';

import { AppNavbar } from '~/components/AppNavbar';
import { CharterGate } from '~/routes/root/CharterGate';
import { useMinibadgeAccess } from '~/services/queries/charter';

export function Root() {
  const { t } = useTranslation('minibadge');
  // REVIEW FIX (react-reviewer, HIGH): re-uses the same `useMinibadgeAccess`
  // hook `CharterGate` already calls (TanStack Query dedupes the identical
  // `['charter', ...]` query keys, so this is not an extra network round
  // trip) purely to read `isAllowedToUseMinibadge` for the reopen button
  // below. `Root` is the natural place for this: `AppHeader` and
  // `CharterGate` are SIBLINGS here, so the button (in `AppHeader`) and the
  // lightbox it must reopen (inside `CharterGate`) have no shared ancestor
  // closer than `Root` to hold the trigger state.
  const { isAllowedToUseMinibadge, isAdmin, isStatisticsView } = useMinibadgeAccess();
  const [isChartForcedOpen, setIsChartForcedOpen] = useState(false);

  return (
    <Layout>
      {/* AppHeader is a breadcrumb slot, not a page title; minibadge has no
          breadcrumb concept yet, so this is a stopgap placeholder. */}
      <AppHeader
        render={() =>
          isAllowedToUseMinibadge ? (
            // Fix 2: mirrors the always-present settings/gear button in the
            // original AngularJS app (`view-src/minibadge.html:26-29`,
            // `ng-if="vm.isAllowedToUseMinibadge"`, `ng-click="vm.openChartLightbox()"`)
            // — the only way to reopen the charter lightbox once dismissed.
            // Reuses the `minibadge.settings` i18n key already used by that
            // same button in the source app, rather than inventing new copy.
            <Button
              color="tertiary"
              variant="ghost"
              leftIcon={<IconSettings />}
              onClick={() => setIsChartForcedOpen(true)}
            >
              {t('minibadge.settings')}
            </Button>
          ) : null
        }
      >
        Minibadge
      </AppHeader>
      <h1>Minibadge</h1>
      {/* Phase 5: navigation between screens — a sibling of `CharterGate`
          (`view-src/minibadge.html:32`, `<minibadge-navbar>` is a sibling of
          the charter gate, not a child), so it stays visible even while the
          charter lightbox floats above the rest of the screen. */}
      <AppNavbar isAdmin={isAdmin} isStatisticsView={isStatisticsView} />
      {/* Transverse gate (charter consent + admin-revocation notice) — runs
          for every route, mirroring `initInfos()` being called by every
          route action in `main.ts:63-102`, not just the one behind `/`. */}
      <CharterGate
        isChartForcedOpen={isChartForcedOpen}
        onChartForcedClose={() => setIsChartForcedOpen(false)}
      >
        <Outlet />
      </CharterGate>
    </Layout>
  );
}
