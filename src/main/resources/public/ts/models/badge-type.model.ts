import {ILimitOffsetPayload, IPaginatedResponses} from "./request.model";
import {IUserResponse, User} from "./user.model";
import {MinibadgeModel} from "./model";

export interface IBadgeTypeResponse {
    id?: number;
    structureId?: string;
    ownerId?: string;
    pictureId?: string;
    label: string;
    description: string;
    createdAt?: string;
    owner?: User;
}

export interface IBadgeTypesPayload extends ILimitOffsetPayload {
}

export interface IBadgeTypesResponses extends IPaginatedResponses<IBadgeTypeResponse> {
}


export class BadgeType extends MinibadgeModel<BadgeType> {
    id?: number;
    structureId?: string;
    ownerId?: string;
    pictureId?: string;
    label: string;
    description: string;
    createdAt?: string;
    owner?: User;

    constructor(data?: IBadgeTypeResponse) {
        super();
        if (data) this.build(data);
    }

    build(data: IBadgeTypeResponse): BadgeType {
        this.id = data.id;
        this.structureId = data.structureId;
        this.ownerId = data.ownerId
        this.pictureId = data.pictureId;
        this.label = data.label;
        this.description = data.description;
        this.createdAt = data.createdAt;
        this.owner = new User(<IUserResponse>data.owner);
        return this;
    }

    toModel(model: any): BadgeType {
        return new BadgeType(model)
    };

    getDetailPath = (): string => `/badge-types/${this.id}`;

}