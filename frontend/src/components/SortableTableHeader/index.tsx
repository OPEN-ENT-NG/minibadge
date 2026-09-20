import { Table } from '@edifice.io/react';
import { IconArrowDown, IconArrowUp } from '@edifice.io/react/icons';

/**
 * Clickable `Table.Th` for a sortable column.
 *
 * `Table` (`node_modules/@edifice.io/react/dist/components/Table/components/Table.d.ts`)
 * is a plain semantic wrapper (`Table`/`Table.Thead`/`Table.Th`/`Table.Tbody`/
 * `Table.Tr`/`Table.Td`, props = standard `HTMLAttributes`) — no sorting
 * logic built in. This mirrors exactly what the AngularJS
 * `minibadgeBadgeGivenArray` directive's `onClick` does
 * (`badge-given-array.ts:70-79`): clicking a *different* column always
 * switches to ascending on that column; re-clicking the *already active*
 * column flips its direction. That decision belongs to whoever owns the
 * `sortKey`/`isAsc` state (the `badges-given` screen, per the plan's Task 2)
 * — this component only reports which column was clicked via
 * `onSort(sortKey)` and renders whatever active/direction state it's given,
 * so it stays a small, reusable, fully controlled piece (no internal state).
 *
 * Arrow direction mirrors the source exactly, counterintuitive as it looks:
 * `badge-given-array.html:5-6` shows a DOWN arrow (`sort-arrow-down` CSS
 * class) while `vm.isAsc` is true, and an UP arrow while descending. Kept
 * as-is rather than "corrected" to the more common convention (down = desc),
 * since this is a faithful port of existing behavior, not a redesign.
 *
 * `aria-sort` (the native ARIA attribute for sortable `<th>` cells) is also
 * set, exposing the active column/direction to assistive tech independently
 * of the (decorative, `aria-hidden`) icon, and giving tests a robust,
 * icon-free way to assert sort state.
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
