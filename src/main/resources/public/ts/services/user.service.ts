import {ng} from 'entcore';
import http, {AxiosResponse} from 'axios';
import {IUserPayload, IUsersResponses, User} from "../models/user.model";

export interface IUserService {
    searchUsers(typeId: number, payload: IUserPayload): Promise<User[]>;
}

export const userService: IUserService = {
    /**
     * search users from query
     *
     * @param typeId type identifier from which we search users
     * @param payload params to send to the backend
     */
    searchUsers: async (typeId: number, payload: IUserPayload): Promise<User[]> =>
        http.get(`/minibadge/type/${typeId}/users-search${payload.query ? `?query=${payload.query}` : ''}`)
            .then((res: AxiosResponse) => {
                let usersResponses: IUsersResponses = res.data;
                return new User().toList(usersResponses ? usersResponses.all : []);
            })
};

export const UserService = ng.service('UserService', (): IUserService => userService);