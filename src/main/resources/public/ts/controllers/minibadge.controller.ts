import {ng} from 'entcore';
import {IScope} from "angular";
import {Setting} from "../models/setting.model";

interface ViewModel {
}

interface IMinibadgeScope extends IScope {
    vm: ViewModel;
    setting: Setting;
}

class Controller implements ng.IController, ViewModel {

    constructor(private $scope: IMinibadgeScope) {
        this.$scope.vm = this;

    }

    $onInit() {
    }

    $onDestroy() {
    }
}

export const minibadgeController = ng.controller('MinibadgeController', ['$scope', Controller]);