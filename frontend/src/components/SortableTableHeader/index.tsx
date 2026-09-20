import { Table } from '@edifice.io/react';
import { IconArrowDown, IconArrowUp } from '@edifice.io/react/icons';

/**
 * Clickable `Table.Th` for a sortable column. Fully controlled (no internal
 * state): clicking a column just reports it via `onSort(sortKey)`, and the
 * caller decides the actual sort direction — switching to ascending on a
 * newly-clicked column, or flipping direction when re-clicking the already
 * active one.
 *
 * Arrow direction is intentionally counterintuitive: a DOWN arrow means
 * ascending, an UP arrow means descending — don't "fix" this to the more
 * common convention (down = desc), it matches the rest of this app.
 *
 * `aria-sort` exposes the active column/direction to assistive tech
 * independently of the (decorative, `aria-hidden`) icon, and gives tests a
 * robust, icon-free way to assert sort state.
 */
export interface SortableTableHeaderProps<K extends string = string> {
  /** Already-translated column label. */
  label: string;
  /** Sort identifier for this column (e.g. a SQL column name) — opaque to this component. */
  sortKey: K;
  /** The currently active sort column, if any. */
  activeSortKey?: K;
  /** Direction of the currently active sort. Ignored when this column isn't the active one. */
  isAsc: boolean;
  /** Called with this column's `sortKey` when its header is clicked. */
  onSort: (sortKey: K) => void;
  className?: string;
}

/**
 * Generic over the caller's sort-key union `K` (defaulting to plain `string`
 * for untyped callers) so the compiler verifies every `sortKey` literal at
 * each call site is an actual member of that union — instead of forcing
 * callers to widen to `string` and cast back with `as` in their `onSort`
 * handler, which would compile silently even for a typo'd or stale key.
 */
export const SortableTableHeader = <K extends string>({
  label,
  sortKey,
  activeSortKey,
  isAsc,
  onSort,
  className,
}: SortableTableHeaderProps<K>) => {
  const isActive = sortKey === activeSortKey;

  return (
    <Table.Th aria-sort={isActive ? (isAsc ? 'ascending' : 'descending') : 'none'} className={className}>
      <button type="button" onClick={() => onSort(sortKey)}>
        {label}
        {isActive ? isAsc ? <IconArrowDown /> : <IconArrowUp /> : null}
      </button>
    </Table.Th>
  );
};
