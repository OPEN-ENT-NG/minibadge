import { IScope } from "angular";
import { model, moment, ng, notify } from 'entcore';
import { rights } from '../core/constants/rights.const';
import { StatsPeriod } from "../core/enum/stats-period.enum";
import { StatsType } from "../core/enum/stats-type.enum";
import { Setting } from "../models/setting.model";
import { Statistics } from "../models/statistic.model";
import { IStatisticService } from "../services";
import { toLocaleString } from "../utils/number.utils";
import { safeApply } from "../utils/safe-apply.utils";
import { translate } from "../utils/string.utils";

interface ViewModel {
    startDate: Date | null;
    endDate: Date;
    selectedPeriod: StatsPeriod;
    selectedType: StatsType;
    translate: typeof translate;
    toLocaleString: typeof toLocaleString;
    statistics: Statistics;
    hasStatisticsViewAllStructuresRight(): boolean;
}

interface IMinibadgeScope extends IScope {
    vm: ViewModel;
    setting: Setting;
}

class Controller implements ng.IController, ViewModel {
    startDate: Date | null;
    endDate: Date;
    translate: typeof translate = translate;
    toLocaleString: typeof toLocaleString = toLocaleString;
    statistics: Statistics;
    selectedPeriod: StatsPeriod;
    selectedType: StatsType;

    constructor(private $scope: IMinibadgeScope, private statisticService: IStatisticService) {
        this.endDate = new Date();
        this.startDate = null;
        this.$scope.vm = this;
        this.statistics = new Statistics();
        this.selectedPeriod = StatsPeriod.ALL;
        this.selectedType = StatsType.BADGES;
    }

    onChangePeriod(): void {
        this.updateStartDate();
        this.statisticService.getStatistics(this.startDate)
            .then((data: Statistics) => {
                if (data) this.statistics = data;
                safeApply(this.$scope);
            })
            .catch(() => notify.error('minibadge.error.get.statistics'));
        safeApply(this.$scope);
    }

    private updateStartDate(): void {
        const today = moment();

        switch (this.selectedPeriod) {
            case StatsPeriod.ALL:
                this.startDate = null;
                break;
            case StatsPeriod.LAST_30_DAYS:
                this.startDate = today.clone().subtract(30, 'days').toDate();
                break;
            case StatsPeriod.LAST_7_DAYS:
                this.startDate = today.clone().subtract(7, 'days').toDate();
                break;
            default:
                this.startDate = null;
        }
    }

    $onInit() {
        this.statisticService.getStatistics(null)
            .then((data: Statistics) => {
                if (data) this.statistics = data;
                safeApply(this.$scope);
            })
            .catch(() => notify.error('minibadge.error.get.statistics'));
    }

    $onDestroy() {
    }

    hasStatisticsViewAllStructuresRight = (): boolean => model.me.hasWorkflow(rights.workflow.statisticsViewAllStructures);

    isBadgesSelected = (): boolean => this.selectedType === StatsType.BADGES;

    isUsersSelected = (): boolean => this.selectedType === StatsType.USERS;
}

export const statisticsController = ng.controller('StatisticsController',
    ['$scope', 'StatisticService', Controller]);