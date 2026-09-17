import { http, HttpResponse } from 'entcore-toolkit';
import { ng } from 'entcore';
import { BadgeCategory } from '../models/badge-category.model';

export interface IBadgeCategoryService {
    getBadgeCategories(): Promise<BadgeCategory[]>;
}

export const badgeCategoryService: IBadgeCategoryService = {
    /**
     * Get list of badge categories
     */
    getBadgeCategories: async (): Promise<BadgeCategory[]> =>
        http.get(`/minibadge/categories`)
            .then((res: HttpResponse) => {
                return new BadgeCategory().toList(res.data ?? []);
            }),
};
    
export const BadgeCategoryService = ng.service('BadgeCategoryService', (): IBadgeCategoryService => badgeCategoryService);