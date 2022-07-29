import {ng} from 'entcore'
import http, {AxiosResponse} from 'axios';


export interface IMinibadgeService {
    test(): Promise<AxiosResponse>;
}

export const minibadgeService: IMinibadgeService = {
    // won't work since example
    test: async (): Promise<AxiosResponse> => {
        return http.get(`/minibadge/test/ok`);
    }
};

export const MinibadgeService = ng.service('MinibadgeService', (): IMinibadgeService => minibadgeService);