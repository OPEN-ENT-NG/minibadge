import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { SortableTableHeader } from '.';

/**
 * Minimal controlled-state harness mirroring exactly what the real
 * `badges-given` screen (Task 2) does with its `sortKey`/`isAsc` state: this
 * component is a fully controlled, dumb `Table.Th` — the toggle-direction
 * decision (mirrors `badge-given-array.ts:70-79`) is the caller's
 * responsibility. This test supplies its own tiny caller to exercise that
 * decision in isolation, the same rule the real screen follows.
 */
function Harness() {
  const [sortKey, setSortKey] = useState<string | undefined>(undefined);
  const [isAsc, setIsAsc] = useState(true);

  const handleSort = (clicked: string) => {
    setIsAsc(clicked === sortKey ? !isAsc : true);
    setSortKey(clicked);
  };

  return (
    <table>
      <thead>
        <tr>
          <SortableTableHeader
            label="Colonne A"
            sortKey="col-a"
            activeSortKey={sortKey}
            isAsc={isAsc}
            onSort={handleSort}
          />
          <SortableTableHeader
            label="Colonne B"
            sortKey="col-b"
            activeSortKey={sortKey}
            isAsc={isAsc}
            onSort={handleSort}
          />
        </tr>
      </thead>
    </table>
  );
}

describe('SortableTableHeader', () => {
  it('has no active sort column initially', () => {
    render(<Harness />);

    expect(screen.getByRole('columnheader', { name: 'Colonne A' })).toHaveAttribute('aria-sort', 'none');
    expect(screen.getByRole('columnheader', { name: 'Colonne B' })).toHaveAttribute('aria-sort', 'none');
  });

  it('clicking a column sorts it ascending and reports its sortKey', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Colonne A' }));

    expect(screen.getByRole('columnheader', { name: 'Colonne A' })).toHaveAttribute('aria-sort', 'ascending');
    expect(screen.getByRole('columnheader', { name: 'Colonne B' })).toHaveAttribute('aria-sort', 'none');
  });

  it('re-clicking the same (already active) column flips the direction to descending', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Colonne A' }));
    await user.click(screen.getByRole('button', { name: 'Colonne A' }));

    expect(screen.getByRole('columnheader', { name: 'Colonne A' })).toHaveAttribute('aria-sort', 'descending');
  });

  it('clicking a different column resets sorting to ascending on that new column', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    // Column A: ascending then descending.
    await user.click(screen.getByRole('button', { name: 'Colonne A' }));
    await user.click(screen.getByRole('button', { name: 'Colonne A' }));
    // Switching to column B must land on ascending, not carry over "descending".
    await user.click(screen.getByRole('button', { name: 'Colonne B' }));

    expect(screen.getByRole('columnheader', { name: 'Colonne A' })).toHaveAttribute('aria-sort', 'none');
    expect(screen.getByRole('columnheader', { name: 'Colonne B' })).toHaveAttribute('aria-sort', 'ascending');
  });
});
