import {MinibadgeModel} from "./model";

export interface IStatisticsResponse {
    countBadgeAssigned?: number
}


export class Statistics extends MinibadgeModel<Statistics> {
    countBadgeAssigned: number

    constructor(data?: IStatisticsResponse) {
        super();
        this.countBadgeAssigned = 0;
        if (data) this.build(data);
    }

    build(data: IStatisticsResponse): Statistics {
        this.countBadgeAssigned = data.countBadgeAssigned || 0;
        return this;
    }

    toModel(model: any): Statistics {
        return new Statistics(model)
    };
}