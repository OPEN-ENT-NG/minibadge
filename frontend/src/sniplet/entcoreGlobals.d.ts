export {};

/**
 * Minimal ambient typing for the `window.entcore` global the Entcore portal
 * provides at runtime to every app/sniplet bundle it loads (this bundle
 * never bundles it itself). None of `@edifice.io/*`'s published types cover
 * this legacy global registry, and only the one method this bundle actually
 * calls (`Behaviours.register`) plus the map it reads from
 * (`Behaviours.applicationsBehaviours[app]`) are typed here — the rest of
 * `entcore`'s surface is deliberately left untyped.
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
