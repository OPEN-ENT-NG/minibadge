import {ng} from 'entcore';
import http, {AxiosPromise, AxiosResponse} from 'axios';
import {Badge, IBadgePayload, IBadgesResponses} from "../models/badge.model";

export interface IBadgeService {
    getBadges(payload: IBadgePayload): Promise<Badge[]>;

    privatizeBadgeType(typeId: number): Promise<AxiosPromise>;

    refuseBadgeType(typeId: number): Promise<AxiosPromise>;
}

export const badgeService: IBadgeService = {
    /**
     * Get list of current user badges
     *
     * @param payload containing query to filter badges
     */
    getBadges: async (payload: IBadgePayload): Promise<Badge[]> =>
        http.get(`/minibadge/badges${payload.query ? `?query=${payload.query}` : ''}`)
            .then((res: AxiosResponse) => {
                let badgesResponses: IBadgesResponses = res.data;
                return new Badge().toList(badgesResponses ? badgesResponses.all : []);
            }),

    /**
     * privatize badge type for current user session
     *
     * @param typeId badge type identifier
     */
    privatizeBadgeType: async (typeId: number): Promise<AxiosPromise> =>
        http.put(`/minibadge/types/${typeId}/badge/privatize`),

    /**
     * refuse badge type for current user session
     *
     * @param typeId badge type identifier
     */
    refuseBadgeType: async (typeId: number): Promise<AxiosPromise> =>
        http.put(`/minibadge/types/${typeId}/badge/refuse`)
};

export const BadgeService = ng.service('BadgeService', (): IBadgeService => badgeService);