import http, { AxiosResponse } from 'axios';
import { ng } from 'entcore';
import { IStatisticsResponse, Statistics } from '../models/statistic.model';

export interface IStatisticService {
    getStatistics(minDate?: Date | null): Promise<Statistics>;
}

export const statisticService: IStatisticService = {
    getStatistics: async (minDate?: Date | null): Promise<Statistics> => {
        const params: any = {};

        if (minDate) {
            // Format ISO (ex: 2025-11-04)
            params.minDate = minDate.toISOString().split('T')[0];
        }

        return http
            .get(`/minibadge/statistics`, { params })
            .then((res: AxiosResponse) => new Statistics(<IStatisticsResponse>res.data));
    },
};

export const StatisticService = ng.service('StatisticService', (): IStatisticService => statisticService);
