import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { describe, expect, it, vi } from 'vitest';

import { ErrorFallback } from '.';

/**
 * Deliberately throws on render. `shouldThrow` lets the same component be
 * reused after a `resetErrorBoundary` call to prove recovery actually
 * re-renders real children instead of getting stuck on the fallback forever.
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
   * `main.tsx` wires `onReset={() => queryClient.clear()}` on its
   * `ErrorBoundary` rather than route-based `resetKeys`, since the boundary
   * sits outside the router (around `<RouterProvider>` itself) where
   * `useLocation()` isn't available. This proves that mechanism actually
   * recovers a component that throws on a corrupt cached value.
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
