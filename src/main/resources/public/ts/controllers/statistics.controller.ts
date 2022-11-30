import {moment, ng} from 'entcore';
import {IScope} from "angular";
import {Setting} from "../models/setting.model";
import {translate} from "../utils/string.utils";

interface ViewModel {
    startDate: Date;
    endDate: Date;
    translate: typeof translate;
}


interface IMinibadgeScope extends IScope {
    vm: ViewModel;
    setting: Setting;
}

class Controller implements ng.IController, ViewModel {
    startDate: Date;
    endDate: Date;
    translate: typeof translate = translate;
    // Pay attention, the values below are for the front test, they will be modified during the final implementation
    badgeReceivedLengthTest: string = (3).toLocaleString();
    badgeRefuseLengthTest: string = (3).toLocaleString();
    topStructureLengthTest: string = (5).toLocaleString();
    countValue: string = (109537).toLocaleString();

    constructor(private $scope: IMinibadgeScope) {
        this.endDate = new Date();
        this.startDate = moment().subtract('months', 1).toDate();
        this.$scope.vm = this;
    }

    $onInit() {
    }

    $onDestroy() {
    }
}

export const statisticsController = ng.controller('StatisticsController',
    ['$scope', Controller]);