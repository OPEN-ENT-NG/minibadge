import {ng} from 'entcore';
import http, {AxiosResponse} from 'axios';
import {ISettingResult, Setting} from "../models/setting.model";

export interface ISettingService {
    getGlobalSettings(): Promise<Setting>;
}

export const settingService: ISettingService = {
    /**
     * Get global settings.
     */
    getGlobalSettings: async (): Promise<Setting> =>
        http.get(`/minibadge/global-settings`)
            .then((res: AxiosResponse) => new Setting(<ISettingResult>res.data))
};

export const SettingService = ng.service('SettingService', (): ISettingService => settingService);