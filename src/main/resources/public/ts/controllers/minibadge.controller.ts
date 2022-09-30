import {ng, notify} from 'entcore';
import {ILocationService, IScope} from "angular";
import {Setting} from "../models/setting.model";
import {IBadgeService} from "../services";
import {safeApply} from "../utils/safe-apply.utils";
import {AxiosError} from "axios";
import {Badge, IBadgePayload} from "../models/badge.model";
import {CARD_FOOTER} from "../core/enum/card-footers.enum";
import {BadgeType} from "../models/badge-type.model";
import {ActionOption, IActionOptionResponse} from "../models/action-option.model";

interface ViewModel {
    getBadges(): Promise<void>;

    redirectBadgeType(badgeType: BadgeType): void;

    CARD_FOOTER: typeof CARD_FOOTER;
    badges: Badge[];
    searchQuery: string;
}

interface IMinibadgeScope extends IScope {
    vm: ViewModel;
    setting: Setting;
}

class Controller implements ng.IController, ViewModel {
    private static privatizeOption: string = 'minibadge.privatize';
    private static refuseOption: string = 'minibadge.refuse';
    private payload: IBadgePayload;

    CARD_FOOTER: typeof CARD_FOOTER;
    badges: Badge[];

    searchQuery: string;

    constructor(private $scope: IMinibadgeScope, private $location: ILocationService, private badgeService: IBadgeService) {
        this.$scope.vm = this;
        this.CARD_FOOTER = CARD_FOOTER;
        this.payload = {};
    }

    $onInit() {
        this.initBadge();
    }

    initBadge = async (): Promise<void> => {
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
                }
                safeApply(this.$scope);
            })
            .catch((err: AxiosError) => notify.error('minibadge.error.get.badges'))
    }

    private setBadgeActionOptions(badges: Badge[]): void {
        badges.forEach((badge: Badge) => {
            if (badge.badgeType)
                badge.setActionOptions(this.initPublicActionOptions(badge))
        })
    }

    private initPublicActionOptions(badge: Badge): ActionOption[] {
        let privatizeOption: ActionOption = new ActionOption(<IActionOptionResponse>{
            label: Controller.privatizeOption,
            action: () => this.badgeService.privatizeBadgeType(badge.badgeType.id),
        });

        let refuseOption: ActionOption = new ActionOption(<IActionOptionResponse>{
            label: Controller.refuseOption,
            action: () => this.badgeService.refuseBadgeType(badge.badgeType.id),
        });

        return [privatizeOption, refuseOption];
    }

    redirectBadgeType = (badgeType: BadgeType): void => {
        this.$location.path(badgeType.getDetailPath());
    }

    $onDestroy() {
    }
}

export const minibadgeController = ng.controller('MinibadgeController',
    ['$scope', '$location', 'BadgeService', Controller]);