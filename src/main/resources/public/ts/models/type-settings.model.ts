import {MinibadgeModel} from "./model";
import {RelationSetting} from "./protagonist-setting.model";
import {User} from "./user.model";

export interface ITypeSettingResponse {
    isSelfAssignable: boolean;
    structureId: string;
    relations: RelationSetting[];
}


export class TypeSettings extends MinibadgeModel<TypeSettings> {
    isSelfAssignable: boolean;
    structureId: string;
    relations: RelationSetting[];

    constructor(data?: ITypeSettingResponse) {
        super();
        if (data) this.build(data);
    }

    build(data: ITypeSettingResponse): TypeSettings {
        this.isSelfAssignable = data.isSelfAssignable;
        this.structureId = data.structureId;
        this.relations = new RelationSetting().toList(data.relations);
        return this;
    }

    isMatchingAnyRelation(assignor: User, receivers: User[]): boolean {
        return !!assignor && !!receivers && receivers
            .some((receiver: User) => this.relations.some((relation: RelationSetting) => relation.isValid(assignor, receiver)));
    }

    toModel(model: any): TypeSettings {
        return new TypeSettings(model)
    };
}