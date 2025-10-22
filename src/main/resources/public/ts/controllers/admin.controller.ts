import { idiom as lang, moment, ng } from 'entcore';

import { ILocationService, IScope } from "angular";
import { DATE_FORMAT } from "../core/enum/date.enum";
import { BadgeAssigned, IBadgeAllPayload } from "../models/badge-assigned.model";
import { Setting } from "../models/setting.model";
import { IBadgesAllService } from '../services';
import { safeApply } from "../utils/safe-apply.utils";


interface ViewModel {
    startDate: Date;
    endDate: Date;
    labelTo: string
    labelFrom: string
    searchQuery: string;
    badges: BadgeAssigned[];
    payload: IBadgeAllPayload;
}


interface IMinibadgeScope extends IScope {
    vm: ViewModel;
    setting: Setting;
}

class Controller implements ng.IController, ViewModel {

    badges: BadgeAssigned[] = [];
    payload = {
        query: "",
        startDate: "",
        endDate: "",
        sortType: "",
        sortAsc: true,
    };
    startDate: Date;
    endDate: Date;
    labelTo: string;
    labelFrom: string;
    searchQuery: string = "";

    constructor(private $scope: IMinibadgeScope,
                private $location: ILocationService,
                private BadgesAllService: IBadgesAllService) {
        this.endDate = new Date();
        this.startDate = moment().subtract('months', 1).toDate();
        this.labelTo = "minibadge.periode.date.to";
        this.labelFrom = "minibadge.periode.date.from";
        this.$scope.vm = this;
    }

    filterBadges = async (sortLabel: string, isAsc: boolean) => {
        //need to wait directives changes
        await safeApply(this.$scope);
        this.payload.sortType = lang.translate(sortLabel);
        this.payload.sortAsc = isAsc;
        this.initAllBadges();
    }

    $onInit() {
        this.initAllBadges();
    }

    private async initAllBadges() {
        //need to wait directives changes
        await safeApply(this.$scope)
        this.badges = [];
        this.payload.query = this.searchQuery;
        if (this.startDate && this.endDate) {
            this.payload.startDate = moment(this.startDate).format(DATE_FORMAT.DAY_MONTH_YEAR_MOMENT);
            this.payload.endDate = moment(this.endDate).format(DATE_FORMAT.DAY_MONTH_YEAR_MOMENT);
        }
        await this.BadgesAllService.getAllBadges(this.payload).then(
            (data: BadgeAssigned[]) => {
                if (data && data.length > 0) {
                    this.badges.push(...data);
                }
                safeApply(this.$scope);
            }
        );
    }

    $onDestroy() {
    }
}

export const adminController = ng.controller('AdminController',
    ['$scope', '$location', 'BadgesAllService', Controller]);