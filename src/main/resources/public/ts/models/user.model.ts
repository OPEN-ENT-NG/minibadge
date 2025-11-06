import { ProfileColorMap } from "../core/constants/profile-colors.const";
import { MINIBADGE_USER_STATE } from '../core/enum/minibadge-user-state.enum';
import { PROTAGONIST_TYPES } from "../core/enum/protagonist-types.enum";
import { UserProfile } from "../core/enum/user-profile.enum";
import { toLocaleString } from "../utils/number.utils";
import { IDisplayItem } from "./display-list.model";
import { MinibadgeModel } from "./model";
import { IPaginatedPayload, IPaginatedResponses, IQueryStringPayload } from "./request.model";

export interface IUserResponse {
    id: string;
    userId?: string;
    firstName: string;
    lastName: string;
    displayName?: string;
    badgeAssignedTotal?: number;
    countAssigned?: number;
    minibadgeUserState?: MINIBADGE_USER_STATE;
    profile?: string;
    type?: string;
    structureIds?: string[];
    structureNames?: string[];
}

export interface IUsersResponses extends IPaginatedResponses<IUserResponse> {
    userAssignersTotal?: number;
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
    minibadgeUserState?: MINIBADGE_USER_STATE;
    structureIds?: string[];
    structureNames?: string[];

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
        this.minibadgeUserState = data.minibadgeUserState ? MINIBADGE_USER_STATE[data.minibadgeUserState] : undefined;
        this.structureIds = data.structureIds;
        this.structureNames = data.structureNames;
        return this;
    }

    toModel(model: any): User {
        return new User(model)
    };

    getDisplayName = (): string => !!this.displayName ? this.displayName : `${this.firstName} ${this.lastName}`;

    displayItem = (): string => this.getDisplayName();

    displayItemImg = (): string => `/userbook/avatar/${this.id}?thumbnail=48x48`;

    getStructureName = (): string => !!this.structureNames && this.structureNames.length ? this.structureNames[0] : '';

    displayItemDistinction = (): string => toLocaleString(this.countAssigned);

    profileToI18n = (): string => !!this.profile ? `minibadge.profile.${this.profile}` : '';

    getProfileDisplayColor = (): string => {
        return ProfileColorMap[this.profile as UserProfile] || "#000000";
    }

}