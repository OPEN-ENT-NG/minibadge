import {ng, template} from 'entcore';
import {NAVBAR_VIEWS} from "../core/enum/navbar.enum";
import {IChartService, ISettingService} from "../services";
import {Setting} from "../models/setting.model";
import {IScope} from "angular";
import {Chart, IChartResponse} from "../models/chart.model";

interface ViewModel {
    navbarViewSelected: NAVBAR_VIEWS;
}

interface IMinibadgeScope extends IScope {
    vm: ViewModel;
    setting: Setting;
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
                private settingService: ISettingService,
                private chartService: IChartService) {
        this.$scope.vm = this;

        this.$route({
            badgeReceived: () => {
                this.navbarViewSelected = NAVBAR_VIEWS.BADGES_RECEIVED;
                template.open('main', `main`);
            },
            badgeTypes: () => {
                this.navbarViewSelected = NAVBAR_VIEWS.BADGES_LIBRARY;
                template.open('main', `badge-types`);
            },
            badgeGiven: () => {
                this.navbarViewSelected = NAVBAR_VIEWS.BADGES_GIVEN;
                template.open('main', `badges-given`);
            },
            badgeType: () => {
                template.open('main', `badge-type`);
            }
        });
    }

    $onInit() {
        Promise.all([this.getSettings(), this.chartService.getUserChart()])
            .then((data: [Setting, Chart]) => {
                let setting: Setting = data[0];
                setting.userPermissions = data[1];
                this.$scope.setting = setting;
            });
    }

    private async getSettings(): Promise<Setting> {
        return this.settingService.getGlobalSettings()
            .catch(() => new Setting({pageSize: 0}));
    }

    $onDestroy() {
    }
}

export const mainController = ng.controller('MainController',
    ['$scope', 'route', 'SettingService', 'ChartService', Controller]);