import {ng, notify} from 'entcore';

import {IBadgeTypeService} from "../services";
import {BadgeType} from "../models/badge-type.model";
import {safeApply} from "../utils/safe-apply.utils";
import {AxiosError} from "axios";
import {IScope} from "angular";
import {Setting} from "../models/setting.model";


interface ViewModel {
    badgeType: BadgeType;
}

interface IMinibadgeScope extends IScope {
    vm: ViewModel;
    setting: Setting;
}

class Controller implements ng.IController, ViewModel {
    badgeType: BadgeType;

    constructor(private $scope: IMinibadgeScope,
                private $route: any,
                private badgeTypeService: IBadgeTypeService) {
        this.$scope.vm = this;
    }

    $onInit() {
        this.getBadgeType(this.$route.current.params.typeId);
    }

    private getBadgeType = async (typeId: number): Promise<void> => {
        this.badgeTypeService.getBadgeType(typeId)
            .then((data: BadgeType) => {
                if (data) this.badgeType = data;
                safeApply(this.$scope);
            })
            .catch((err: AxiosError) => notify.error('minibadge.error.get.badge.type'))
    }


    $onDestroy() {
    }
}

export const badgeTypeController = ng.controller('BadgeTypeController',
    ['$scope', '$route', 'BadgeTypeService', Controller]);