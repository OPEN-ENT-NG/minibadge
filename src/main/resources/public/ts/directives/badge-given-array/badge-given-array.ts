import {ng} from "entcore";
import {IDirective, ILocationService, IScope, isFunction, IWindowService} from "angular";
import {RootsConst} from "../../core/constants/roots.const";
import {DATE_FORMAT} from "../../core/enum/date.enum";
import {BadgeType} from "../../models/badge-type.model";
import {CARD_FOOTER} from "../../core/enum/card-footers.enum";
import {BadgeAssigned} from "../../models/badge-assigned.model";


interface IViewModel {
    DATE_FORMAT: typeof DATE_FORMAT;
    isAsc: boolean;
    label: string;
}


interface IDirectiveProperties {
    filterFunction?({filterType: string, filterAsc: boolean}): void;

    badgesGiven: BadgeAssigned[];
}

interface IMinibadgeScope extends IScope {
    vm: IDirectiveProperties;
}

class Controller implements ng.IController, IViewModel {
    DATE_FORMAT: typeof DATE_FORMAT;
    isAsc: boolean;
    label: string;

    constructor(private $scope: IMinibadgeScope,
                private $location: ILocationService,
                private $window: IWindowService) {
        this.DATE_FORMAT = DATE_FORMAT;
        this.isAsc = true;
    }

    $onInit() {
    }

    $onDestroy() {
    }

    onClick = (filterLabel: string) => {
        if (isFunction(this.$scope.vm.filterFunction)) {
            this.label === filterLabel ? this.isAsc = !this.isAsc : this.isAsc = true
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