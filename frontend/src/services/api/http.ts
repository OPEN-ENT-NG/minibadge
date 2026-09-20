import { odeServices } from '@edifice.io/client';

/**
 * SOURCE: ~/EDIFICE/app/collaborative-wall/frontend/src/services/api/index.ts:9-18
 * Shared HTTP error mapper. Every `services/api/*.ts` call site invokes this
 * right after awaiting `odeServices.http()` so callers get a small, stable
 * set of thrown values instead of raw axios/status-code plumbing.
 *
 * REVIEW FIX (typescript-reviewer, HIGH): `checkHttpResponse` used to `throw`
 * bare string literals. TanStack Query v5 types every hook's `error` field as
 * `Error | null` (`DefaultError`) regardless of what's actually thrown, so a
 * string-throw was a live type lie — any `error?.message` / `error instanceof
 * Error` in a future screen would silently misbehave. Throwing a real `Error`
 * subclass fixes the type without losing the ability to distinguish the three
 * cases: callers can check `error.code` (or `error instanceof ApiError`).
 */
export class ApiError extends Error {
  constructor(public readonly code: 'unauthorized' | 'notfound' | 'error') {
    super(code);
    this.name = 'ApiError';
  }
}

export const checkHttpResponse = () => {
  const { status } = odeServices.http().latestResponse;
  if (status == 401) {
    throw new ApiError('unauthorized');
  } else if (status == 404) {
    throw new ApiError('notfound');
  } else if (status >= 400) {
    throw new ApiError('error');
  }
};

/**
 * CENTRAL FIX (typescript-reviewer, HIGH — codebase-wide, see the
 * `saveUserChart`-only workaround this generalizes in `~/services/api/charter.ts`):
 * `odeServices.http()` (verified in `node_modules/@edifice.io/client@2.2.4/dist/index.js`)
 * resolves to `OdeServices.http()` -> `this._http`, a `HttpService` instance
 * (the class at `index.js` starting `class HttpService { ... }`, NOT the
 * unused sibling `Http` class earlier in the same bundle). Its `get`/`post`/
 * `put`/`delete`/... methods are all `async` and wrap the underlying
 * `axios.get/post/put/delete(...)` call in a real `try/catch`:
 *
 *   async get(e, t) {
 *     try {
 *       const s = await this.axios.get(...);
 *       return this.mapAxiosResponse(s, t);
 *     } catch (s) {
 *       throw this.mapAxiosError(s, t);
 *     }
 *   }
 *
 * `axios` has no custom `validateStatus` configured anywhere in this class,
 * so axios's DEFAULT behavior applies: any non-2xx response makes the
 * `axios.get/post/put(...)` promise itself REJECT, taking the `catch` branch
 * above. That means `await odeServices.http().get/put/post(...)` REJECTS on
 * every real HTTP error instead of resolving — `checkHttpResponse()` called
 * right after such an `await` (the pattern every `services/api/*.ts` call
 * site used) is unreachable dead code on failure.
 *
 * The crux this fixes: is `.latestResponse` still populated when the call
 * rejects? Yes — confirmed by reading `mapAxiosError` itself:
 *
 *   mapAxiosError(e, t) {
 *     e.response ? this._latestResponse = e.response : e.request ? this._latestResponse = {
 *       status: 408, statusText: ERROR_CODE.TIME_OUT
 *     } : this._latestResponse = { status: 500, statusText: ERROR_CODE.UNKNOWN };
 *     ...
 *     return o; // = this._latestResponse.data — the raw response body, NOT an Error
 *   }
 *
 * `mapAxiosError` runs synchronously inside the `catch` block, BEFORE the
 * `throw`, and unconditionally sets `_latestResponse` (from the real
 * response, or a synthesized timeout/unknown-error shape) in every branch.
 * So `odeServices.http().latestResponse?.status` is reliable in a `catch`
 * handler wrapped around the call — no need to duck-type the thrown value
 * (which is `mapAxiosError`'s return value `o`, i.e. the response *body*,
 * often not an `Error` at all — this is what `saveUserChart`'s comment in
 * `charter.ts` already flagged as "raw response body, often ''").
 *
 * `request()` below is the generic version of the `try {} finally {
 * checkHttpResponse(); }` pattern `saveUserChart` used as a one-off: every
 * `services/api/*.ts` call site should route its `odeServices.http()...`
 * call through this instead of the old `await ...; checkHttpResponse();`
 * two-liner, so a rejected call is normalized into the same stable `ApiError`
 * a resolved-but-bad-status call would produce.
 */
export const request = async <R>(call: () => Promise<R>): Promise<R> => {
  try {
    const result = await call();
    // Defensive: covers the (unlikely, since axios's default validateStatus
    // never resolves on non-2xx) case of a resolved call with a bad status.
    checkHttpResponse();
    return result;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Normalizes a rejected `odeServices.http()` call (or any other thrown
    // error) into our stable `ApiError` shape, using `.latestResponse` —
    // proven above to be populated by `mapAxiosError` before the rethrow.
    const status = odeServices.http().latestResponse?.status;
    if (status === 401) {
      throw new ApiError('unauthorized');
    } else if (status === 404) {
      throw new ApiError('notfound');
    }
    throw new ApiError('error');
  }
};
