import {MinibadgeModel} from "./model";
import {BadgeProtagonistSettingRelation} from "./badge-protagonist-setting.model";

export interface ITypeSettingResponse {
    isSelfAssignable: boolean;
    structureId: string;
    relations: BadgeProtagonistSettingRelation[];
}


export class TypeSettings extends MinibadgeModel<TypeSettings> {
    isSelfAssignable: boolean;
    structureId: string;
    relations: BadgeProtagonistSettingRelation[];

    constructor(data?: ITypeSettingResponse) {
        super();
        if (data) this.build(data);
    }

    build(data: ITypeSettingResponse): TypeSettings {
        this.isSelfAssignable = data.isSelfAssignable;
        this.structureId = data.structureId;
        this.relations = new BadgeProtagonistSettingRelation().toList(data.relations);
        return this;
    }

    toModel(model: any): TypeSettings {
        return new TypeSettings(model)
    };
}