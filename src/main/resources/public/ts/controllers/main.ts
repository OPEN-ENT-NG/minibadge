import {Behaviours, model, ng, notify, template} from 'entcore';
import {NAVBAR_VIEWS} from "../core/enum/navbar.enum";
import {IChartService, ISettingService} from "../services";
import {Setting} from "../models/setting.model";
import {ILocationService, IScope} from "angular";
import {Chart} from "../models/chart.model";
import {IUserResponse, User} from "../models/user.model";
import {MINIBADGE_APP} from "../minibadgeBehaviours";
import {ContainerHeader, IContainerHeaderResponse} from "../models/container-header.model";
import {Subscription} from "rxjs";

interface ViewModel {
    openChartLightbox(): void;

    chartValidate(): Promise<void>;

    resetChartValues(): void;

    navbarViewSelected: NAVBAR_VIEWS;
    containerHeader: ContainerHeader;
    isChartLightboxOpened: boolean;
    isChartAccepted: boolean;
    isMinibadgeAccepted: boolean;
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
    containerHeader: ContainerHeader;
    isChartLightboxOpened: boolean;
    isChartAccepted: boolean;
    isMinibadgeAccepted: boolean;

    subscriptions: Subscription = new Subscription();

    constructor(private $scope: IMinibadgeScope,
                private $route: any,
                private $location: ILocationService,
                private settingService: ISettingService,
                private chartService: IChartService) {
        this.$scope.vm = this;

        this.$route({
            badgeReceived: async () => {
                await this.initInfos();
                this.navbarViewSelected = NAVBAR_VIEWS.BADGES_RECEIVED;
                this.containerHeader = new ContainerHeader(<IContainerHeaderResponse>{label: "minibadge.my.badges.received"});
                template.open('main', `main`);
            },
            badgeTypes: async () => {
                await this.initInfos();
                this.navbarViewSelected = NAVBAR_VIEWS.BADGES_LIBRARY;
                this.containerHeader = new ContainerHeader(<IContainerHeaderResponse>{label: "minibadge.navbar.badges.library"});
                template.open('main', `badge-types`);
            },
            badgeGiven: async () => {
                await this.initInfos();
                this.navbarViewSelected = NAVBAR_VIEWS.BADGES_GIVEN;
                this.containerHeader = new ContainerHeader(<IContainerHeaderResponse>{label: "minibadge.badges.given"});
                template.open('main', `badges-given`);
            },
            statistics: async () => {
                await this.initInfos();
                this.navbarViewSelected = NAVBAR_VIEWS.BADGES_STATISTICS;
                this.containerHeader = new ContainerHeader(<IContainerHeaderResponse>{label: "minibadge.statistics"});
                template.open('main', `statistics`);
            },
            badgeType: async () => {
                await this.initInfos();
                template.open('main', `badge-type`);
            }
        });
    }

    $onInit() {
        this.subscriptions.add(Behaviours.applicationsBehaviours[MINIBADGE_APP].containerHeaderEventsService
            .getContainerHeader().subscribe((containerHeader: ContainerHeader) => {
                this.containerHeader = containerHeader;
            }));
    }

    openChartLightbox = (): void => {
        this.isChartLightboxOpened = true;
    }

    chartValidate = async (): Promise<void> => {
        this.chartService.saveChart(this.isChartAccepted, this.isMinibadgeAccepted)
            .then(async () => {
                this.$scope.setting.userPermissions = await this.chartService.getChart();
                Behaviours.applicationsBehaviours[MINIBADGE_APP].chartEventsService
                    .validateChart(this.$scope.setting.userPermissions)
                this.resetChartValues();
            })
            .catch(() => notify.error('minibadge.error.chart.validate'));
    }

    resetChartValues = (): void => {
        this.$scope.vm.isChartAccepted = !!this.$scope.setting.userPermissions.acceptChart;
        this.$scope.vm.isMinibadgeAccepted = !!this.$scope.setting.userPermissions.acceptAssign
            || !!this.$scope.setting.userPermissions.acceptReceive;
    }

    redirectMainView = (): void => {
        this.$location.path('/');
    }

    private async initInfos() {
        this.$scope.me = new User(<IUserResponse>model.me);
        await Promise.all([this.getSettings(), this.chartService.getUserChart()])
            .then((data: [Setting, Chart]) => {
                let setting: Setting = data[0];
                setting.userPermissions = data[1];
                this.$scope.setting = setting;

                this.isChartLightboxOpened = !this.$scope.setting.userPermissions.acceptChart;
                this.isChartAccepted = true;
                this.isMinibadgeAccepted = !this.$scope.setting.userPermissions.acceptChart
                    || !!this.$scope.setting.userPermissions.acceptAssign
                    || !!this.$scope.setting.userPermissions.acceptReceive;
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
    ['$scope', 'route', '$location', 'SettingService', 'ChartService', Controller]);