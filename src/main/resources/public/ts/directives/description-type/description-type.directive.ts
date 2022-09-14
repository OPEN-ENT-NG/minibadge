import {ng} from "entcore";
import {IDirective, ILocationService, IScope, IWindowService} from "angular";
import {RootsConst} from "../../core/constants/roots.const";
import {BadgeType} from "../../models/badge-type.model";

interface IViewModel {
    badgeType: BadgeType;
}

interface IMinibadgeScope extends IScope {
    vm: IViewModel;
}

class Controller implements ng.IController, IViewModel {
    badgeType: BadgeType;

    constructor(private $scope: IMinibadgeScope,
                private $location: ILocationService,
                private $window: IWindowService) {
    }

    $onInit() {
    }

    $onDestroy() {
    }

}

function directive(): IDirective {
    return {
        replace: true,
        restrict: 'E',
        templateUrl: `${RootsConst.directive}/description-type/description-type.html`,
        scope: {
            badgeType: '='
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

export const minibadgeDescriptionType = ng.directive('minibadgeDescriptionType', directive);