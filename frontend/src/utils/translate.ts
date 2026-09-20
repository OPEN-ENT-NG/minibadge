import { TFunction } from 'i18next';

/**
 * Positional `{0}`/`{1}`/... placeholder substitution, mirroring AngularJS's
 * `utils/string.utils.ts#translate(key, params)` EXACTLY:
 * ```ts
 * export function translate(key: string, params?: string[]) {
 *     return lang.translate(key).replace(/{(\d+)}/g,
 *         (value, i) => typeof params[i] != "undefined" ? params[i] : value);
 * }
 * ```
 *
 * This mechanism is NOT the same as i18next's own interpolation: this app's
 * i18next config (`~/i18n.ts`) repurposes the usual `{{...}}`-style
 * interpolation delimiters to `[[...]]` (chosen in Phase 1 so i18next
 * coexists with the AngularJS template syntax `[[ ]]` still present in the
 * very same `fr.json` strings elsewhere) — so `t(key)` never substitutes a
 * literal `{0}` automatically, it comes back untouched. No screen ported
 * before Phase 6 needed this (every key used so far was static); this is the
 * first one whose keys carry positional placeholders (e.g.
 * `minibadge.active.users`: `"{0} participants actifs"`).
 *
 * Fallback behavior mirrors the source precisely: an index with no
 * corresponding entry in `params` is left as the literal `{n}` in the
 * output, rather than being stripped or turned into `"undefined"`.
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
