/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default ({ mode }: { mode: string }) => {
  const envFile = loadEnv(mode, process.cwd());
  const envs = { ...process.env, ...envFile };
  const hasEnvFile = Object.keys(envFile).length;

  // FIX (dev-session bug report): when proxying to a remote "recette"
  // environment, the outgoing proxied request needs a `Cookie` header
  // (below, in `proxyObj`) so the BACKEND recognizes the session — but the
  // BROWSER also needs its own `XSRF-TOKEN` cookie for `localhost:4200` so
  // `@edifice.io/client`'s axios instance can read it and echo it back as a
  // request header on PUT/POST (the double-submit CSRF check). Without this,
  // GETs work (session cookie alone is enough) but every PUT/POST fails with
  // `invalid.xsrf.token` — confirmed against
  // `~/EDIFICE/app/collaborative-wall/frontend/vite.config.ts`, which sets
  // this same `headers` object on `server.headers`/`preview.headers` (below)
  // for exactly this reason. This was dropped by mistake when this file was
  // first scaffolded.
  const headers = hasEnvFile
    ? {
        'set-cookie': [
          `oneSessionId=${envs.VITE_ONE_SESSION_ID}`,
          `XSRF-TOKEN=${envs.VITE_XSRF_TOKEN}`,
        ],
        'Cache-Control': 'public, max-age=300',
      }
    : {};

  const proxyObj = hasEnvFile
    ? {
        target: envs.VITE_RECETTE,
        changeOrigin: true,
        headers: {
          cookie: `oneSessionId=${envs.VITE_ONE_SESSION_ID};authenticated=true; XSRF-TOKEN=${envs.VITE_XSRF_TOKEN}`,
        },
      }
    : {
        target: 'http://localhost:8090',
        changeOrigin: false,
      };

  return defineConfig({
    base: mode === 'production' ? '/minibadge' : '',
    root: __dirname,
    cacheDir: './node_modules/.vite/minibadge',

    resolve: {
      alias: {
        '@images': 'node_modules/@edifice.io/bootstrap/dist/images',
      },
    },

    server: {
      fs: {
        allow: ['../../'],
      },
      proxy: {
        '/applications-list': proxyObj,
        '/conf/public': proxyObj,
        '^/(?=help-1d|help-2d)': proxyObj,
        '^/(?=assets)': proxyObj,
        '^/(?=theme|locale|i18n|skin)': proxyObj,
        '^/(?=auth|appregistry|archive|cas|userbook|directory|communication|conversation|portal|session|timeline|workspace|infra)':
          proxyObj,
        '/xiti': proxyObj,
        '/analyticsConf': proxyObj,
        '/minibadge': proxyObj,
      },
      port: 4200,
      headers,
      host: 'localhost',
    },

    preview: {
      port: 4300,
      headers,
      host: 'localhost',
    },

    plugins: [react(), tsconfigPaths()],

    build: {
      outDir: './dist',
      emptyOutDir: true,
      reportCompressedSize: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      assetsDir: 'public',
      chunkSizeWarningLimit: 5000,
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },

    test: {
      watch: false,
      globals: true,
      environment: 'jsdom',
      include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      setupFiles: ['./src/mocks/setup.ts'],
      reporters: ['default'],
      coverage: {
        reportsDirectory: './coverage/minibadge',
        provider: 'v8',
      },
      server: {
        deps: {
          inline: ['@edifice.io/react'],
        },
      },
    },
  });
};
