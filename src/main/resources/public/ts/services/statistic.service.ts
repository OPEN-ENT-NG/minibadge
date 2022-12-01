import {ng} from 'entcore';
import http, {AxiosResponse} from "axios";
import {IStatisticsResponse, Statistics} from "../models/statistic.model";

export interface IStatisticService {
    getStatistics(): Promise<Statistics>;
}

export const statisticService: IStatisticService = {
    getStatistics: async (): Promise<Statistics> => http.get(`/minibadge/statistics`)
        .then((res: AxiosResponse) => new Statistics(<IStatisticsResponse>res.data)),
};

export const StatisticService = ng.service('StatisticService', (): IStatisticService => statisticService);