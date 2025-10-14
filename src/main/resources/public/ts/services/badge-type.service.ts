import http, { AxiosResponse } from 'axios';
import { model, ng } from 'entcore';
import { rights } from "../core/constants/rights.const";
import { BadgeType, IBadgeTypeResponse, IBadgeTypesPayload, IBadgeTypesResponses } from "../models/badge-type.model";
import { Paging } from "../models/paging.model";
import { IUsersResponses, User } from "../models/user.model";

export interface IBadgeTypeService {
    getBadgeTypes(payload: IBadgeTypesPayload): Promise<BadgeType[]>;

    getBadgeType(typeId: number): Promise<BadgeType>;

    getBadgeTypeAssigners(badgeType: BadgeType, payload: Paging): Promise<User[]>;

    getBadgeReceivers(badgeType: BadgeType, payload: Paging): Promise<User[]>;
}

export const badgeTypeService: IBadgeTypeService = {
    /**
     * Get list of general / structure based badge types
     *
     * @param payload params to send to the backend
     */
    getBadgeTypes: async (payload: IBadgeTypesPayload): Promise<BadgeType[]> =>
        http.get(`/minibadge/types?offset=${payload.offset}`
                + (payload.query ? `&query=${encodeURIComponent(payload.query)}` : '')
                + (payload.categoryId !== undefined ? `&categoryId=${payload.categoryId}` : ''))
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
     * @param badgeType type concerned
     * @param payload params to send to backend
     */
    getBadgeTypeAssigners: async (badgeType: BadgeType, payload: Paging): Promise<User[]> => {
        if (model.me.hasWorkflow(rights.workflow.receive))
            return http.get(`/minibadge/types/${badgeType.id}/assigners?page=${payload.page}`)
                .then((res: AxiosResponse) => {
                    let usersResponses: IUsersResponses = res.data;
                    if (usersResponses) {
                        badgeType.userAssignersTotal = usersResponses.userAssignersTotal
                        payload.pageCount = usersResponses.pageCount;
                    }
                    return new User().toList(usersResponses ? usersResponses.all : [])
                });
        return [];
    },

    /**
     * Get users that received this (:typeId) badge typed
     *
     * @param badgeType type concerned
     * @param payload params to send to backend
     */
    getBadgeReceivers: async (badgeType: BadgeType, payload: Paging): Promise<User[]> =>
        http.get(`/minibadge/types/${badgeType.id}/receivers?page=${payload.page}`)
            .then((res: AxiosResponse) => {
                let usersResponses: IUsersResponses = res.data;
                if (usersResponses) {
                    badgeType.receiversTotal = usersResponses.receiversTotal
                    payload.pageCount = usersResponses.pageCount;
                }
                return new User().toList(usersResponses ? usersResponses.all : [])
            })
};

export const BadgeTypeService = ng.service('BadgeTypeService', (): IBadgeTypeService => badgeTypeService);