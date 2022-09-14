import {MinibadgeModel} from "./model";

export interface ISettingResult {
    pageSize?: number;
}

export class Setting extends MinibadgeModel<Setting> {
    pageSize?: number;

    constructor(data: ISettingResult) {
        super();
        if (data) this.build(data);
    }

    build(data: ISettingResult): Setting {
        this.pageSize = data.pageSize;
        return this;
    }

    toModel(model: ISettingResult): Setting {
        return new Setting(model)
    };

}