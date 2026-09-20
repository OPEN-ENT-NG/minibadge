import { StrictMode } from 'react';

import '@edifice.io/bootstrap/dist/index.css';
import { ERROR_CODE } from '@edifice.io/client';
import { EdificeClientProvider, EdificeThemeProvider } from '@edifice.io/react';
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import { RouterProvider } from 'react-router-dom';
import './i18n';

import { ErrorFallback } from '~/components/ErrorFallback';

import { router } from './routes';

const rootElement = document.getElementById('root');
const root = createRoot(rootElement!);

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: unknown) => {
      if (error === ERROR_CODE.NOT_LOGGED_IN)
        window.location.replace('/auth/login');
    },
  }),
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2,
    },
  },
});

root.render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <EdificeClientProvider params={{ app: 'minibadge' }}>
        <EdificeThemeProvider>
          {/* A React error boundary can only catch errors thrown by its own
              descendants during render/lifecycle, never by its own
              ancestors. This boundary's only descendant is `<RouterProvider>`,
              so its real coverage is routes/screens/`Layout`/`CharterGate` —
              everything `router(queryClient)` renders — NOT a bootstrapping
              failure inside `QueryClientProvider`, `EdificeClientProvider`,
              or `EdificeThemeProvider` themselves (e.g. `EdificeClientProvider`
              throwing on a malformed session response); such a failure would
              still white-screen the app with no recovery UI.

              This placement is deliberate: `ErrorFallback` itself renders
              through `EmptyScreen`/`Button` (`@edifice.io/react`) and is
              translated via i18n set up before `main.tsx` even runs, so it
              depends on the theme/design-system context and i18n those exact
              3 providers set up. A boundary placed outside them (to also
              catch their own failures) could not safely render this same
              fallback if one of those providers were the thing failing — it
              would need a second, more primitive, provider-free fallback of
              its own around this entire `root.render(...)` tree. */}
          <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => queryClient.clear()}>
            <RouterProvider router={router(queryClient)} />
          </ErrorBoundary>
        </EdificeThemeProvider>
      </EdificeClientProvider>
    </QueryClientProvider>
  </StrictMode>,
);
