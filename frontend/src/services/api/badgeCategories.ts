import { odeServices } from '@edifice.io/client';

import { BadgeCategory } from '~/models/badgeCategory';
import { request } from '~/services/api/http';

/**
 * GET /categories — verified in `BadgeCategoryController.java#getAllCategories`.
 * Unlike most list endpoints, this one renders a plain JSON array
 * (`new JsonArray(...)`), NOT wrapped in `{ all }`.
 */
export const getBadgeCategories = async (): Promise<BadgeCategory[]> => {
  const response = await request(() =>
    odeServices.http().get<BadgeCategory[]>('/minibadge/categories', {
      disableNotifications: true,
    }),
  );
  return response;
};
