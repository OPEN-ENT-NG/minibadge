import {model, ng} from 'entcore';
import http, {AxiosResponse} from 'axios';
import {BadgeType, IBadgeTypeResponse, IBadgeTypesPayload, IBadgeTypesResponses} from "../models/badge-type.model";
import {IUsersResponses, User} from "../models/user.model";
import {Paging} from "../models/paging.model";
import {rights} from "../core/constants/rights.const";

export interface IBadgeTypeService {
    getBadgeTypes(payload: IBadgeTypesPayload): Promise<BadgeType[]>;

    getBadgeType(typeId: number): Promise<BadgeType>;

    getBadgeTypeAssigners(typeId: number, payload: Paging): Promise<User[]>;

    getBadgeReceivers(typeId: number, payload: Paging): Promise<User[]>;
}

export const badgeTypeService: IBadgeTypeService = {
    /**
     * Get list of general / structure based badge types
     *
     * @param payload params to send to the backend
     */
    getBadgeTypes: async (payload: IBadgeTypesPayload): Promise<BadgeType[]> =>
        http.get(`/minibadge/types?offset=${payload.offset}${payload.query ? `&query=${payload.query}` : ''}`)
            .then((res: AxiosResponse) => {
                let badgeTypesResponses: IBadgeTypesResponses = res.data;
                return new BadgeType().toList(badgeTypesResponses ? badgeTypesResponses.all : []);
            }),

    /**
     * Get badge type
     *
     * @param typeId badge type identifier
     */
    getBadgeType: async (typeId: number): Promise<BadgeType> =>
        http.get(`/minibadge/types/${typeId}`)
            .then((res: AxiosResponse) => new BadgeType(<IBadgeTypeResponse>res.data)),

    /**
     * Get users that gave me this (:typeId) badge typed
     *
     * @param typeId badge type identifier
     * @param payload
     */
    getBadgeTypeAssigners: async (typeId: number, payload: Paging): Promise<User[]> => {
        if (model.me.hasWorkflow(rights.workflow.receive))
            return http.get(`/minibadge/types/${typeId}/assigners?page=${payload.page}`)
                .then((res: AxiosResponse) => {
                    let usersResponses: IUsersResponses = res.data;
                    if (usersResponses) payload.pageCount = usersResponses.page;
                    return new User().toList(usersResponses ? usersResponses.all : [])
                });
        return [];
    },

    /**
     * Get users that received this (:typeId) badge typed
     *
     * @param typeId badge type identifier
     * @param payload
     */
    getBadgeReceivers: async (typeId: number, payload: Paging): Promise<User[]> =>
        http.get(`/minibadge/types/${typeId}/receivers?page=${payload.page}`)
            .then((res: AxiosResponse) => {
                let usersResponses: IUsersResponses = res.data;
                if (usersResponses) payload.pageCount = usersResponses.page;
                return new User().toList(usersResponses ? usersResponses.all : [])
            })
};

export const BadgeTypeService = ng.service('BadgeTypeService', (): IBadgeTypeService => badgeTypeService);