import {moment, ng, notify} from 'entcore';
import {IScope} from "angular";
import {Setting} from "../models/setting.model";
import {translate} from "../utils/string.utils";
import {Statistics} from "../models/statistic.model";
import {IStatisticService} from "../services";
import {safeApply} from "../utils/safe-apply.utils";
import {toLocaleString} from "../utils/number.utils";

interface ViewModel {
    startDate: Date;
    endDate: Date;
    translate: typeof translate;
    toLocaleString: typeof toLocaleString;
    statistics: Statistics;
}


interface IMinibadgeScope extends IScope {
    vm: ViewModel;
    setting: Setting;
}

class Controller implements ng.IController, ViewModel {
    startDate: Date;
    endDate: Date;
    translate: typeof translate = translate;
    toLocaleString: typeof toLocaleString = toLocaleString;
    statistics: Statistics;

    constructor(private $scope: IMinibadgeScope, private statisticService: IStatisticService) {
        this.endDate = new Date();
        this.startDate = moment().subtract('months', 1).toDate();
        this.$scope.vm = this;
        this.statistics = new Statistics();
    }

    $onInit() {
        this.statisticService.getStatistics()
            .then((data: Statistics) => {
                if (data) this.statistics = data;
                safeApply(this.$scope);
            })
            .catch(() => notify.error('minibadge.error.get.statistics'));
    }

    $onDestroy() {
    }
}

export const statisticsController = ng.controller('StatisticsController',
    ['$scope', 'StatisticService', Controller]);