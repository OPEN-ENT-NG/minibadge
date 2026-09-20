import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { describe, expect, it, vi } from 'vitest';

import { ErrorFallback } from '.';

/**
 * Deliberately throws on render — mirrors the plan's testing strategy for
 * Constat #4 ("un composant de test qui lève délibérément une erreur, monté
 * sous la boundary, doit afficher le fallback au lieu de crasher tout
 * l'arbre"). `shouldThrow` lets the same component be reused after a
 * `resetErrorBoundary` call to prove recovery actually re-renders real
 * children instead of getting stuck on the fallback forever.
 */
function Bomb({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('boom');
  }
  return <p>Recovered content</p>;
}

describe('ErrorFallback', () => {
  it('renders the fallback instead of crashing the whole tree when a child throws', () => {
    // `react-error-boundary`'s own `componentDidCatch` still logs the caught
    // error to the console (by design, so it's not silently swallowed in
    // production) — silenced here so the test output isn't noisy.
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Une erreur inattendue est survenue')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it('clicking "Réessayer" calls resetErrorBoundary, re-rendering real children once the error condition clears', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();

    function Harness() {
      // Mirrors a real caller: the thing that made the child throw is fixed
      // externally, then `resetErrorBoundary` (wired to "Réessayer") is what
      // makes the boundary attempt to render children again.
      const [shouldThrow, setShouldThrow] = useState(true);
      return (
        <ErrorBoundary
          FallbackComponent={ErrorFallback}
          onReset={() => setShouldThrow(false)}
        >
          <Bomb shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );
    }

    render(<Harness />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByText('Recovered content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  /**
   * REVIEW FIX (react-reviewer, MEDIUM — `main.tsx`'s `ErrorBoundary` had no
   * `resetKeys`/`onReset`, so "Réessayer" just re-rendered the exact same
   * tree with the exact same inputs, silently doing nothing for a
   * deterministic render bug). `main.tsx` wires
   * `onReset={() => queryClient.clear()}` (a corrupt/stale React Query cache
   * entry is a very plausible real cause of a persistent render error in this
   * heavily React-Query-driven app) rather than a route-based `resetKeys`,
   * because `ErrorBoundary` sits OUTSIDE the router (around
   * `<RouterProvider>` itself, see `main.tsx`), so `useLocation()` isn't
   * available at that level. This test proves that exact mechanism actually
   * recovers: a component that throws while the query cache holds corrupt
   * data recovers on the SECOND "Réessayer" click once `onReset` has cleared
   * that cache — mirroring `main.tsx`'s real wiring rather than the generic
   * `useState` harness above.
   */
  it('recovers via `onReset={() => queryClient.clear()}` (main.tsx\'s actual reset mechanism) once the corrupt cache entry is cleared', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();

    function CacheBomb() {
      const queryClient = useQueryClient();
      const cached = queryClient.getQueryData<{ corrupt: boolean }>(['bomb']);
      if (cached?.corrupt) {
        throw new Error('rendering a corrupt cached value');
      }
      return <p>Recovered content</p>;
    }

    function CacheHarness() {
      const [queryClient] = useState(() => {
        const client = new QueryClient();
        client.setQueryData(['bomb'], { corrupt: true });
        return client;
      });
      return (
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => queryClient.clear()}>
            <CacheBomb />
          </ErrorBoundary>
        </QueryClientProvider>
      );
    }

    render(<CacheHarness />);

    expect(screen.getByRole('alert')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByText('Recovered content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});
