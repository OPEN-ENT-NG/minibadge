import {MinibadgeModel} from "./model";
import {BadgeType, IBadgeTypeResponse} from "./badge-type.model";

export interface IStatisticsResponse {
    countBadgeAssigned?: number;
    mostAssignedTypes?: IBadgeTypeResponse[];
    mostRefusedTypes?: IBadgeTypeResponse[];
}


export class Statistics extends MinibadgeModel<Statistics> {
    countBadgeAssigned: number;
    mostAssignedTypes: BadgeType[];
    mostRefusedTypes: BadgeType[];

    constructor(data?: IStatisticsResponse) {
        super();
        this.countBadgeAssigned = 0;
        this.mostAssignedTypes = [];
        this.mostRefusedTypes = [];
        if (data) this.build(data);
    }

    build(data: IStatisticsResponse): Statistics {
        this.countBadgeAssigned = data.countBadgeAssigned || 0;
        this.mostAssignedTypes = new BadgeType().toList(data.mostAssignedTypes) || [];
        this.mostRefusedTypes = new BadgeType().toList(data.mostRefusedTypes) || [];
        return this;
    }

    toModel(model: any): Statistics {
        return new Statistics(model)
    };
}