import {MinibadgeModel} from "./model";
import {Chart, IChartResponse} from "./chart.model";

export interface ISettingResult {
    pageSize?: number;

    userPermissions?: Chart;
}

export class Setting extends MinibadgeModel<Setting> {
    pageSize?: number;
    userPermissions?: Chart;

    constructor(data: ISettingResult) {
        super();
        if (data) this.build(data);
    }

    build(data: ISettingResult): Setting {
        this.pageSize = data.pageSize;
        this.userPermissions = new Chart(<IChartResponse>data.userPermissions);
        return this;
    }

    toModel(model: ISettingResult): Setting {
        return new Setting(model)
    };

}