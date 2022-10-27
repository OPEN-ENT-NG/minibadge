import {MinibadgeModel} from "./model";
import {BadgeProtagonistSettingRelation} from "./badge-protagonist-setting.model";

export interface IBadgeSettingResponse {
    isSelfAssignable: boolean;
    structureId: string;
    relations: BadgeProtagonistSettingRelation[];
}


export class BadgeSettings extends MinibadgeModel<BadgeSettings> {
    isSelfAssignable: boolean;
    structureId: string;
    relations: BadgeProtagonistSettingRelation[];

    constructor(data?: IBadgeSettingResponse) {
        super();
        if (data) this.build(data);
    }

    build(data: IBadgeSettingResponse): BadgeSettings {
        this.isSelfAssignable = data.isSelfAssignable;
        this.structureId = data.structureId;
        this.relations = new BadgeProtagonistSettingRelation().toList(data.relations);
        return this;
    }

    toModel(model: any): BadgeSettings {
        return new BadgeSettings(model)
    };
}