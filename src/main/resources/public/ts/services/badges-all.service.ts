import http, { AxiosResponse } from 'axios';
import { ng } from 'entcore';
import { BadgeAssigned, IBadgeAllPayload } from "../models/badge-assigned.model";
import { IBadgeTypesResponses } from "../models/badge-type.model";

export interface IBadgesAllService {
    getAllBadges(payload: IBadgeAllPayload): Promise<BadgeAssigned[]>;
}


export const badgesAllService: IBadgesAllService = {

    getAllBadges: async (payload: IBadgeAllPayload): Promise<BadgeAssigned[]> => {
        let url = new URLSearchParams();
        if (payload.query) {
            url.append("query", payload.query);
        }
        if (payload.sortType && payload.sortType !== "" && payload.sortAsc !== undefined) {
            url.append("sortBy", payload.sortType);
            url.append("sortAsc", payload.sortAsc.toString());
        }
        if (payload.startDate && payload.endDate) {
            url.append("startDate", payload.startDate);
            url.append("endDate", payload.endDate);
        }

        return http.get(`/minibadge/assigned/all?${url}`)
            .then((res: AxiosResponse) => {
                let badgeTypesResponses: IBadgeTypesResponses = res.data;
                return new BadgeAssigned().toList(badgeTypesResponses ? badgeTypesResponses.all : []);
            })
    }

};

export const BadgesAllService = ng.service('BadgesAllService', (): IBadgesAllService => badgesAllService);