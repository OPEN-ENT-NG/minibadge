export {};

/**
 * Minimal ambient typing for the `window.entcore` global the Entcore portal
 * provides to every app/sniplet bundle it loads (confirmed by the old
 * webpack config's `externals: { "entcore/entcore": "entcore", "entcore":
 * "entcore" }` — the portal supplies this global at runtime, our own bundle
 * never bundles it). None of `@edifice.io/*`'s published types cover this
 * legacy global registry, and we only need the one method this bundle
 * actually calls (`Behaviours.register`) plus the map it reads FROM in
 * `badge-assign.sniplet.ts`'s original AngularJS controller
 * (`Behaviours.applicationsBehaviours[app]`) — deliberately not attempting
 * to fully type the rest of `entcore`'s surface.
 */
declare global {
  interface Window {
    entcore?: {
      Behaviours: {
        register: (name: string, behaviours: unknown) => void;
        applicationsBehaviours?: Record<string, unknown>;
      };
    };
  }
}
