import {MinibadgeModel} from "./model";
import {BadgeType, IBadgeTypeResponse} from "./badge-type.model";

export interface IStatisticsResponse {
    countBadgeAssigned?: number;
    mostAssignedTypes?: IBadgeTypeResponse[];
}


export class Statistics extends MinibadgeModel<Statistics> {
    countBadgeAssigned: number;
    mostAssignedTypes: BadgeType[];

    constructor(data?: IStatisticsResponse) {
        super();
        this.countBadgeAssigned = 0;
        this.mostAssignedTypes = [];
        if (data) this.build(data);
    }

    build(data: IStatisticsResponse): Statistics {
        this.countBadgeAssigned = data.countBadgeAssigned || 0;
        this.mostAssignedTypes = new BadgeType().toList(data.mostAssignedTypes) || [];
        return this;
    }

    toModel(model: any): Statistics {
        return new Statistics(model)
    };
}