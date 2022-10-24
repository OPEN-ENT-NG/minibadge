import {IUserResponse, User} from "./user.model";
import {IBadgeTypeResponse} from "./badge-type.model";
import {MinibadgeModel} from "./model";
import {Badge, IBadgeResponse} from "./badge.model";
import {IQueryStringPayload} from "./request.model";

export interface IBadgeAssignedPayload {
    ownerIds: string[];
}
export interface IBadgeGivenPayload extends IQueryStringPayload {
    startDate:string,
    endDate:string,
    sortType:string,
    sortAsc:boolean

}
export interface IBadgeAssignedResponse {
    id : number;
    assignorId :string;
    badge: Badge;
    acceptedAt ?: string;
    updatedAt?: string;
    createdAt: string;
    revokedAt: string;
}

export class BadgeAssigned  extends MinibadgeModel<BadgeAssigned> {
    id : number;
    assignorId :string;
    badge: Badge;
    acceptedAt ?: string;
    updatedAt ?: string;
    createdAt: string;
    revokedAt: string;
    constructor(data?: IBadgeAssignedResponse) {
        super();
        if (data) this.build(data);
    }

    build(data: IBadgeAssignedResponse): BadgeAssigned {
        this.id = data.id;
        this.assignorId = data.assignorId;
        this.badge = new Badge(<IBadgeResponse>data.badge)
        this.acceptedAt = data.acceptedAt;
        this.updatedAt = data.updatedAt;
        this.createdAt = data.createdAt;
        this.revokedAt = data.revokedAt;
        return this;
    }

    toModel(model: any): BadgeAssigned {
        return new BadgeAssigned(model)
    }
}