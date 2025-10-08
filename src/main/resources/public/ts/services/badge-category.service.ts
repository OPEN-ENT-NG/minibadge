import http, { AxiosResponse } from 'axios';
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
            .then((res: AxiosResponse) => {
                return new BadgeCategory().toList(res.data ?? []);
            }),
};
    
export const BadgeCategoryService = ng.service('BadgeCategoryService', (): IBadgeCategoryService => badgeCategoryService);