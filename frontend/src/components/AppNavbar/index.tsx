import { Tabs, TabsItemProps } from '@edifice.io/react';
import { IconLibrary, IconSend, IconSettings, IconStarFull, IconTable } from '@edifice.io/react/icons';
import { useTranslation } from 'react-i18next';
import { useMatch, useNavigate } from 'react-router-dom';

/**
 * Inter-screen navigation. Routing itself stays untouched (5 separate
 * routes/pages) — only `Tabs.List` is rendered (via the `children`
 * render-prop form, skipping `Tabs`' own `<><List/><Panel/></>` fragment
 * and its `content`-mounting `Tabs.Panel`); `onChange` just calls
 * `navigate()` to the matching route. `Tabs.Item` renders a
 * `<button role="tab">`, not a link, so right-click/open-in-new-tab and
 * native link semantics don't work here.
 *
 * `activeId` (via `useMatch` per screen path) tracks the real route, but
 * `Tabs`' `defaultId` only seeds its internal state on mount and never
 * reacts to a later prop change. Since this component's parent never
 * unmounts across in-app navigation, `key={activeId}` forces a clean
 * remount on every route change so the highlighted tab stays correct after
 * a browser back/forward or a typed URL, not just after clicking a tab.
 *
 * `useTabs`' internal effect fires `onChange` on every `Tabs` mount too
 * (not just on a real click), with `activeTab` still equal to `defaultId`.
 * Since this component is mounted on every route — including ones with no
 * matching tab (a 404, or a detail route mapping to a tab while sitting on
 * a different URL) — wiring `onChange` straight to `navigate()` would
 * silently redirect to that tab's path on every such mount. Guarded below
 * by ignoring the change when `item.id === activeId`, which is true for
 * that spurious mount-fire (and for re-clicking the already-active tab,
 * where skipping navigation is correct anyway) and false for any genuine
 * switch to a different tab.
 */
export interface AppNavbarProps {
  isAdmin: boolean;
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
    // `Layout` already renders its own header with two labeled navigation
    // landmarks, so this one needs its own accessible name too, or
    // screen-reader users navigating by landmark can't tell them apart.
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
