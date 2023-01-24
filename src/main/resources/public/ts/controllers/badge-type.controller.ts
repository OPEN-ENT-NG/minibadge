import {Behaviours, idiom as lang, ng, notify} from 'entcore';

import {IBadgeTypeService} from "../services";
import {BadgeType} from "../models/badge-type.model";
import {safeApply} from "../utils/safe-apply.utils";
import {MINIBADGE_APP} from "../minibadgeBehaviours";
import {IScope} from "angular";
import {Setting} from "../models/setting.model";
import {Subscription} from "rxjs";
import {User} from "../models/user.model";
import {Paging} from "../models/paging.model";
import {ContainerHeader, IContainerHeaderResponse} from "../models/container-header.model";
import {ActionOption, IActionOptionResponse} from "../models/action-option.model";
import {toLocaleString} from "../utils/number.utils";
import {translate} from "../utils/string.utils";


interface ViewModel {
    onOpenLightbox(): void;

    sessionUserAssignersTotal(): string;

    receiversTotal(): string;

    displayItemImg(user: User): string

    getBadgeTypeAssigners(): Promise<void>;

    getBadgeTypeReceivers(): Promise<void>;

    typeId: number;
    badgeType: BadgeType;
    assigners: User[];
    receivers: User[];
    assignersPayload: Paging;
    receiversPayload: Paging;
    lang: typeof lang;
}

interface IMinibadgeScope extends IScope {
    vm: ViewModel;
    setting: Setting;
}

class Controller implements ng.IController, ViewModel {
    typeId: number;
    badgeType: BadgeType;
    assigners: User[];
    receivers: User[];
    assignersPayload: Paging;
    receiversPayload: Paging;
    lang: typeof lang;

    subscriptions: Subscription = new Subscription();

    constructor(private $scope: IMinibadgeScope,
                private $route: any,
                private badgeTypeService: IBadgeTypeService) {
        this.$scope.vm = this;
        this.typeId = this.$route.current.params.typeId;
        this.lang = lang;
    }

    $onInit() {
        this.assignersPayload = new Paging({page: 0});
        this.receiversPayload = new Paging({page: 0});


        this.getBadgeType()
            .then(() => {
                Promise.all([
                    this.getBadgeTypeAssigners(),
                    this.getBadgeTypeReceivers(),
                ])
            });
    }

    onOpenLightbox = (): void => {
        Behaviours.applicationsBehaviours[MINIBADGE_APP].snipletBadgeAssignService
            .sendBadgeType(this.badgeType);
    }

    sessionUserAssignersTotal = (): string => this.badgeType && this.badgeType.sessionUserAssignersTotal ?
        toLocaleString(this.badgeType.sessionUserAssignersTotal) : null;

    receiversTotal = (): string => this.badgeType && this.badgeType.receiversTotal ?
        toLocaleString(this.badgeType.receiversTotal) : null;

    displayItemImg = (user: User): string => `/userbook/avatar/${user.id}?thumbnail=48x48`;

    getBadgeTypeAssigners = async (): Promise<void> => {
        if (this.badgeType)
            this.badgeTypeService.getBadgeTypeAssigners(this.badgeType, this.assignersPayload)
                .then((data: User[]) => {
                    if (data) {
                        this.assigners = data;
                        this.assigners.forEach((user: User) => {
                            user.displayItemDistinction = (): string => this.lang.translate(user.profileToI18n());
                            user.displayItemImg = (): string => this.displayItemImg(user);
                        });
                    }
                    safeApply(this.$scope);
                })
                .catch(() => notify.error('minibadge.error.get.badge.type'));
    }

    getBadgeTypeReceivers = async (): Promise<void> => {
        if (this.badgeType)
            this.badgeTypeService.getBadgeReceivers(this.badgeType, this.receiversPayload)
                .then((data: User[]) => {
                    if (data) {
                        this.receivers = data;
                        this.receivers.forEach((user: User) => {
                            user.displayItemDistinction = (): string =>
                                user.badgeAssignedTotal ? translate("minibadge.times",
                                        [toLocaleString(user.badgeAssignedTotal)])
                                    : null;
                            user.displayItemImg = (): string => this.displayItemImg(user);

                        })
                    }
                    safeApply(this.$scope);
                })
                .catch(() => notify.error('minibadge.error.get.badge.type'));
    }

    private getBadgeType = async (): Promise<void> => {
        return this.badgeTypeService.getBadgeType(this.typeId)
            .then((data: BadgeType) => {
                if (data) {
                    this.badgeType = data;
                    Behaviours.applicationsBehaviours[MINIBADGE_APP].containerHeaderEventsService
                        .changeContainerHeader(new ContainerHeader(<IContainerHeaderResponse>{
                            label: `${this.lang.translate('minibadge.badge')} ${this.badgeType.label}`,
                            buttons: [new ActionOption(<IActionOptionResponse>{
                                label: 'minibadge.badge.assign',
                                action: () => this.onOpenLightbox(),
                            })]
                        }));
                }
                safeApply(this.$scope);
            })
            .catch(() => notify.error('minibadge.error.get.badge.type'));
    }


    $onDestroy() {
    }
}

export const badgeTypeController = ng.controller('BadgeTypeController',
    ['$scope', '$route', 'BadgeTypeService', Controller]);