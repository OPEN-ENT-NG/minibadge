import { http, HttpPromise, HttpResponse } from 'entcore-toolkit';
import { ng } from 'entcore';
import { IIsCurrentUserRevokedResponse, IRevokeUsersPayload } from "../models/revoke-users.model";

export interface IRevokeUsersService {
    isCurrentUserRevoked(): Promise<boolean>;
    revokeUsers(payload: IRevokeUsersPayload): Promise<HttpPromise>;
}

export const revokeUsersService: IRevokeUsersService = {
    
    isCurrentUserRevoked: async (): Promise<boolean> => {
        return http.get("/minibadge/revoked")
        .then((res: HttpResponse) => {
            let revokedResponse: IIsCurrentUserRevokedResponse = res.data;
            return !!revokedResponse.revoked;
        })
    },

    revokeUsers: async (payload: IRevokeUsersPayload): Promise<HttpPromise> => {
        return http.put("minibadge/revoke", payload)
    }
}

export const RevokeUsersService = ng.service('RevokeUsersService', (): IRevokeUsersService => revokeUsersService);