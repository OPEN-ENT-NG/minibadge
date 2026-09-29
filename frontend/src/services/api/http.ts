import { odeServices } from '@edifice.io/client';

/**
 * Shared HTTP error type. Thrown as a real `Error` subclass (not a bare
 * string) so TanStack Query's `error` field — typed `Error | null`
 * regardless of what's actually thrown — stays accurate; callers can check
 * `error.code` or `error instanceof ApiError`.
 */
export class ApiError extends Error {
  /**
   * `unavailable` (503) is only answered by `GET /badges/certificate` when the platform PDF service is
   * not configured or failed (Epic D): a temporary condition, worded as such to the user.
   */
  constructor(public readonly code: 'unauthorized' | 'notfound' | 'unavailable' | 'error') {
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
  } else if (status == 503) {
    throw new ApiError('unavailable');
  } else if (status >= 400) {
    throw new ApiError('error');
  }
};

/**
 * `odeServices.http()`'s `get`/`post`/`put`/`delete` calls wrap axios with no
 * custom `validateStatus`, so axios's default behavior applies: any non-2xx
 * response makes the call itself REJECT rather than resolve. `.latestResponse`
 * is still populated at that point (the underlying error mapper sets it,
 * synchronously, before rethrowing) — including a synthesized timeout/unknown
 * shape when there's no real HTTP response at all — so it's safe to read
 * `odeServices.http().latestResponse?.status` from inside a `catch` handler
 * wrapped around the call, without needing to inspect the thrown value itself
 * (which is the raw response body, not necessarily an `Error`).
 *
 * Every `services/api/*.ts` call site routes its `odeServices.http()...` call
 * through `request()` so a rejected call is normalized into the same stable
 * `ApiError` a resolved-but-bad-status call would produce.
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
    } else if (status === 503) {
      throw new ApiError('unavailable');
    }
    throw new ApiError('error');
  }
};
