import {ng} from "entcore";
import {RootsConst} from "../../core/constants/roots.const";
import {IDirective, IScope} from "angular";
import {BadgeType} from "../../models/badge-type.model";
import {translate} from "../../utils/string.utils";

interface IViewModel {
    translate: typeof translate;
}

interface IDirectiveProperties {
    badgeType: BadgeType;
}

interface IMinibadgeScope extends IScope {
    vm: IDirectiveProperties;
}

class Controller implements ng.IController, IViewModel {

    translate: typeof translate = translate;

    constructor(private $scope: IMinibadgeScope) {
    }

    $onInit() {
    }

    $onDestroy() {
    }

}


function directive(): IDirective {
    return {
        // replace: true,
        restrict: 'E',
        templateUrl: `${RootsConst.directive}/card/card-type-stat.html`,
        scope: {
            badgeType: '=',
        },
        controllerAs: 'vm',
        bindToController: true,
        controller: ['$scope', Controller],
        /* interaction DOM/element */
        link: function (scope: ng.IScope,
                        element: ng.IAugmentedJQuery,
                        attrs: ng.IAttributes,
                        vm: ng.IController) {
        }
    }
}

export const minibadgeCardTypeStatistic = ng.directive('minibadgeCardTypeStatistic', directive);