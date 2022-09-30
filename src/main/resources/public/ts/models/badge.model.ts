import {ILimitOffsetPayload, IPaginatedResponses, IQueryStringPayload} from "./request.model";
import {BadgeType, IBadgeTypeResponse} from "./badge-type.model";
import {IUserResponse, User} from "./user.model";
import {MinibadgeModel} from "./model";
import {ActionOption} from "./action-option.model";


export interface IBadgeCountsResponse {
    assigned?: number;
}

export interface IBadgeResponse {
    id?: number;
    ownerId?: string;
    badgeTypeId?: number;
    counts?: BadgeCounts;
    badgeType?: BadgeType;
    owner?: User;

    actionOptions?: ActionOption[];
}

export interface IBadgesResponses extends IPaginatedResponses<IBadgeResponse>{}

export interface IBadgePayload extends IQueryStringPayload {}

export class BadgeCounts extends MinibadgeModel<BadgeCounts> {
    assigned?: number;

    constructor(data?: IBadgeCountsResponse) {
        super();
        if (data) this.build(data);
    }

    build(data: IBadgeCountsResponse): BadgeCounts {
        this.assigned = data.assigned;
        return this;
    }

    toModel(model: any): BadgeCounts {
        return new BadgeCounts(model)
    };
}

export class Badge extends MinibadgeModel<Badge> {
    id?: number;
    ownerId?: string;
    badgeTypeId?: number;
    counts?: BadgeCounts;
    badgeType?: BadgeType;
    owner?: User;

    actionOptions?: ActionOption[];

    constructor(data?: IBadgeResponse) {
        super();
        if (data) this.build(data);
    }

    build(data: IBadgeResponse): Badge {
        this.id = data.id;
        this.ownerId = data.ownerId
        this.badgeTypeId = data.badgeTypeId
        this.counts = new BadgeCounts(<IBadgeCountsResponse>data.counts)
        this.badgeType = new BadgeType(<IBadgeTypeResponse>data.badgeType)
        this.owner = new User(<IUserResponse>data.owner);
        return this;
    }

    toModel(model: any): Badge {
        return new Badge(model)
    };

    setActionOptions(actionOptions: ActionOption[]): void {
        this.actionOptions = actionOptions;
    }
}