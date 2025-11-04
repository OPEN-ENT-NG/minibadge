import http, { AxiosPromise, AxiosResponse } from "axios";
import { ng } from 'entcore';
import { IIsCurrentUserRevokedResponse, IRevokeUsersPayload } from "../models/revoke-users.model";

export interface IRevokeUsersService {
    isCurrentUserRevoked(): Promise<Boolean>;
    revokeUsers(payload: IRevokeUsersPayload): Promise<AxiosPromise>;
}

export const revokeUsersService: IRevokeUsersService = {
    
    isCurrentUserRevoked: async (): Promise<Boolean> => {
        return http.get("/minibadge/revoked")
        .then((res: AxiosResponse) => {
            let revokedResponse: IIsCurrentUserRevokedResponse = res.data;
            return !!revokedResponse.revoked;
        })
    },

    revokeUsers: async (payload: IRevokeUsersPayload): Promise<AxiosPromise> => {
        return http.put("minibadge/revoke", payload)
    }
}

export const RevokeUsersService = ng.service('RevokeUsersService', (): IRevokeUsersService => revokeUsersService);