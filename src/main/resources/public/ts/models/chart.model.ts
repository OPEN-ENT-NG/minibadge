import {MinibadgeModel} from "./model";
import {model} from "entcore";
import {rights} from "../core/constants/rights.const";

export interface IChartResponse {
    acceptChart?: string;
    acceptAssign?: string;
    acceptReceive?: string;
    readChart?: string;
    validateChart?: string;
}

export class Chart extends MinibadgeModel<Chart> {
    acceptChart?: string;
    acceptAssign?: string;
    acceptReceive?: string;
    readChart?: string;
    validateChart?: string;

    constructor(data?: IChartResponse) {
        super();
        if (data) this.build(data);
    }

    build(data: IChartResponse): Chart {
        this.acceptChart = data.acceptChart;
        this.acceptAssign = data.acceptAssign;
        this.acceptReceive = data.acceptReceive;
        this.readChart = data.readChart;
        this.validateChart = data.validateChart;
        return this;
    }

    canAssign = (): boolean => model.me.hasWorkflow(rights.workflow.assign) && !!this.acceptAssign;
    canReceive = (): boolean => model.me.hasWorkflow(rights.workflow.receive) && !!this.acceptReceive;

    toModel(model: any): Chart {
        return new Chart(model)
    };
}