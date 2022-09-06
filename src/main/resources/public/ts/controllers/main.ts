import {ng, template} from 'entcore';
import {NAVBAR_VIEWS} from "../core/enum/navbar.enum";
import {ISettingService} from "../services";
import {AxiosError} from "axios";
import {ISetting} from "../models/setting.model";
import {IScope} from "angular";

interface ViewModel {
    navbarViewSelected: NAVBAR_VIEWS;
}

interface IMinibadgeScope extends IScope {
    vm: ViewModel;
    setting: ISetting;
}

/**
 Wrapper controller
 ------------------
 Main controller.
 **/

class Controller implements ng.IController, ViewModel {
    navbarViewSelected: NAVBAR_VIEWS;

    constructor(private $scope: IMinibadgeScope,
                private $route: any,
                private settingService: ISettingService) {
        this.$scope.vm = this;

        this.$route({
            badgeTypes: () => {
                this.navbarViewSelected = NAVBAR_VIEWS.BADGES_LIBRARY;
                template.open('main', `badge-types`);
            },
            badgeReceived: () => {
                this.navbarViewSelected = NAVBAR_VIEWS.BADGES_RECEIVED;
                template.open('main', `main`);
            }
        });
    }

    $onInit() {
        this.settingService.getGlobalSettings()
            .then((res: ISetting) => this.$scope.setting = res)
            .catch((err: AxiosError) => this.$scope.setting = {pageSize: 0});
    }

    $onDestroy() {
    }
}

export const mainController = ng.controller('MainController',
    ['$scope', 'route', 'SettingService', Controller]);