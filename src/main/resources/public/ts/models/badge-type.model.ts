import {ILimitOffsetPayload, IPaginatedResponses} from "./request.model";
import {IUserResponse, User} from "./user.model";
import {MinibadgeModel} from "./model";
import {TypeSettings, ITypeSettingResponse} from "./type-settings.model";
import {idiom as lang} from "entcore";
import {RelationSetting} from "./protagonist-setting.model";

export interface IBadgeTypeResponse {
    id?: number;
    structureId?: string;
    ownerId?: string;
    pictureId?: string;
    label: string;
    description: string;
    createdAt?: string;
    owner?: User;
    setting?: TypeSettings;
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
    setting?: TypeSettings;

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
        this.setting = new TypeSettings(<ITypeSettingResponse>data.setting);
        return this;
    }

    toModel(model: any): BadgeType {
        return new BadgeType(model)
    };

    displayAssignors = (): string => {
        return this.setting.relations
            .filter((relation: RelationSetting) => !!relation.assignorType && !!relation.assignorType.label)
            .map((relation: RelationSetting) => lang.translate(relation.assignorType.label))
            .join(", ")
    }
    displayReceivers = (): string => {
        return this.setting.relations
            .filter((relation: RelationSetting) => !!relation.receiverType && !!relation.receiverType.label)
            .map((relation: RelationSetting) => lang.translate(relation.receiverType.label))
            .join(", ")
    }
    getDetailPath = (): string => `/badge-types/${this.id}`;

}