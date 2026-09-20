import { TFunction } from 'i18next';
import { describe, expect, it, vi } from 'vitest';

import { formatMessage } from './translate';

/**
 * `formatMessage` is intentionally decoupled from i18next's own resolution:
 * it only ever post-processes whatever string `t(key)` already returned.
 * A fake `t` covering the exact shapes seen in `fr.json`
 * (`minibadge.active.users`, `minibadge.statistics.top`, etc.) is enough to
 * prove the positional substitution itself, without needing a real i18next
 * instance.
 */
function fakeT(translations: Record<string, string>): TFunction {
  return ((key: string) => translations[key] ?? key) as TFunction;
}

describe('formatMessage', () => {
  it('substitutes a single {0} placeholder', () => {
    const t = fakeT({ 'minibadge.active.users': '{0} participants actifs' });

    expect(formatMessage(t, 'minibadge.active.users', [12])).toBe('12 participants actifs');
  });

  it('substitutes multiple placeholders by their own index, not by order of appearance', () => {
    const t = fakeT({ fake: '{1} then {0}' });

    expect(formatMessage(t, 'fake', ['a', 'b'])).toBe('b then a');
  });

  it('accepts string params as well as numbers', () => {
    const t = fakeT({ fake: 'Hello {0}' });

    expect(formatMessage(t, 'fake', ['World'])).toBe('Hello World');
  });

  it('leaves a placeholder with no corresponding param untouched (mirrors the AngularJS fallback)', () => {
    const t = fakeT({ fake: '{0} and {1}' });

    expect(formatMessage(t, 'fake', ['only-one'])).toBe('only-one and {1}');
  });

  it('leaves every placeholder untouched when no params are given at all', () => {
    const t = fakeT({ fake: '{0} badges' });

    expect(formatMessage(t, 'fake')).toBe('{0} badges');
  });

  it('returns the translated string unchanged when it has no placeholders', () => {
    const t = fakeT({ 'minibadge.statistics': 'Statistiques' });

    expect(formatMessage(t, 'minibadge.statistics', [42])).toBe('Statistiques');
  });

  it('never calls i18next\'s own {{...}}/[[...]] interpolation mechanism — only post-processes the resolved string', () => {
    const spy = vi.fn((key: string) => `[[raw:${key}]] {0}`);
    const result = formatMessage(spy as unknown as TFunction, 'some.key', ['x']);

    expect(spy).toHaveBeenCalledWith('some.key');
    expect(result).toBe('[[raw:some.key]] x');
  });
});
