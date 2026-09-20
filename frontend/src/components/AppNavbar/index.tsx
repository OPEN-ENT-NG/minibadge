import { Tabs, TabsItemProps } from '@edifice.io/react';
import { IconLibrary, IconSend, IconSettings, IconStarFull, IconTable } from '@edifice.io/react/icons';
import { useTranslation } from 'react-i18next';
import { useMatch, useNavigate } from 'react-router-dom';

/**
 * Inter-screen navigation, now the REAL `@edifice.io/react` `Tabs` component
 * — same one communities uses (`routes/communities/index.tsx`) — instead of
 * `NavLink`s only styled to look like it. Routing itself is untouched: the 5
 * screens stay separate routes/pages (own code-splitting, own tests), so
 * only `Tabs.List` is rendered (via the `children` render-prop form, which
 * skips `Tabs`' own default `<><List/><Panel/></>` fragment) — `Tabs.Panel`,
 * which would mount a `content` node itself, is never used; `onChange` just
 * calls `navigate()` to the matching route instead.
 *
 * `Tabs.Item` renders a `<button role="tab">` (no `href`) — communities'
 * own tradeoff, now also this app's: right-click/open-in-new-tab and native
 * link semantics are lost in exchange for the exact visual/interactive
 * result (icons, labels, the JS-measured animated underline).
 *
 * SYNCING with the actual route (`activeId`, via `useMatch` per screen path):
 * `Tabs`' `defaultId` only seeds its internal `useState` on mount — it does
 * NOT react to a changed prop later. Since `Root` (this component's parent)
 * never unmounts across in-app navigation, `key={activeId}` forces a clean
 * remount of `Tabs` on every route change, so the highlighted tab still
 * follows reality after a browser back/forward or a typed URL — not just
 * after clicking a tab (the only case that would otherwise stay in sync, via
 * `Tabs`' own internal state + the `onChange` → `navigate()` side effect).
 *
 * GOTCHA VERIFIED THE HARD WAY (a real, silent-redirect bug, not a guess):
 * `useTabs`' own effect (`watch(activeTab) { onChange?.(currentItem) }`) does
 * NOT only fire on a real click — it fires on every `Tabs` MOUNT too, with
 * `activeTab` still equal to `defaultId`. Naively wiring `onChange` straight
 * to `navigate()` (matching `AppActions`' own simple case, where the default
 * tab IS always the current URL) therefore fires `navigate(PATH_FOR_TAB
 * [defaultId])` on every mount — including every `key={activeId}` remount
 * this component forces on each navigation. Harmless when `activeId` truly
 * reflects the current route (navigating to where you already are is a
 * no-op), but `AppNavbar` — unlike communities' `Index`, only ever mounted
 * on routes that already ARE one of its tabs — is mounted on EVERY minibadge
 * route via `Root`, including ones with no matching tab at all (a 404, or
 * `/badge-types/:id` mapping to the `library` tab while sitting on a
 * *different* URL). Confirmed by literally reproducing it: visiting an
 * unmatched route silently bounced back to `/` on mount, because
 * `activeId`'s "my-badges" fallback got treated as a real selection. Fixed
 * below by ignoring the change when `item.id === activeId` — true exactly
 * for that spurious mount-fire (and for re-clicking the already-active tab,
 * where skipping navigation is correct anyway), false for every genuine
 * switch to a *different* tab.
 */
export interface AppNavbarProps {
  isAdmin: boolean;
  /** Phase 6: `hasWorkflow(rights.workflow.statisticsView)` — see `useMinibadgeAccess`. */
  isStatisticsView: boolean;
}

type TabId = 'my-badges' | 'library' | 'given' | 'admin' | 'statistics';

const PATH_FOR_TAB: Record<TabId, string> = {
  'my-badges': '/',
  library: '/badge-types',
  given: '/badges-given',
  admin: '/admin',
  statistics: '/statistics',
};

export const AppNavbar = ({ isAdmin, isStatisticsView }: AppNavbarProps) => {
  const { t } = useTranslation('minibadge');
  const navigate = useNavigate();

  const isLibrary = !!useMatch('/badge-types/*');
  const isGiven = !!useMatch('/badges-given/*');
  const isAdminRoute = !!useMatch('/admin/*');
  const isStatisticsRoute = !!useMatch('/statistics/*');
  const activeId: TabId = isLibrary
    ? 'library'
    : isGiven
      ? 'given'
      : isAdminRoute
        ? 'admin'
        : isStatisticsRoute
          ? 'statistics'
          : 'my-badges';

  const items: TabsItemProps[] = [
    { id: 'my-badges', icon: <IconStarFull />, label: t('minibadge.navbar.badges.received'), content: null },
    { id: 'library', icon: <IconLibrary />, label: t('minibadge.navbar.badges.library'), content: null },
    { id: 'given', icon: <IconSend />, label: t('minibadge.navbar.badges.given'), content: null },
    ...(isAdmin
      ? [{ id: 'admin', icon: <IconSettings />, label: t('minibadge.navbar.badges.admin'), content: null }]
      : []),
    ...(isStatisticsView
      ? [{ id: 'statistics', icon: <IconTable />, label: t('minibadge.navbar.badges.statistics'), content: null }]
      : []),
  ];

  return (
    // `Layout` (from `@edifice.io/react`) already renders its own header with
    // two LABELED navigation landmarks (`aria-label` on both), so this one
    // needs its own accessible name too, or screen-reader users navigating by
    // landmark can't tell them apart.
    <nav aria-label="Minibadge">
      <Tabs
        key={activeId}
        defaultId={activeId}
        items={items}
        fullWidth
        onChange={(item) => {
          if (item.id === activeId) return;
          navigate(PATH_FOR_TAB[item.id as TabId]);
        }}
      >
        {() => <Tabs.List fullWidth />}
      </Tabs>
    </nav>
  );
};
