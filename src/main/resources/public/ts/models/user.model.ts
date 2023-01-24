import {MinibadgeModel} from "./model";
import {IPaginatedPayload, IPaginatedResponses, IQueryStringPayload} from "./request.model";
import {PROTAGONIST_TYPES} from "../core/enum/protagonist-types.enum";
import {IDisplayItem} from "./display-list.model";
import {toLocaleString} from "../utils/number.utils";

export interface IUserResponse {
    id: string;
    userId?: string;
    firstName: string;
    lastName: string;
    displayName?: string;
    badgeAssignedTotal?: number;
    countAssigned?: number;
    profile?: string;
    type?: string;
}

export interface IUsersResponses extends IPaginatedResponses<IUserResponse> {
    sessionUserAssignersTotal?: number;
    receiversTotal?: number;
}

export interface IUserPayload extends IQueryStringPayload {
}

export interface IUsersPayload extends IPaginatedPayload {
}

export class User extends MinibadgeModel<User> implements IDisplayItem {
    id: string;
    userId?: string;
    firstName: string;
    lastName: string;
    displayName?: string;
    badgeAssignedTotal?: number;
    countAssigned?: number;
    profile?: string;
    type?: string;

    constructor(data?: IUserResponse) {
        super();
        if (data) this.build(data);
    }

    build(data: IUserResponse): User {
        this.id = data.id || data.userId;
        this.firstName = data.firstName;
        this.lastName = data.lastName;
        this.displayName = data.displayName;
        this.badgeAssignedTotal = data.badgeAssignedTotal;
        this.countAssigned = data.countAssigned;
        this.profile = data.profile || (data.type ? PROTAGONIST_TYPES[data.type] : null);
        return this;
    }

    toModel(model: any): User {
        return new User(model)
    };

    getDisplayName = (): string => !!this.displayName ? this.displayName : `${this.firstName} ${this.lastName}`;

    displayItem = (): string => this.getDisplayName();

    displayItemImg = (): string => null;

    displayItemDistinction = (): string => toLocaleString(this.countAssigned);

    profileToI18n = (): string => !!this.profile ? `minibadge.profile.${this.profile}` : '';

}