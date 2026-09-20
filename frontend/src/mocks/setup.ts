import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll } from 'vitest';

import '~/i18n';

import { server } from './server';

/**
 * jsdom doesn't implement `ResizeObserver`, which `apexcharts` (used by
 * `~/components/BadgeChart`) requires unconditionally on mount. This is a
 * well-known, standard polyfill need for chart libraries under jsdom — not
 * minibadge-specific behavior.
 */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

/**
 * jsdom doesn't implement `IntersectionObserver` either, which
 * `routes/badge-types` (Phase 4) uses to trigger the next page of its
 * infinite scroll once a sentinel element at the bottom of the grid comes
 * into view. jsdom has no real layout/scroll geometry to make that
 * meaningful, so — like the `ResizeObserver` stub above — this fires
 * `isIntersecting: true` synchronously on every `observe()` call rather than
 * only when the target is genuinely scrolled into view. That's enough for
 * `routes/badge-types/index.test.tsx` to exercise the real
 * `useInfiniteQuery` pagination mechanism end-to-end (each `fetchNextPage()`
 * that resolves with `hasNextPage` still `true` triggers this effect again,
 * cascading through every available page) without needing to simulate real
 * scroll positions.
 */
if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class IntersectionObserver {
    constructor(private callback: IntersectionObserverCallback) {}
    observe(target: Element) {
      this.callback(
        [{ isIntersecting: true, target } as IntersectionObserverEntry],
        this as unknown as globalThis.IntersectionObserver,
      );
    }
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
    root = null;
    rootMargin = '';
    thresholds: ReadonlyArray<number> = [];
  } as unknown as typeof globalThis.IntersectionObserver;
}

/**
 * jsdom also doesn't implement SVG layout (`getBBox`), which `apexcharts`
 * calls internally while measuring text/shapes. Same rationale as the
 * `ResizeObserver` polyfill above.
 *
 * jsdom doesn't implement the specific SVG element interfaces (`SVGRectElement`,
 * `SVGTextElement`, ...) either — every SVG node is a plain `SVGElement`
 * instance (verified at runtime), so `getBBox` (declared on `SVGGraphicsElement`
 * in the DOM lib types) must be polyfilled on the actual runtime base class,
 * `SVGElement`, not on the more specific type the lib declares it on.
 */
type SVGElementWithBBox = typeof SVGElement & {
  prototype: { getBBox?: () => DOMRect };
};
const SVGElementCtor = SVGElement as unknown as SVGElementWithBBox;
if (typeof SVGElement !== 'undefined' && !SVGElementCtor.prototype.getBBox) {
  SVGElementCtor.prototype.getBBox = () => ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    toJSON: () => '',
  });
}

/**
 * `EdificeClientProvider` bootstraps a session/config on mount via
 * `@edifice.io/client` (axios-based HTTP calls to the ENT Core platform).
 * This app has no features yet, so the only thing tests need is for that
 * bootstrap to resolve without ever reaching a real network — hence MSW,
 * mirroring the pattern used by the other already-migrated Edifice apps.
 */

// Enable API mocking before tests.
beforeAll(() =>
  server.listen({
    onUnhandledRequest: 'warn',
  }),
);

// Reset any request handlers added in individual tests.
afterEach(() => server.resetHandlers());

// Disable API mocking after the tests are done.
afterAll(() => server.close());
