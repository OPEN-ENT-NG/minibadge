import {ng, notify} from 'entcore';
import {ILocationService, IScope} from "angular";
import {Setting} from "../models/setting.model";
import {IBadgeService} from "../services";
import {safeApply} from "../utils/safe-apply.utils";
import {AxiosError} from "axios";
import {Badge, IBadgePayload} from "../models/badge.model";
import {CARD_FOOTER} from "../core/enum/card-footers.enum";
import {ActionOption, IActionOptionResponse} from "../models/action-option.model";
import {IChartService} from "../services/chart.service";

interface ViewModel {
    getBadges(): Promise<void>;

    openChartLightbox(): void;

    badges: Badge[];
    searchQuery: string;
    isChartLightboxOpened: boolean;
    isChartAccepted: boolean;
    isMinibadgeAccepted: boolean;
    publishedBadges: Badge[];
    privatizedBadges: Badge[];
    refusedBadges: Badge[];
}

interface IMinibadgeScope extends IScope {
    vm: ViewModel;
    setting: Setting;
}

class Controller implements ng.IController, ViewModel {
    private static privatizeOption: string = 'minibadge.privatize';
    private static refuseOption: string = 'minibadge.refuse';
    private static publicOption: string = 'minibadge.publish';
    private static acceptOption: string = 'minibadge.accept';
    private payload: IBadgePayload;

    CARD_FOOTER: typeof CARD_FOOTER;
    badges: Badge[];
    publishedBadges: Badge[];
    privatizedBadges: Badge[];
    refusedBadges: Badge[];
    isOpenedOption:boolean = false;
    searchQuery: string;
    isChartLightboxOpened: boolean;
    isChartAccepted: boolean;
    isMinibadgeAccepted: boolean;

    constructor(private $scope: IMinibadgeScope, private $location: ILocationService,
                private badgeService: IBadgeService, private chartService: IChartService) {
        this.$scope.vm = this;
        this.isChartLightboxOpened = !this.$scope.setting.userPermissions.acceptChart;
        this.isChartAccepted = !!this.$scope.setting.userPermissions.acceptChart;
        this.isMinibadgeAccepted = !!this.$scope.setting.userPermissions.acceptAssign
            || !!this.$scope.setting.userPermissions.acceptReceive;
        this.payload = {};
    }

    $onInit() {
        this.initBadges();
    }

    initBadges = async (): Promise<void> => {
        this.payload.query = this.searchQuery;
        this.badges = [];
        await this.getBadges();
    }

    getBadges = async (): Promise<void> => {
        this.badgeService.getBadges(this.payload)
            .then((data: Badge[]) => {
                if (data && data.length > 0) {
                    this.setBadgeActionOptions(data);
                    this.badges.push(...data);

                    this.publishedBadges = this.badges ? this.badges.filter((badge: Badge) => badge.isPublic()) : [];
                    this.privatizedBadges = this.badges ? this.badges.filter((badge: Badge) => badge.isPrivatized()) : [];
                    this.refusedBadges = this.badges ? this.badges.filter((badge: Badge) => badge.isRefused()) : [];
                }

                this.isOpenedOption = this.payload.query && !!this.payload.query.trim().length;
                safeApply(this.$scope);
            })
            .catch((err: AxiosError) => notify.error('minibadge.error.get.badges'))
    }

    openChartLightbox = (): void => {
        this.isChartLightboxOpened = true;
    }

    chartValidate = async (): Promise<void> => {
        this.chartService.saveChart(this.isChartAccepted, this.isMinibadgeAccepted)
            .then(async () => {
                await this.initBadges();
                this.$scope.setting.userPermissions = await this.chartService.getChart();
            })
            .catch((err: AxiosError) => notify.error('minibadge.error.chart.validate'));
    }


    private setBadgeActionOptions(badges: Badge[]): void {
        badges.forEach((badge: Badge) => {
            if (badge.badgeType) {
                if (badge.isPublic()) badge.setActionOptions(this.initPublicActionOptions(badge));
                else if (badge.isPrivatized()) badge.setActionOptions(this.initPrivateActionOptions(badge));
                else if (badge.isRefused()) badge.setActionOptions(this.initRefuseActionOptions(badge));
            }
        });
    }

    private initPublicActionOptions(badge: Badge): ActionOption[] {
        return [this.privatizeOption(badge), this.refuseOption(badge)];
    }

    private initPrivateActionOptions(badge: Badge): ActionOption[] {
        return [this.publicOption(badge), this.refuseOption(badge)];
    }

    private initRefuseActionOptions(badge: Badge): ActionOption[] {
        return [this.acceptOption(badge)];
    }

    private privatizeOption(badge: Badge): ActionOption {
        return new ActionOption(<IActionOptionResponse>{
            label: Controller.privatizeOption,
            icon: 'lock',
            action: () => this.badgeService.privatizeBadgeType(badge.badgeType.id)
                .then(async () => await this.initBadges()),
        });
    }

    private refuseOption(badge: Badge): ActionOption {
        return new ActionOption(<IActionOptionResponse>{
            label: Controller.refuseOption,
            icon: 'refused',
            action: () => this.badgeService.refuseBadgeType(badge.badgeType.id)
                .then(async () => await this.initBadges()),
        });
    }

    private publicOption(badge: Badge): ActionOption {
        return new ActionOption(<IActionOptionResponse>{
            label: Controller.publicOption,
            icon: 'earth',
            action: () => this.badgeService.publishBadgeType(badge.badgeType.id)
                .then(async () => await this.initBadges()),
        });
    }

    private acceptOption(badge: Badge): ActionOption {
        return new ActionOption(<IActionOptionResponse>{
            label: Controller.acceptOption,
            icon: 'check-circle',
            action: () => this.badgeService.publishBadgeType(badge.badgeType.id)
                .then(async () => await this.initBadges()),
        });
    }


    $onDestroy() {
    }
}

export const minibadgeController = ng.controller('MinibadgeController',
    ['$scope', '$location', 'BadgeService', 'ChartService', Controller]);