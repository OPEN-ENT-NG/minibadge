export interface IRevokeUsersPayload {
    userIds: string[];
}

export interface IIsCurrentUserRevokedResponse {
    revoked: boolean;
    revokedAT: string;
}