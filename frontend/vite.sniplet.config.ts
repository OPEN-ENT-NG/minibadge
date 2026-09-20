/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

/**
 * Separate build for the "badge-assign" portal sniplet (Phase 8, Part A) —
 * a standalone, self-sufficient IIFE bundle (React/ReactDOM bundled in,
 * NOT declared as externals, unlike the old webpack `externals` for
 * `entcore`/`angular` — see the plan's isolation-risk note: this sniplet may
 * end up on a page that already has its own copy of React, so it carries
 * its own rather than risk a version mismatch) served at the Entcore
 * convention path `public/js/behaviours.js` (path convention recovered from
 * `gulpfile.js:33-34`'s `gulp.dest('./src/main/resources/public/js')`).
 *
 * Deliberately separate from `vite.config.ts` (the main SPA build): the SPA
 * is a routed, `index.html`-served app; this is a `Behaviours.register`
 * side-effect script the portal loads independently on ANY page, with no
 * router and no HTML entry point of its own — a classic Vite `build.lib`
 * target, not `vite.config.ts`'s multi-page app build. No dev proxy/env
 * loading is needed here (unlike `vite.config.ts`): this bundle has no
 * screens to preview standalone against a recette backend, only a
 * lib build to produce and manually drop into a real portal page for
 * verification (see the plan's residual-risk note).
 */
export default defineConfig({
  root: __dirname,
  cacheDir: './node_modules/.vite/minibadge-sniplet',

  resolve: {
    alias: {
      '@images': resolve(__dirname, 'node_modules/@edifice.io/bootstrap/dist/images'),
    },
  },

  plugins: [react(), tsconfigPaths()],

  build: {
    outDir: './dist-sniplet',
    emptyOutDir: true,
    // Bundling React/ReactDOM (+ deps) into this IIFE costs ~850KB / 258KB
    // gzip. That's a deliberate, already-accepted tradeoff, not an oversight
    // — see the class doc above: this bundle carries its own React rather
    // than risk clashing with whatever version the host portal page already
    // has loaded.
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    lib: {
      entry: resolve(__dirname, 'src/sniplet/main.tsx'),
      // Required by Vite's config schema for `formats: ['iife']` (build
      // fails with "Option \"build.lib.name\" is required when output
      // formats include \"umd\" or \"iife\"" without it — verified by
      // rebuilding with it removed), but otherwise inert here: `name` would
      // normally expose the entry's exports as `window.MinibadgeSniplet`,
      // and `main.tsx` has no exports (it's a side-effect-only script that
      // calls `Behaviours.register` at module-eval time), so no such global
      // is actually created. Kept only to satisfy the schema.
      name: 'MinibadgeSniplet',
      formats: ['iife'],
      fileName: () => 'behaviours.js',
    },
  },
});
