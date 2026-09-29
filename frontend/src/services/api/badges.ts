import { odeServices } from '@edifice.io/client';

import { Badge } from '~/models/badge';
import { request } from '~/services/api/http';

/**
 * GET /badges — verified in `BadgeController.java#getBadges`.
 * Response is wrapped in `{ all: Badge[] }` via `RequestHelper.addAllValue`.
 *
 * DEVIATION FROM PLAN: every call in this file (and in every other
 * `services/api/*.ts` file) is prefixed with `/minibadge`. The plan's
 * `API_CALL_PATTERN` example omitted it (`'/badges'`), but the backend
 * `@Get`/`@Put`/`@Post` route strings never include the module name — ENT
 * Core mounts each module's controllers under `/<module-name>` itself. This
 * is confirmed both by the collaborative-wall MIRROR source (`/collaborativewall/${wallId}`)
 * and, more directly, by the shipping AngularJS frontend of this very app
 * (`backend/src/main/resources/public/ts/services/*.ts`), which calls every
 * one of these 14 endpoints with a literal `/minibadge/...` prefix.
 */
export const getBadges = async (query?: string): Promise<Badge[]> => {
  const response = await request(() =>
    odeServices.http().get<{ all: Badge[] }>('/minibadge/badges', {
      queryParams: { query },
      disableNotifications: true,
    }),
  );
  return response.all;
};

/**
 * PUT /minibadge/types/:typeId/badge/publish — verified in `BadgeController.java#publishBadge`.
 * Returns an empty JSON object (`renderJson(request, new JsonObject())`): no
 * usable body, so this resolves `void`.
 */
export const publishBadge = async (typeId: number): Promise<void> => {
  await request(() => odeServices.http().put<void>(`/minibadge/types/${typeId}/badge/publish`));
};

/**
 * PUT /minibadge/types/:typeId/badge/privatize — verified in `BadgeController.java#privatizeBadge`.
 * No usable response body (see `publishBadge`).
 */
export const privatizeBadge = async (typeId: number): Promise<void> => {
  await request(() => odeServices.http().put<void>(`/minibadge/types/${typeId}/badge/privatize`));
};

/**
 * PUT /minibadge/types/:typeId/badge/refuse — verified in `BadgeController.java#refuseBadge`.
 * No usable response body (see `publishBadge`).
 */
export const refuseBadge = async (typeId: number): Promise<void> => {
  await request(() => odeServices.http().put<void>(`/minibadge/types/${typeId}/badge/refuse`));
};

/**
 * GET /minibadge/badges/certificate — verified in `CertificateController.java#getCertificate` (Epic D).
 * Answers the PDF itself (`application/pdf`, as an attachment), hence `responseType: 'blob'`; every
 * failure — PDF service not configured or down included — is a 503, surfaced as
 * `ApiError('unavailable')`.
 */
export const downloadCertificate = async (): Promise<Blob> =>
  request(() =>
    odeServices.http().get<Blob>('/minibadge/badges/certificate', {
      responseType: 'blob',
      disableNotifications: true,
    }),
  );
