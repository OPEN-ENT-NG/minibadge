import { Behaviours, idiom as lang, model, ng, notify } from 'entcore';

import { IScope } from "angular";
import { AxiosError } from 'axios';
import { Subscription } from "rxjs";
import { MINIBADGE_APP } from "../minibadgeBehaviours";
import { ActionOption, IActionOptionResponse } from "../models/action-option.model";
import { BadgeType } from "../models/badge-type.model";
import { ContainerHeader, IContainerHeaderResponse } from "../models/container-header.model";
import { Paging } from "../models/paging.model";
import { Setting } from "../models/setting.model";
import { User } from "../models/user.model";
import { IBadgeAssignedService, IBadgeTypeService } from "../services";
import { toLocaleString } from "../utils/number.utils";
import { safeApply } from "../utils/safe-apply.utils";
import { translate } from "../utils/string.utils";


interface ViewModel {
    onOpenAssignModal(): void;

    onOpenAssignMyselfModal(): void;

    onCloseAssignMyselfModal(): void;

    userAssignersTotal(): string;

    receiversTotal(): string;

    displayItemImg(user: User): string

    getBadgeTypeAssigners(): Promise<void>;

    getBadgeTypeReceivers(): Promise<void>;

    assignMyself(): void;

    typeId: number;
    badgeType: BadgeType;
    assigners: User[];
    receivers: User[];
    assignersPayload: Paging;
    receiversPayload: Paging;
    lang: typeof lang;
    isBadgeAssignMyselfModalOpen: boolean;
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
    isBadgeAssignMyselfModalOpen: boolean = false;

    subscriptions: Subscription = new Subscription();

    constructor(private $scope: IMinibadgeScope,
                private $route: any,
                private badgeTypeService: IBadgeTypeService,
                private badgeAssignedService: IBadgeAssignedService
            ) {
        this.$scope.vm = this;
        this.typeId = this.$route.current.params.typeId;
        this.lang = lang;
    }

    $onInit() {
        window.scrollTo(0, 0);
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

    private refreshBadgeTypeData = (): void => {
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

    onOpenAssignModal = (): void => {
        Behaviours.applicationsBehaviours[MINIBADGE_APP].snipletBadgeAssignService
            .sendBadgeType(this.badgeType);
    }

    onOpenAssignMyselfModal(): void {
        this.isBadgeAssignMyselfModalOpen = true;
    }

    onCloseAssignMyselfModal(): void {
        this.isBadgeAssignMyselfModalOpen = false;
    }

    assignMyself(): void {
        this.badgeAssignedService.assign(this.badgeType.id, {ownerIds: [model.me.userId]})
            .then(() => {
                this.onCloseAssignMyselfModal();
                this.refreshBadgeTypeData();
                this.$scope.setting.incrementAssignationsNumbers(1);
                notify.success('minibadge.success.assign')
            })
            .catch((err: AxiosError) => notify.error('minibadge.error.assign'));
    }

    userAssignersTotal = (): string => this.badgeType && this.badgeType.userAssignersTotal ?
        toLocaleString(this.badgeType.userAssignersTotal) : null;

    receiversTotal = (): string => this.badgeType && this.badgeType.receiversTotal ?
        toLocaleString(this.badgeType.receiversTotal) : null;

    displayItemImg = (user: User): string => `/userbook/avatar/${user.id}?thumbnail=48x48`;

    getBadgeTypeAssigners = async (): Promise<void> => {
        if (this.badgeType && this.$scope.setting.userPermissions.canReceive())
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
                    const buttons: ActionOption[] = [];
                    if (data.isSelfieBadge()) {
                        buttons.push(
                            new ActionOption(<IActionOptionResponse>{
                                label: 'minibadge.badge.assign.myself.button',
                                show: () => this.$scope.setting?.userPermissions?.canAssign(),
                                action: () => this.onOpenAssignMyselfModal(),
                            })
                        );
                    }
                    buttons.push(
                        new ActionOption(<IActionOptionResponse>{
                            label: 'minibadge.badge.assign',
                            show: () => this.$scope.setting?.userPermissions?.canAssign(),
                            action: () => this.onOpenAssignModal(),
                        })
                    );
                    Behaviours.applicationsBehaviours[MINIBADGE_APP].containerHeaderEventsService
                        .changeContainerHeader(new ContainerHeader(<IContainerHeaderResponse>{
                            label: `${this.lang.translate('minibadge.badge')} ${this.badgeType.label}`,
                            buttons: buttons
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
    ['$scope', '$route', 'BadgeTypeService', 'BadgeAssignedService', Controller]);