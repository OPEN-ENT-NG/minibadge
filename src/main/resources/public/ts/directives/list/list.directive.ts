import {ng} from "entcore";
import {IDirective, IScope, isFunction} from "angular";
import {RootsConst} from "../../core/constants/roots.const";
import {IDisplayItem} from "../../models/display-list.model";

interface IViewModel {
    isFunction: typeof isFunction;
}

interface IDirectiveProperties {
    items: IDisplayItem[];
}

interface IMinibadgeScope extends IScope {
    vm: IDirectiveProperties;
}

class Controller implements ng.IController, IViewModel {
    isFunction: typeof isFunction = isFunction;

    constructor(private $scope: IMinibadgeScope) {
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
        templateUrl: `${RootsConst.directive}/list/list.html`,
        scope: {
            items: '=',
        },
        transclude: {
            display: '?itemDisplay',
            distinction: '?itemDistinction',
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

export const minibadgeList = ng.directive('minibadgeList', directive);