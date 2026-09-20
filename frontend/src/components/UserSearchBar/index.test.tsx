import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UserSearchBar } from '.';

describe('UserSearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exposes an accessible name via the required ariaLabel prop', () => {
    render(
      <UserSearchBar
        ariaLabel="Rechercher un utilisateur"
        onSearch={vi.fn()}
        placeholder="Rechercher un badge"
      />,
    );

    expect(
      screen.getByRole('searchbox', { name: 'Rechercher un utilisateur' }),
    ).toBeInTheDocument();
  });

  it('does not call onSearch immediately when typing', () => {
    const onSearch = vi.fn();
    render(<UserSearchBar ariaLabel="Rechercher un utilisateur" onSearch={onSearch} />);

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'toto' } });

    expect(onSearch).not.toHaveBeenCalled();
  });

  it('debounces onSearch and calls it once with the final value', () => {
    const onSearch = vi.fn();
    render(<UserSearchBar ariaLabel="Rechercher un utilisateur" onSearch={onSearch} />);

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 't' } });
    fireEvent.change(input, { target: { value: 'to' } });
    fireEvent.change(input, { target: { value: 'toto' } });

    expect(onSearch).not.toHaveBeenCalled();

    // The 300ms timer firing triggers two chained React updates (`value` →
    // `debouncedValue` via `useDebounce`, then this component's own effect
    // watching `debouncedValue`) — `act(...)` ensures both are flushed
    // before asserting, as the browser would before the next paint.
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith('toto');
  });

  it('does not call onSearch on mount', () => {
    const onSearch = vi.fn();
    render(<UserSearchBar ariaLabel="Rechercher un utilisateur" onSearch={onSearch} />);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onSearch).not.toHaveBeenCalled();
  });
});
