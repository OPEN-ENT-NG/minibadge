import {ng} from "entcore";
import {IDirective, ILocationService, IScope, isFunction, IWindowService} from "angular";
import {RootsConst} from "../../core/constants/roots.const";
import {DATE_FORMAT} from "../../core/enum/date.enum";
import {BadgeType} from "../../models/badge-type.model";
import {CARD_FOOTER} from "../../core/enum/card-footers.enum";
import {BadgeAssigned} from "../../models/badge-assigned.model";
import {safeApply} from "../../utils/safe-apply.utils";


interface IViewModel {
    DATE_FORMAT: typeof DATE_FORMAT;
    isAsc: boolean;
    label: string;

    openRevokeLightbox(badgeGiven: BadgeAssigned): void;

    closeLightbox(): void;

    validRevoke(): void;

    onClick(filterLabel: string): void;
}


interface IDirectiveProperties {
    filterFunction?({filterType: string, filterAsc: boolean}): void;

    deleteFunction({badgeGiven: BadgeAssigned}): void;

    badgesGiven: BadgeAssigned[];
    isOpenLightbox: boolean;
}

interface IMinibadgeScope extends IScope {
    vm: IDirectiveProperties;
}

class Controller implements ng.IController, IViewModel {
    DATE_FORMAT: typeof DATE_FORMAT;
    isAsc: boolean;
    label: string;
    isOpenLightbox: boolean;
    badgeToRevoke: BadgeAssigned;

    constructor(private $scope: IMinibadgeScope,
                private $location: ILocationService,
                private $window: IWindowService) {
        this.DATE_FORMAT = DATE_FORMAT;
        this.isAsc = true;
        this.isOpenLightbox = false;
    }

    $onInit() {
    }

    $onDestroy() {
    }

    openRevokeLightbox = (badgeGiven: BadgeAssigned) => {
        this.isOpenLightbox = true;
        this.badgeToRevoke = badgeGiven;
    }
    closeLightbox = () => {
        this.isOpenLightbox = false;
    }

    validRevoke = () => {
        this.$scope.vm.deleteFunction({badgeGiven: this.badgeToRevoke})
        this.isOpenLightbox = false;
    }

    onClick = (filterLabel: string) => {
        if (isFunction(this.$scope.vm.filterFunction)) {
            this.label === filterLabel ? this.isAsc = !this.isAsc : this.isAsc = true;
            this.label = filterLabel;
            this.$scope.vm.filterFunction({filterType: this.label, filterAsc: this.isAsc});
        }
    }

}

function directive(): IDirective {
    return {
        replace: true,
        restrict: 'E',
        templateUrl: `${RootsConst.directive}/badge-given-array/badge-given-array.html`,
        scope: {
            badgesGiven: '=',
            filterFunction: '&',
            deleteFunction: '&'
        },
        controllerAs: 'vm',
        bindToController: true,
        controller: ['$scope', '$location', '$window', Controller],
        /* interaction DOM/element */
        link: function (scope: ng.IScope,
                        element: ng.IAugmentedJQuery,
                        attrs: ng.IAttributes,
                        vm: ng.IController) {
        }
    }
}

export const minibadgeBadgeGivenArray = ng.directive('minibadgeBadgeGivenArray', directive);