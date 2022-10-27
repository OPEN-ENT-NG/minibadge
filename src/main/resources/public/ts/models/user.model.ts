import {MinibadgeModel} from "./model";
import {IPaginatedPayload, IPaginatedResponses, IQueryStringPayload} from "./request.model";

export interface IUserResponse {
    id: string;
    firstName: string;
    lastName: string;
    displayName?: string;
    badgeAssignedTotal?: number;
    profile?: string;
}

export interface IUsersResponses extends IPaginatedResponses<IUserResponse>{}

export interface IUserPayload extends IQueryStringPayload{}

export interface IUsersPayload extends IPaginatedPayload{}

export class User extends MinibadgeModel<User> {
    id: string;
    firstName: string;
    lastName: string;
    displayName?: string;
    badgeAssignedTotal?: number;
    profile?: string;

    constructor(data?: IUserResponse) {
        super();
        if (data) this.build(data);
    }

    build(data: IUserResponse): User {
        this.id = data.id;
        this.firstName = data.firstName;
        this.lastName = data.lastName;
        this.displayName = data.displayName;
        this.badgeAssignedTotal = data.badgeAssignedTotal;
        this.profile = data.profile;
        return this;
    }

    toModel(model: any): User {
        return new User(model)
    };

    getDisplayName = (): string => !!this.displayName ? this.displayName : `${this.firstName} ${this.lastName}`;

    profileToI18n = (): string => !!this.profile ? `minibadge.profile.${this.profile}` : '';

}