import {MinibadgeModel} from "./model";
import {BadgeType, IBadgeTypeResponse} from "./badge-type.model";
import {IStructureResponse, Structure} from "./structure.model";

export interface IStatisticsResponse {
    countBadgeAssigned?: number;
    mostAssignedTypes?: IBadgeTypeResponse[];
    lessAssignedTypes?: IBadgeTypeResponse[];
    mostRefusedTypes?: IBadgeTypeResponse[];
    mostAssigningStructures?: IStructureResponse[];
}


export class Statistics extends MinibadgeModel<Statistics> {
    countBadgeAssigned: number;
    mostAssignedTypes: BadgeType[];
    lessAssignedTypes: BadgeType[];
    mostRefusedTypes: BadgeType[];
    mostAssigningStructures?: Structure[]

    constructor(data?: IStatisticsResponse) {
        super();
        this.countBadgeAssigned = 0;
        this.mostAssignedTypes = [];
        this.mostRefusedTypes = [];
        this.mostAssigningStructures = [];
        if (data) this.build(data);
    }

    build(data: IStatisticsResponse): Statistics {
        this.countBadgeAssigned = data.countBadgeAssigned || 0;
        this.mostAssignedTypes = new BadgeType().toList(data.mostAssignedTypes) || [];
        this.lessAssignedTypes = new BadgeType().toList(data.lessAssignedTypes) || [];
        this.mostRefusedTypes = new BadgeType().toList(data.mostRefusedTypes) || [];
        this.mostAssigningStructures = new Structure().toList(data.mostAssigningStructures) || [];
        return this;
    }

    toModel(model: any): Statistics {
        return new Statistics(model)
    };
}