import {ng} from 'entcore';
import http, {AxiosResponse} from 'axios';
import {BadgeAssigned, IBadgeGivenPayload} from "../models/badge-assigned.model";
import {IBadgeTypesResponses} from "../models/badge-type.model";

export interface IBadgesGivenService {
    getBadgeGiven(payload: IBadgeGivenPayload): Promise<BadgeAssigned[]>;
}


export const badgesGivenService: IBadgesGivenService = {

    /**
     * Get badge type
     *
     * @param typeId badge type identifier
     */
    getBadgeGiven: async (payload: IBadgeGivenPayload): Promise<BadgeAssigned[]> => {
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

        return http.get(`/minibadge/assigned/given?${url}`)
            .then((res: AxiosResponse) => {
                let badgeTypesResponses: IBadgeTypesResponses = res.data;
                return new BadgeAssigned().toList(badgeTypesResponses ? badgeTypesResponses.all : []);
            })
    }

};

export const BadgesGivenService = ng.service('BadgesGivenService', (): IBadgesGivenService => badgesGivenService);