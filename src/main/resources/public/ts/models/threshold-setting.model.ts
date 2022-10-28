import {MinibadgeModel} from "./model";

export interface IThresholdSettingResponse {
    structureId: string;
    maxAssignable: number;
    periodAssignable: string;
    assignationsNumber: number
}

export class ThresholdSetting extends MinibadgeModel<ThresholdSetting> {
    structureId: string;
    maxAssignable: number;
    periodAssignable: string;
    assignationsNumber: number

    constructor(data?: IThresholdSettingResponse) {
        super();
        if (data) this.build(data);
    }

    build(data: IThresholdSettingResponse): ThresholdSetting {
        this.structureId = data.structureId;
        this.maxAssignable = data.maxAssignable || 0;
        this.periodAssignable = data.periodAssignable;
        this.assignationsNumber = data.assignationsNumber || 0;

        return this;
    }

    isThresholdReached(addingNumber?: number): boolean {
        return this.assignationsNumber + (addingNumber || 0) >= this.maxAssignable;
    }

    isThresholdOutmoded(addingNumber?: number): boolean {
        return this.assignationsNumber + (addingNumber || 0) > this.maxAssignable;
    }

    incrementAssignationsNumber(addingNumber?: number): void {
        this.assignationsNumber += addingNumber || 0;
    }

    assignableNumbers(addingNumber?: number): number {
        return Math.max(this.maxAssignable - (this.assignationsNumber + (addingNumber || 0)), 0);
    }


    toModel(model: any): ThresholdSetting {
        return new ThresholdSetting(model)
    };
}