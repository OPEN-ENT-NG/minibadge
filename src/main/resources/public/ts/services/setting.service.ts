import {ng, notify} from 'entcore';
import http, {AxiosError, AxiosResponse} from 'axios';
import {IBadgeTypesPayload, IBadgeTypesResponse} from "../models/badge-type.model";
import {ISetting} from "../models/setting.model";

export interface ISettingService {
    getGlobalSettings(): Promise<ISetting>;
}

export const settingService: ISettingService = {
    /**
     * Get global settings.
     */
    getGlobalSettings: async (): Promise<ISetting> =>
        http.get(`/minibadge/global-settings`)
            .then((res: AxiosResponse) => <ISetting>res.data)
};

export const SettingService = ng.service('SettingService', (): ISettingService => settingService);