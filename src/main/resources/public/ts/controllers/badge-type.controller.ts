import {Behaviours, model, ng, notify} from 'entcore';

import {IBadgeTypeService} from "../services";
import {IBadgeType, IBadgeTypesPayload, IBadgeTypesResponse} from "../models/badge-type.model";
import {safeApply} from "../utils/safe-apply.utils";
import {AxiosError} from "axios";
import {MINIBADGE_APP} from "../minibadgeBehaviours";
import {IScope} from "angular";
import {ISetting} from "../models/setting.model";


interface ViewModel {
    getBadgeTypes(): Promise<void>;

    initBadgeTypes(query?: string): Promise<void>;

    onScroll(): Promise<void>;

    badgeTypes: IBadgeType[];
}

interface IMinibadgeScope extends IScope {
    vm: ViewModel;
    setting: ISetting;
}

class Controller implements ng.IController, ViewModel {
    private payload: IBadgeTypesPayload;

    badgeTypes: IBadgeType[];

    constructor(private $scope: IMinibadgeScope,
                private $route: any,
                private badgeTypeService: IBadgeTypeService,) {
        this.$scope.vm = this;
        this.payload = {
            offset: 0,
        };
    }

    $onInit() {
        this.initBadgeTypes();
    }

    resetBadgeTypes = (): void => {
        this.payload.offset = 0;
        this.badgeTypes = [];
    }

    getBadgeTypes = async (): Promise<void> => {
        this.badgeTypeService.getBadgeTypes(model.me.structures[0], this.payload)
            .then((data: IBadgeTypesResponse) => {
                if (data && data.all && data.all.length > 0) {
                    this.badgeTypes.push(...data.all);
                    Behaviours.applicationsBehaviours[MINIBADGE_APP].infiniteScrollService
                        .updateScroll();
                }
                safeApply(this.$scope);
            })
            .catch((err: AxiosError) => notify.error('minibadge.error.get.badge.types'))
    }

    onScroll = async (): Promise<void> => {
        this.payload.offset += this.$scope.setting.pageSize;
        await this.getBadgeTypes();
    };

    initBadgeTypes = async (query?: string): Promise<void> => {
        this.payload.query = query;
        this.resetBadgeTypes();
        await this.getBadgeTypes();
    }


    $onDestroy() {
    }
}

export const badgeTypeController = ng.controller('BadgeTypeController',
    ['$scope', 'route', 'BadgeTypeService', Controller]);