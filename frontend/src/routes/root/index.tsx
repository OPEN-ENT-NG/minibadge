import { IWebApp } from '@edifice.io/client';
import { AppHeader, Breadcrumb, Button, Layout, useEdificeClient } from '@edifice.io/react';
import { IconInfoCircle } from '@edifice.io/react/icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';

import { AppNavbar } from '~/components/AppNavbar';
import { CharterGate } from '~/routes/root/CharterGate';
import { useMinibadgeAccess } from '~/services/queries/charter';

/** Fallback while `currentApp` (fetched via `useEdificeClient`) is still loading. */
const FALLBACK_APP = { displayName: 'Minibadge', icon: 'minibadge' };

export function Root() {
  const { t } = useTranslation('minibadge');
  const { currentApp } = useEdificeClient();
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
      {/* `className` matches communities' own `AppHeader` usage
          (`routes/communities/index.tsx`) exactly, including what it drops:
          `AppHeader.js` spreads `...restProps` (which includes `className`)
          AFTER its own computed `classes` when building the div, so passing
          `className` here REPLACES the default set entirely rather than
          merging with it (same gotcha as `Layout`, documented below) — no
          `border-bottom` (communities' own header has none either), plus
          `gap-12`/`align-items-center` instead of the default `gap-8`. */}
      <AppHeader
        className="d-flex flex-wrap p-16 gap-12 bg-white justify-content-between align-items-center mx-n16"
        render={() =>
          isAllowedToUseMinibadge ? (
            // Fix 2: mirrors the always-present settings/gear button in the
            // original AngularJS app (`view-src/minibadge.html:26-29`,
            // `ng-if="vm.isAllowedToUseMinibadge"`, `ng-click="vm.openChartLightbox()"`)
            // — the only way to reopen the charter lightbox once dismissed.
            // Labeled after what the lightbox actually is (the terms-of-use
            // charter, `minibadge.chart.title`), not the generic "Réglages"
            // the source app used for the same button.
            <Button
              color="tertiary"
              variant="ghost"
              leftIcon={<IconInfoCircle />}
              onClick={() => setIsChartForcedOpen(true)}
            >
              {t('minibadge.terms.of.use')}
            </Button>
          ) : null
        }
      >
        <Breadcrumb app={(currentApp as IWebApp) ?? FALLBACK_APP} />
      </AppHeader>
      {/* GOTCHA (verified in `Layout.js`): `Layout` spreads `restProps` AFTER
          `className` when building its `<main>` element, so passing
          `className` directly to `<Layout>` would completely REPLACE its
          internally computed layout classes instead of merging with them.
          Padding is therefore applied on this inner wrapper `<div>` instead. */}
      <div className="px-md-24">
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
      </div>
    </Layout>
  );
}
