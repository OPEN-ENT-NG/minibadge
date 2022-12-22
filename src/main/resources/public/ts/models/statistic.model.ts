import {MinibadgeModel} from "./model";
import {BadgeType, IBadgeTypeResponse} from "./badge-type.model";
import {IStructureResponse, Structure} from "./structure.model";
import {IUserResponse, User} from "./user.model";

export interface IStatisticsResponse {
    countBadgeAssigned?: number;
    mostAssignedTypes?: IBadgeTypeResponse[];
    lessAssignedTypes?: IBadgeTypeResponse[];
    mostRefusedTypes?: IBadgeTypeResponse[];
    mostAssigningStructures?: IStructureResponse[];
    topAssigningUsers?: IUserResponse[];
    topReceivingUsers?: IUserResponse[];
}


export class Statistics extends MinibadgeModel<Statistics> {
    countBadgeAssigned: number;
    mostAssignedTypes: BadgeType[];
    lessAssignedTypes: BadgeType[];
    mostRefusedTypes: BadgeType[];
    mostAssigningStructures?: Structure[];
    topAssigningUsers?: User[];
    topReceivingUsers?: User[];

    constructor(data?: IStatisticsResponse) {
        super();
        this.countBadgeAssigned = 0;
        this.mostAssignedTypes = [];
        this.mostRefusedTypes = [];
        this.mostAssigningStructures = [];
        this.topAssigningUsers = [];
        this.topReceivingUsers = [];
        if (data) this.build(data);
    }

    build(data: IStatisticsResponse): Statistics {
        this.countBadgeAssigned = data.countBadgeAssigned || 0;
        this.mostAssignedTypes = new BadgeType().toList(data.mostAssignedTypes) || [];
        this.lessAssignedTypes = new BadgeType().toList(data.lessAssignedTypes) || [];
        this.mostRefusedTypes = new BadgeType().toList(data.mostRefusedTypes) || [];
        this.mostAssigningStructures = new Structure().toList(data.mostAssigningStructures) || [];
        this.topAssigningUsers = new User().toList(data.topAssigningUsers) || [];
        this.topReceivingUsers = new User().toList(data.topReceivingUsers) || [];
        return this;
    }

    toModel(model: any): Statistics {
        return new Statistics(model)
    };
}