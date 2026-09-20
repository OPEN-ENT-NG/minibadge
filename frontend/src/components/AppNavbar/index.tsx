import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';

/**
 * Inter-screen navigation, absent from the React app until now (Phase 5's
 * transverse gap — see the plan). Mirrors `navbar.html`'s 5 items. Phase 6
 * wires the last one, "Statistiques" (`hasStatisticsViewRight()`,
 * `navbar.html:23-28`), gated by `isStatisticsView`.
 *
 * DEVIATION FROM THE PLAN (Task 3's explicit GOTCHA-verification step is what
 * caught this): the plan called for `Navbar`/`NavBarNav`/`NavItem` from
 * `@edifice.io/react`, citing their `.d.ts` files under
 * `dist/components/Layout/components/`. Those `.d.ts`/`.js` files DO exist on
 * disk, but verifying at runtime (per the plan's own instruction to check
 * actual behavior before closing this task) showed they are not part of the
 * package's PUBLIC API: `@edifice.io/react`'s `package.json#exports` map only
 * declares `.`, `./audience`, `./comments`, `./editor`, `./icons(*)`,
 * `./modals`, `./multimedia`, `./widgets` — no path resolves to
 * `Layout/components/*`. `import { Navbar, NavBarNav, NavItem } from
 * '@edifice.io/react'` fails IMMEDIATELY at typecheck time — `tsc` reports
 * `TS2305: Module '"@edifice.io/react"' has no exported member 'Navbar'`
 * (ditto `NavBarNav`/`NavItem`), because nothing in the root
 * `dist/index.d.ts` declares them. That is actually a STRONGER reason the
 * hand-rolled markup below is safe than a runtime failure would be: the
 * mistake is caught by `tsc` long before the app ever runs, not silently
 * passed through (e.g. evaluating to `undefined`) only to blow up later.
 * These four components are internal-only, used solely by
 * `@edifice.io/react`'s own `Header`/`SearchEngine` internals
 * (`dist/components/Layout/components/Header.js`,
 * `.../SearchEngine.js`) — not exposed for app-level consumption, unlike
 * every other primitive this migration has reused so far (`Modal`, `Table`,
 * `SearchBar`, etc., all genuinely exported from the root entry point).
 *
 * Fixed by building the navbar from plain semantic HTML (`<nav>`/`<ul>`/
 * `<li>`) carrying the EXACT SAME Bootstrap-derived class names those
 * internal components would have applied (`"navbar"` / `"navbar-nav"` /
 * `"nav-item"`, verified in `Navbar.js`/`NavbarNav.js`/`NavItem.js`) — those
 * classes themselves are real, public, compiled CSS shipped in
 * `@edifice.io/bootstrap` (`.navbar`, `.navbar-nav`, `.nav-item`, `.nav-link`
 * rules verified directly in `node_modules/@edifice.io/bootstrap/dist/index.css`),
 * so the visual result is identical to what the (unusable) design-system
 * components would have rendered. `react-router-dom`'s `NavLink` supplies the
 * actual SPA-aware link (`className="nav-link"`, plus `"active"` via its
 * function form) exactly as the plan's original GOTCHA already anticipated
 * for the link itself — every CSS rule touching `.nav-link` in the compiled
 * stylesheet is a descendant selector off `.navbar-nav`/`.nav-item`
 * (`.navbar-nav .nav-link`, `.nav-link.active`), never a direct-child
 * combinator, so nesting react-router's own `<a>` one level "deeper" than a
 * forwardRef `<li>` would have doesn't break any selector.
 */
export interface AppNavbarProps {
  isAdmin: boolean;
  /** Phase 6: `hasWorkflow(rights.workflow.statisticsView)` — see `useMinibadgeAccess`. */
  isStatisticsView: boolean;
}

const navLinkClassName = ({ isActive }: { isActive: boolean }) => `nav-link${isActive ? ' active' : ''}`;

export const AppNavbar = ({ isAdmin, isStatisticsView }: AppNavbarProps) => {
  const { t } = useTranslation('minibadge');

  return (
    // `Layout` (from `@edifice.io/react`) already renders its own header with
    // two LABELED navigation landmarks (`aria-label` on both). This
    // hand-rolled `<nav>` is a THIRD nav landmark on the page, so it needs
    // its own accessible name too, or screen-reader users navigating by
    // landmark can't tell them apart. "Minibadge" is a literal string (not a
    // new i18n key, per this migration's "no new i18n keys per phase"
    // constraint) — it's the app's own name, already used as a literal
    // elsewhere (`routes/root/index.tsx`'s `<AppHeader>Minibadge</AppHeader>`
    // and `<h1>Minibadge</h1>`).
    <nav className="navbar" aria-label="Minibadge">
      <ul className="navbar-nav">
        <li className="nav-item">
          <NavLink to="/" end className={navLinkClassName}>
            {t('minibadge.navbar.badges.received')}
          </NavLink>
        </li>
        <li className="nav-item">
          <NavLink to="/badge-types" className={navLinkClassName}>
            {t('minibadge.navbar.badges.library')}
          </NavLink>
        </li>
        <li className="nav-item">
          <NavLink to="/badges-given" className={navLinkClassName}>
            {t('minibadge.navbar.badges.given')}
          </NavLink>
        </li>
        {isAdmin ? (
          <li className="nav-item">
            <NavLink to="/admin" className={navLinkClassName}>
              {t('minibadge.navbar.badges.admin')}
            </NavLink>
          </li>
        ) : null}
        {isStatisticsView ? (
          <li className="nav-item">
            <NavLink to="/statistics" className={navLinkClassName}>
              {t('minibadge.navbar.badges.statistics')}
            </NavLink>
          </li>
        ) : null}
      </ul>
    </nav>
  );
};
