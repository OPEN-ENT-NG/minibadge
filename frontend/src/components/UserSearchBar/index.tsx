import { SearchBar, useDebounce } from '@edifice.io/react';
import { ChangeEvent, useEffect, useRef, useState } from 'react';

/**
 * GAP FROM PLAN: there is no `UserSearch` component in `@edifice.io/react`
 * 2.2.4 (verified: no such export in
 * `node_modules/@edifice.io/react/dist/components/index.d.ts`) — only
 * `SearchBar`. This wraps `SearchBar` in its "dynamic" mode (`isVariant: true`,
 * per `SearchBar.d.ts`'s `DynamicSearchBar` variant, which fires `onChange` as
 * the user types rather than requiring a submit click).
 *
 * Props verified against `node_modules/@edifice.io/react/dist/components/SearchBar/SearchBar.d.ts`.
 *
 * REVIEW FIX (react-reviewer, HIGH): `SearchBar`'s own `placeholder` prop is
 * NOT a valid accessible name per WCAG 1.3.1/4.1.2 (placeholder text
 * disappears on input and isn't reliably exposed to every AT). `ariaLabel` is
 * therefore a required prop here, forwarded as `aria-label` — `SearchBar.js`
 * spreads `...restProps` onto its internal `FormControl.Input`, so this
 * reaches the real `<input>` at runtime. `SearchBarProps` doesn't declare
 * `aria-label` in its type, so it's passed through an untyped spread to avoid
 * an excess-property error while still type-checking every other prop.
 *
 * REVIEW FIX (react-reviewer, MEDIUM): `onSearch` used to fire on every
 * keystroke. A debounce delays the call by 300ms, the common UX convention,
 * and is skipped on the initial render so mounting the component never
 * fires a search with the empty starting value.
 *
 * DEBOUNCE MECHANISM (post-migration improvement plan, Constat #3): now uses
 * `@edifice.io/react`'s `useDebounce<T>(value, delay)` instead of a hand-rolled
 * `setTimeout`/`clearTimeout`. Verified its exact implementation first
 * (`node_modules/@edifice.io/react/dist/hooks/useDebounce/useDebounce.js`):
 * `useState(value)` initializes the returned debounced value to `value`
 * IMMEDIATELY on mount (no delay for the very first render) — only
 * SUBSEQUENT changes are delayed via a `setTimeout`. This means the
 * `isFirstRender` guard below is STILL required despite switching to the
 * shared hook: without it, the effect watching the debounced value would
 * still fire once on mount with the empty starting value, exactly the bug
 * this guard originally existed to prevent. The plan explicitly flagged this
 * as something to verify rather than assume, since the hook "does not
 * provide this semantics natively."
 */
export interface UserSearchBarProps {
  ariaLabel: string;
  placeholder?: string;
  onSearch: (value: string) => void;
  className?: string;
}

const DEBOUNCE_DELAY_MS = 300;

export const UserSearchBar = ({ ariaLabel, placeholder, onSearch, className }: UserSearchBarProps) => {
  const [value, setValue] = useState('');
  const debouncedValue = useDebounce(value, DEBOUNCE_DELAY_MS);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    onSearch(debouncedValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValue]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => setValue(event.target.value);

  const ariaProps = { 'aria-label': ariaLabel };

  return (
    <SearchBar
      isVariant={true}
      placeholder={placeholder}
      onChange={handleChange}
      className={className}
      {...ariaProps}
    />
  );
};
