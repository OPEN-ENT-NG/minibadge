import {model, ng, template} from 'entcore';
import {NAVBAR_VIEWS} from "../core/enum/navbar.enum";
import {IChartService, ISettingService} from "../services";
import {Setting} from "../models/setting.model";
import {IScope} from "angular";
import {Chart} from "../models/chart.model";
import {IUserResponse, User} from "../models/user.model";

interface ViewModel {
    navbarViewSelected: NAVBAR_VIEWS;
}

interface IMinibadgeScope extends IScope {
    vm: ViewModel;
    setting: Setting;
    me: User;
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
            badgeReceived: async () => {
                await this.initInfos();
                this.navbarViewSelected = NAVBAR_VIEWS.BADGES_RECEIVED;
                template.open('main', `main`);
            },
            badgeTypes: async () => {
                await this.initInfos();
                this.navbarViewSelected = NAVBAR_VIEWS.BADGES_LIBRARY;
                template.open('main', `badge-types`);
            },
            badgeGiven: async () => {
                await this.initInfos();
                this.navbarViewSelected = NAVBAR_VIEWS.BADGES_GIVEN;
                template.open('main', `badges-given`);
            },
            badgeType: async () => {
                await this.initInfos();
                template.open('main', `badge-type`);
            }
        });
    }

    $onInit() {
    }

    private async initInfos() {
        this.$scope.me = new User(<IUserResponse>model.me);
        await Promise.all([this.getSettings(), this.chartService.getUserChart()])
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