import {ng, notify} from 'entcore';
import http, {AxiosError, AxiosResponse} from 'axios';
import {IBadgeTypesPayload, IBadgeTypesResponse} from "../models/badge-type.model";

export interface IBadgeTypeService {
    getBadgeTypes(structureId: string, params: IBadgeTypesPayload): Promise<IBadgeTypesResponse>;
}

export const badgeTypeService: IBadgeTypeService = {
    /**
     * Get list of general / structure based badge types
     *
     * @param structureId  structure identifier
     * @param payload params to send to the backend
     */
    getBadgeTypes: async (structureId: string, payload: IBadgeTypesPayload): Promise<IBadgeTypesResponse> =>
        http.get(`/minibadge/structures/${structureId}/types?offset=${payload.offset}${payload.query ? `&query=${payload.query}` : ''}`)
            .then((res: AxiosResponse) => <IBadgeTypesResponse>res.data)
};

export const BadgeTypeService = ng.service('BadgeTypeService', (): IBadgeTypeService => badgeTypeService);