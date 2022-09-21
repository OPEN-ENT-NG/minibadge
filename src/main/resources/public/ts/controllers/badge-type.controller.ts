import {Behaviours, ng, notify} from 'entcore';

import {IBadgeTypeService} from "../services";
import {BadgeType} from "../models/badge-type.model";
import {safeApply} from "../utils/safe-apply.utils";
import {AxiosError} from "axios";
import {MINIBADGE_APP} from "../minibadgeBehaviours";
import {IScope} from "angular";
import {Setting} from "../models/setting.model";
import {Subscription} from "rxjs";


interface ViewModel {
    badgeType: BadgeType;
    onOpenLightbox(): void;
}

interface IMinibadgeScope extends IScope {
    vm: ViewModel;
    setting: Setting;
}

class Controller implements ng.IController, ViewModel {
    badgeType: BadgeType;

    subscriptions: Subscription = new Subscription();

    constructor(private $scope: IMinibadgeScope,
                private $route: any,
                private badgeTypeService: IBadgeTypeService) {
        this.$scope.vm = this;
    }

    $onInit() {
        this.getBadgeType(this.$route.current.params.typeId);
    }

    onOpenLightbox = (): void => {
        Behaviours.applicationsBehaviours[MINIBADGE_APP].snipletBadgeAssignService
            .sendBadgeType(this.badgeType);
    }

    private getBadgeType = async (typeId: number): Promise<void> => {
        this.badgeTypeService.getBadgeType(typeId)
            .then((data: BadgeType) => {
                if (data) this.badgeType = data;
                safeApply(this.$scope);
            })
            .catch((err: AxiosError) => notify.error('minibadge.error.get.badge.type'));
    }


    $onDestroy() {
    }
}

export const badgeTypeController = ng.controller('BadgeTypeController',
    ['$scope', '$route', 'BadgeTypeService', Controller]);