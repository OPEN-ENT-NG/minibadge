import { ILocationService, IScope } from "angular";
import { Behaviours, model, ng, notify, template } from 'entcore';
import { Subscription } from "rxjs";
import { rights } from "../core/constants/rights.const";
import { NAVBAR_VIEWS } from "../core/enum/navbar.enum";
import { MINIBADGE_APP } from "../minibadgeBehaviours";
import { Chart } from "../models/chart.model";
import { ContainerHeader, IContainerHeaderResponse } from "../models/container-header.model";
import { Setting } from "../models/setting.model";
import { IUserResponse, User } from "../models/user.model";
import { IChartService, ISettingService } from "../services";
import { safeApply } from "../utils/safe-apply.utils";

interface ViewModel {
    openChartLightbox(): void;

    chartValidate(isValidate?: boolean): Promise<void>;

    resetChartValues(): void;

    navbarViewSelected: NAVBAR_VIEWS;
    containerHeader: ContainerHeader;
    isChartLightboxOpened: boolean;
    isChartAccepted: boolean;
    isMinibadgeAccepted: boolean;
    isAllowedToUseMinibadge: boolean;
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
    isAllowedToUseMinibadge: boolean;

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
                if (!model.me.hasWorkflow(rights.workflow.statisticsView)) this.$location.path('/');
                else {
                    await this.initInfos();
                    this.navbarViewSelected = NAVBAR_VIEWS.BADGES_STATISTICS;
                    this.containerHeader = new ContainerHeader(<IContainerHeaderResponse>{label: "minibadge.statistics"});
                    template.open('main', `statistics`);
                }
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
                    .validateChart(this.$scope.setting.userPermissions);
                await this.resetChartValues();
            })
            .catch(() => notify.error('minibadge.error.chart.validate'));
    }

    resetChartValues = async (): Promise<void> => {
        await this.chartService.viewChart();
        this.$scope.vm.isChartAccepted = !!this.$scope.setting.userPermissions.acceptChart;
        this.$scope.vm.isMinibadgeAccepted = !!this.$scope.setting.userPermissions.acceptAssign
            || !!this.$scope.setting.userPermissions.acceptReceive;
        safeApply(this.$scope);
    }

    redirectMainView = (): void => {
        this.$location.path('/');
    }

    private async initInfos() {
        this.$scope.me = new User(<IUserResponse>model.me);
        await Promise.all([this.getSettings(), this.chartService.getUserChart(),
            model.me.hasWorkflow(rights.workflow.assign), model.me.hasWorkflow(rights.workflow.receive)])
            .then((data: [Setting, Chart, boolean, boolean]) => {
                let setting: Setting = data[0];
                setting.userPermissions = data[1];
                this.$scope.setting = setting;
                this.isAllowedToUseMinibadge = data[2] || data[3];

                this.isChartLightboxOpened = this.isAllowedToUseMinibadge &&
                    !this.$scope.setting.userPermissions.readChart &&
                    !this.$scope.setting.userPermissions.acceptChart;
                this.isChartAccepted = !!this.$scope.setting.userPermissions.acceptChart;
                this.isMinibadgeAccepted = !!this.$scope.setting.userPermissions.acceptChart
                    && (!!this.$scope.setting.userPermissions.acceptAssign
                        || !!this.$scope.setting.userPermissions.acceptReceive);
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