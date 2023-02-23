import {Me, model, ng} from 'entcore';
import http, {AxiosPromise, AxiosResponse} from 'axios';
import {PREFERENCES} from "../core/enum/preferences.enum";
import {Chart, IChartResponse} from "../models/chart.model";
import {rights} from "../core/constants/rights.const";

export interface IChartService {
    saveChart(isChartAccepted: boolean, isMinibadgeAccepted: boolean): Promise<[void, AxiosResponse]>;

    viewChart(): Promise<void>;

    getChart(): Promise<Chart>;

    getUserChart(): Promise<Chart>
}

export const chartService: IChartService = {

    /**
     * Get list of general / structure based badge types
     *
     * @param isChartAccepted true if chart is accepted
     * @param isMinibadgeAccepted true if actions relative to current user (assign/receive badge) are accepted
     */
    saveChart: async (isChartAccepted: boolean, isMinibadgeAccepted: boolean): Promise<[void, AxiosResponse]> => {
        if (!Me.preferences[PREFERENCES.CHART]) {
            await Me.savePreference(PREFERENCES.CHART);
            await Me.preference(PREFERENCES.CHART)
        }

        let [isAssignWorkflow, isReceiveWorkflow]: boolean[] =
            await Promise.all([model.me.hasWorkflow(rights.workflow.assign), model.me.hasWorkflow(rights.workflow.receive)]);

        let oldChart: IChartResponse = {...Me.preferences[PREFERENCES.CHART]};

        let isNewlyAccepted: boolean = isChartAccepted && isMinibadgeAccepted
            && (!oldChart.acceptChart || (!oldChart.acceptAssign && !oldChart.acceptReceive));

        let isChartNewlyAccepted: boolean = isChartAccepted && (!oldChart || !oldChart.acceptChart);
        let isChartNewlyRefused: boolean = !isChartAccepted && !!oldChart && !!oldChart.acceptChart;

        let isNewlyRefused: boolean = (!isChartAccepted || !isMinibadgeAccepted)
            && !!oldChart.acceptChart;

        let isReceivedNewlyRefused: boolean = isNewlyRefused && !!oldChart.acceptReceive;
        let isAssignNewlyRefused: boolean = isNewlyRefused && !!oldChart.acceptAssign;

        Me.preferences[PREFERENCES.CHART] = <IChartResponse>{
            acceptChart: isChartNewlyAccepted ? new Date().toISOString()
                : (!isChartNewlyRefused ? oldChart.acceptChart : null),

            acceptAssign: isNewlyAccepted && isAssignWorkflow ? new Date().toISOString()
                : (!isAssignNewlyRefused ? oldChart.acceptAssign : null),

            acceptReceive: isNewlyAccepted && isReceiveWorkflow ? new Date().toISOString()
                : (!isReceivedNewlyRefused ? oldChart.acceptReceive : null),

            readChart: new Date().toISOString(),

            validateChart: new Date().toISOString()
        };

        let chartRequest: AxiosPromise;
        if (isNewlyAccepted && isReceiveWorkflow) chartRequest = http.put(`/minibadge/accept`);
        else if (isReceivedNewlyRefused) chartRequest = http.put(`/minibadge/refuse`);

        return Promise.all([Me.savePreference(PREFERENCES.CHART), chartRequest])
            .then((values: [void, AxiosResponse]) => values);
    },

    viewChart: async (): Promise<void> => {
        let oldChart: IChartResponse = {...Me.preferences[PREFERENCES.CHART]};
        if (!oldChart.readChart) {
            Me.preferences[PREFERENCES.CHART] = {oldChart, readChart: new Date().toISOString()}
            oldChart.readChart = new Date().toISOString();
            return await Me.savePreference(PREFERENCES.CHART)
        }
        return;
    },

    getChart: async (): Promise<Chart> => Me.preference(PREFERENCES.CHART)
        .then((res: AxiosResponse) => new Chart(<IChartResponse>res)),

    getUserChart: async (): Promise<Chart> => chartService.getChart()
        .catch(() => new Chart(<IChartResponse>{
            acceptChart: undefined,
            acceptAssign: undefined,
            acceptReceive: undefined
        }))
};

export const ChartService = ng.service('ChartService', (): IChartService => chartService);