import {MinibadgeModel} from "./model";
import {User} from "./user.model";
import {PROTAGONIST_TYPES} from "../core/enum/protagonist-types.enum";


export interface IProtagonistSettingResponse {
    type: string;
    typeValue: string;
    label?: string;
}


export interface IRelationSettingResponse {
    assignorType: IProtagonistSettingResponse;
    receiverType: IProtagonistSettingResponse;
}

export class RelationSetting extends MinibadgeModel<RelationSetting> {
    assignorType: ProtagonistSetting;
    receiverType: ProtagonistSetting;

    constructor(data?: IRelationSettingResponse) {
        super();
        if (data) this.build(data);
    }

    build(data: IRelationSettingResponse): RelationSetting {
        this.receiverType = new ProtagonistSetting(data.receiverType);
        this.assignorType = new ProtagonistSetting(data.assignorType);
        return this;
    }

    isValid(assignor: User, receiver: User): boolean {
        return this.assignorType.isValid(assignor) && this.receiverType.isValid(receiver);
    }

    toModel(model: any): RelationSetting {
        return new RelationSetting(model)
    };
}

export class ProtagonistSetting extends MinibadgeModel<ProtagonistSetting> {
    type: string;
    typeValue: string;
    label?: string;

    constructor(data?: IProtagonistSettingResponse) {
        super();
        if (data) this.build(data);
    }

    build(data: IProtagonistSettingResponse): ProtagonistSetting {
        this.type = data.type;
        this.typeValue = data.typeValue;
        this.label = data.label;
        return this;
    }

    isValid(assignor: User): boolean {
        switch (this.type) {
            case PROTAGONIST_TYPES.PROFILE:
                return assignor.profile === this.typeValue;
            default:
                return false;
        }
    }

    toModel(model: any): ProtagonistSetting {
        return new ProtagonistSetting(model)
    };
}