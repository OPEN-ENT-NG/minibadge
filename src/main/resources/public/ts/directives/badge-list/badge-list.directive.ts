import {ng, idiom as lang} from "entcore";
import {IDirective, ILocationService, IScope} from "angular";
import {RootsConst} from "../../core/constants/roots.const";
import {BadgeType} from "../../models/badge-type.model";
import {CARD_FOOTER} from "../../core/enum/card-footers.enum";
import {Badge} from "../../models/badge.model";
import {safeApply} from "../../utils/safe-apply.utils";

interface IViewModel {
    redirectBadgeType(badgeType: BadgeType): void;

    checkOpenedListStatus(newBBadges: Badge[], oldBadges: Badge[], clickCallback?: () => void): void;

    clickList(): void;

    CARD_FOOTER: typeof CARD_FOOTER;
    lang: typeof lang;
    isOpenedList: boolean;
}

interface IDirectiveProperties {
    label: string;
    cardIcon: string;
    badges: Badge[];
    isDefaultOpenedList: boolean;
    areCardDisabled: boolean;
}

interface IMinibadgeScope extends IScope {
    vm: IDirectiveProperties;
}

class Controller implements ng.IController, IViewModel {
    CARD_FOOTER: typeof CARD_FOOTER;
    lang: typeof lang;
    isOpenedList: boolean;

    constructor(private $scope: IMinibadgeScope,
                private $location: ILocationService) {
        this.CARD_FOOTER = CARD_FOOTER;
        this.lang = lang;
    }

    $onInit() {
        if (this.$scope.vm.isDefaultOpenedList) this.isOpenedList = this.$scope.vm.isDefaultOpenedList;
        this.$scope.$watch((): Badge[] => this.$scope.vm.badges, (newBadges: Badge[], oldBadges: Badge[]): void => {
            this.checkOpenedListStatus(newBadges, oldBadges);
        });
    }

    checkOpenedListStatus = (newBadges: Badge[], oldBadges: Badge[], clickCallback?: () => void): void => {
        if (typeof clickCallback === "function") clickCallback();

        if ((!oldBadges || !oldBadges.length) && (newBadges && !!newBadges.length) &&
            !(typeof this.$scope.vm.isDefaultOpenedList === 'boolean' && this.$scope.vm.isDefaultOpenedList === false))
            this.isOpenedList = true;

        else if (oldBadges && newBadges && (oldBadges && !!oldBadges.length) && (!newBadges || !newBadges.length))
            this.isOpenedList = false;

        safeApply(this.$scope);
    }

    clickList = (): void => {
        this.checkOpenedListStatus(this.$scope.vm.badges, this.$scope.vm.badges, (): void => {
            if (this.$scope.vm.badges || !!this.$scope.vm.badges.length) this.isOpenedList = !this.isOpenedList;
        });
    }

    redirectBadgeType = (badgeType: BadgeType): void => {
        this.$location.path(badgeType.getDetailPath());
    }

    $onDestroy() {
    }

}

function directive(): IDirective {
    return {
        replace: true,
        restrict: 'E',
        templateUrl: `${RootsConst.directive}/badge-list/badge-list.html`,
        scope: {
            badges: '=',
            label: '=',
            cardIcon: '=',
            isDefaultOpenedList: '=?',
            areCardDisabled: '=?',
        },
        controllerAs: 'vm',
        bindToController: true,
        controller: ['$scope', '$location', Controller],
        /* interaction DOM/element */
        link: function (scope: ng.IScope,
                        element: ng.IAugmentedJQuery,
                        attrs: ng.IAttributes,
                        vm: ng.IController) {
        }
    }
}

export const minibadgeBadgeList = ng.directive('minibadgeBadgeList', directive);