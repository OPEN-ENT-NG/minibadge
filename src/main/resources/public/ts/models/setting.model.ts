import {MinibadgeModel} from "./model";
import {Chart, IChartResponse} from "./chart.model";
import {IThresholdSettingResponse, ThresholdSetting} from "./threshold-setting.model";

export interface ISettingResult {
    pageSize?: number;
    userPermissions?: IChartResponse;
    thresholdSettings?: IThresholdSettingResponse[];
}

export class Setting extends MinibadgeModel<Setting> {
    pageSize?: number;
    userPermissions?: Chart;
    thresholdSettings?: ThresholdSetting[];

    constructor(data: ISettingResult) {
        super();
        if (data) this.build(data);
    }

    build(data: ISettingResult): Setting {
        this.pageSize = data.pageSize;
        this.userPermissions = new Chart(data.userPermissions);
        this.thresholdSettings = new ThresholdSetting().toList(data.thresholdSettings);
        return this;
    }

    areThresholdsReached(addingNumber?: number): boolean {
        return this.thresholdSettings
            .some((thresholdSetting: ThresholdSetting) => thresholdSetting.isThresholdReached(addingNumber));
    }

    areThresholdsOutmoded(addingNumber?: number): boolean {
        return this.thresholdSettings
            .some((thresholdSetting: ThresholdSetting) => thresholdSetting.isThresholdOutmoded(addingNumber));
    }

    incrementAssignationsNumbers(addingNumber?: number): void {
        this.thresholdSettings
            .forEach((thresholdSetting: ThresholdSetting) => thresholdSetting.incrementAssignationsNumber(addingNumber));
    }

    assignableNumbers(addingNumber?: number): string {
        return this.thresholdSettings
            .map((thresholdSetting: ThresholdSetting) => thresholdSetting.assignableNumbers(addingNumber))
            .join(', ');
    }

    toModel(model: ISettingResult): Setting {
        return new Setting(model)
    };

}