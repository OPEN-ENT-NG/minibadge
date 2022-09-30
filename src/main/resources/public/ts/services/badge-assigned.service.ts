import {ng} from 'entcore';
import http, {AxiosPromise} from 'axios';
import {IBadgeAssignedPayload} from "../models/badge-assigned.model";

export interface IBadgeAssignedService {
    assign(typeId: number, params: IBadgeAssignedPayload): Promise<AxiosPromise>;
}

export const badgeAssignedService: IBadgeAssignedService = {
    /**
     * Create badge if not exists and create an assignment to it.
     *
     * @param typeId type identifier
     * @param params to assign badge
     */
    assign: async (typeId: number, params: IBadgeAssignedPayload): Promise<AxiosPromise> =>
        http.post(`/minibadge/types/${typeId}/assign`, params)
};

export const BadgeAssignedService = ng.service('BadgeAssignedService', (): IBadgeAssignedService => badgeAssignedService);