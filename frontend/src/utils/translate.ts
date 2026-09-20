import { TFunction } from 'i18next';

/**
 * Positional `{0}`/`{1}`/... placeholder substitution. This is NOT the same
 * as i18next's own interpolation: this app's i18next config (`~/i18n.ts`)
 * repurposes the usual `{{...}}`-style interpolation delimiters to
 * `[[...]]`, so `t(key)` never substitutes a literal `{0}` automatically —
 * it comes back untouched, which is why this helper exists for keys with
 * positional placeholders (e.g. `minibadge.active.users`:
 * `"{0} participants actifs"`).
 *
 * An index with no corresponding entry in `params` is left as the literal
 * `{n}` in the output, rather than being stripped or turned into
 * `"undefined"`.
 */
export function formatMessage(
  t: TFunction,
  key: string,
  params: (string | number)[] = [],
): string {
  return t(key).replace(/{(\d+)}/g, (match: string, index: string) => {
    const value = params[Number(index)];
    return value !== undefined ? String(value) : match;
  });
}
