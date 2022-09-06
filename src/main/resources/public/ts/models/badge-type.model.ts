import {IResponse} from "./request.model";
import {ILimitOffsetPayload} from "./request.model";

export interface IBadgeType {
    id?: number;
    structureId?: string;
    ownerId?: string;
    pictureId?: string;
    label: string;
    description: string;
}

export interface IBadgeTypesPayload extends ILimitOffsetPayload{}

export interface IBadgeTypesResponse extends IResponse<IBadgeType>{}