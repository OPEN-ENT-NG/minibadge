import { createRoot, type Root } from 'react-dom/client';

import '~/i18n';
import { MINIBADGE_WORKFLOW_RIGHTS } from '~/services/queries/charter';

import { BadgeAssignSniplet } from './BadgeAssignSniplet';
// `entcoreGlobals.d.ts` is an ambient type declaration only (no JS output),
// picked up automatically by TS via `tsconfig.app.json`'s `include` — it
// must NOT be imported as a value/side-effect module (there is nothing for
// a bundler to resolve at runtime).
import { SnipletBadgeAssignService } from './snipletBadgeAssignService';

const MINIBADGE_APP = 'minibadge';
const MOUNT_NODE_ID = 'minibadge-sniplet-badge-assign-root';

const snipletBadgeAssignService = new SnipletBadgeAssignService();

/**
 * Tracks the currently-mounted React root (if any), so `controller.init()`
 * is idempotent instead of unconditionally creating a new root + DOM node
 * every time it's called. Chosen behavior: a clean unmount-then-remount
 * (rather than silently skipping a second `init()` call), because a real
 * portal contract calling `init()` again after tearing its host element
 * down is at least as plausible as a stray duplicate call — remounting
 * keeps the sniplet working either way, whereas skipping would leave it
 * permanently unmounted if the portal ever legitimately re-initializes it.
 * `controller.destroy()` (below) clears this the same way, so
 * `init()` -> `destroy()` -> `init()` cleanly remounts too.
 */
let mountedRoot: Root | null = null;
let mountedNode: HTMLDivElement | null = null;

/**
 * Resolves `controller.init()`'s host element out of a standalone function
 * (rather than an inline `this instanceof HTMLElement ? this : ...` in
 * `init()` itself) so that the non-`HTMLElement` branch can log a
 * `console.warn` without triggering `@typescript-eslint/no-this-alias` on
 * an `if`/`else` assigning `this` to a local `host` variable.
 */
function resolveHost(candidate: unknown): HTMLElement {
  if (candidate instanceof HTMLElement) {
    return candidate;
  }
  // The single riskiest, unverified assumption in this bundle: that the real
  // portal invokes `controller.init()` with `this` bound to the sniplet's
  // host element (see the class-level comment on `controller` below).
  // Falling back to `document.body` silently would leave a future engineer
  // debugging a badge-assign widget mounted in the wrong place on a live
  // portal page with zero signal as to why — warn loudly instead.
  console.warn(
    "minibadge: controller.init() was called with a non-HTMLElement `this` — falling back to document.body; verify the real portal's Behaviours.sniplets contract.",
  );
  return document.body;
}

/**
 * Minimal `Behaviours.register` payload for this bundle:
 * - `rights`: portal-wide role/right-assignment screens read
 *   `Behaviours.applicationsBehaviours[app].rights` for every registered
 *   app regardless of whether that app has any sniplets, so this is part of
 *   the app-wide contract, not sniplet-specific — reused as-is from
 *   `~/services/queries/charter.ts#MINIBADGE_WORKFLOW_RIGHTS`.
 * - `sniplets['badge-assign']` and `snipletBadgeAssignService`: the sniplet
 *   itself and the service a portal page uses to trigger it.
 *
 * Deliberately excludes any chart/header/infinite-scroll services: those
 * would serve a full SPA shell, which this separate, minimal sniplet bundle
 * has no need for (that's the React SPA's own code, in `frontend/src/main.tsx`).
 *
 * TRACKED ASSUMPTIONS — things this bundle cannot verify from the repo alone
 * and that MUST be confirmed against a real portal page before this sniplet
 * is trusted in production:
 * 1. `controller.init()`'s `this`-bound host element — see `resolveHost`'s
 *    own doc comment below.
 * 2. The host portal page already has the design-system CSS loaded — see
 *    `~/sniplet/BadgeAssignSniplet.tsx`'s top-of-file doc comment.
 * 3. The host portal page already mounts SOME `<Toaster/>` somewhere on the
 *    page — otherwise `AssignBadgeLightbox`'s success toast (rendered by
 *    this sniplet) fails completely silently, with no error and no console
 *    warning. See that component's own doc comment for the full explanation.
 */
const minibadgeBehaviours = {
  rights: { workflow: MINIBADGE_WORKFLOW_RIGHTS },
  sniplets: {
    'badge-assign': {
      title: 'minibadge.badge-assign',
      public: false,
      controller: {
        /**
         * Assumes the portal invokes `controller.init()` with `this` bound
         * to the sniplet's host DOM element. If the real contract instead
         * passes the host element as an argument, or expects a pre-existing
         * DOM node instead of one created here, this must be adjusted once
         * verified against a real portal. See `resolveHost`'s own doc
         * comment for the fallback behavior if this assumption is wrong.
         */
        init(this: unknown): void {
          if (mountedRoot) {
            // Idempotency guard (see the module-level comment above): unmount
            // and detach whatever was mounted by a previous `init()` call
            // before mounting again, instead of leaking a second React root
            // and a second DOM node sharing the same hardcoded id.
            mountedRoot.unmount();
            mountedNode?.remove();
            mountedRoot = null;
            mountedNode = null;
          }

          const mountNode = document.createElement('div');
          mountNode.id = MOUNT_NODE_ID;

          const host = resolveHost(this);
          host.appendChild(mountNode);
          const root = createRoot(mountNode);
          root.render(<BadgeAssignSniplet service={snipletBadgeAssignService} />);
          mountedRoot = root;
          mountedNode = mountNode;
        },
        /**
         * No confirmed portal contract calls a destroy hook today, but
         * nothing prevents one from being added later, and having this
         * makes the `init()` idempotency guard above independently testable
         * (init -> destroy -> init cleanly remounts).
         */
        destroy(): void {
          mountedRoot?.unmount();
          mountedNode?.remove();
          mountedRoot = null;
          mountedNode = null;
        },
      },
    },
  },
  snipletBadgeAssignService,
};

// `window.entcore` is a portal-provided global, absent in any environment
// where this bundle is loaded outside the portal (e.g. tests) — must not
// throw in that case.
window.entcore?.Behaviours?.register(MINIBADGE_APP, minibadgeBehaviours);
