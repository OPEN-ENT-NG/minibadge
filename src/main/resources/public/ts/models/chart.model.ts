import {MinibadgeModel} from "./model";

export interface IChartResponse {
    acceptChart?: string;
    acceptAssign?: string;
    acceptReceive?: string;
}

export class Chart extends MinibadgeModel<Chart> {
    acceptChart?: string;
    acceptAssign?: string;
    acceptReceive?: string;

    constructor(data?: IChartResponse) {
        super();
        if (data) this.build(data);
    }

    build(data: IChartResponse): Chart {
        this.acceptChart = data.acceptChart;
        this.acceptAssign = data.acceptAssign;
        this.acceptReceive = data.acceptReceive;
        return this;
    }

    toModel(model: any): Chart {
        return new Chart(model)
    };
}