import { SearchBar, useDebounce } from '@edifice.io/react';
import { ChangeEvent, useEffect, useRef, useState } from 'react';

/**
 * Wraps `SearchBar` in its "dynamic" mode (`isVariant: true`), which fires
 * `onChange` as the user types rather than requiring a submit click.
 *
 * `ariaLabel` is required: `SearchBar`'s own `placeholder` prop is not a
 * valid accessible name (placeholder text disappears on input and isn't
 * reliably exposed to every AT). It's forwarded as `aria-label` through an
 * untyped spread since `SearchBarProps` doesn't declare that attribute in
 * its type, but `SearchBar` does spread unknown props onto its underlying
 * `<input>`.
 *
 * `useDebounce` initializes its returned value to the current value
 * immediately on mount (no delay for the first render) — only subsequent
 * changes are delayed. The `isFirstRender` guard below is still needed
 * despite that, since without it the effect watching the debounced value
 * would still fire once on mount with the empty starting value.
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
