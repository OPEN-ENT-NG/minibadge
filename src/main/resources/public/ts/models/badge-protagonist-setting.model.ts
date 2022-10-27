import {MinibadgeModel} from "./model";


export interface IBadgeProtagonistSettingResponse {
    type: string;
    typeId: string;
}


export interface IBadgeProtagonistSettingRelationResponse {
    assignorType: BadgeProtagonistSetting;
    receiverType: BadgeProtagonistSetting;
}

export class BadgeProtagonistSettingRelation extends MinibadgeModel<BadgeProtagonistSettingRelation> {
    assignorType: BadgeProtagonistSetting;
    receiverType: BadgeProtagonistSetting;

    constructor(data?: IBadgeProtagonistSettingRelationResponse) {
        super();
        if (data) this.build(data);
    }

    build(data: IBadgeProtagonistSettingRelationResponse): BadgeProtagonistSettingRelation {
        this.receiverType = new BadgeProtagonistSetting(<IBadgeProtagonistSettingResponse>data.receiverType);
        this.assignorType = new BadgeProtagonistSetting(<IBadgeProtagonistSettingResponse>data.assignorType);
        return this;
    }

    toModel(model: any): BadgeProtagonistSettingRelation {
        return new BadgeProtagonistSettingRelation(model)
    };
}

export class BadgeProtagonistSetting extends MinibadgeModel<BadgeProtagonistSetting> {
    typeId: string;
    type: string;

    constructor(data?: IBadgeProtagonistSettingResponse) {
        super();
        if (data) this.build(data);
    }

    build(data: IBadgeProtagonistSettingResponse): BadgeProtagonistSetting {
        this.type = data.type;
        this.typeId = data.typeId;
        return this;
    }

    toModel(model: any): BadgeProtagonistSetting {
        return new BadgeProtagonistSetting(model)
    };
}