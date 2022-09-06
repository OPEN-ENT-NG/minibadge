import {ng} from "entcore";
import {RootsConst} from "../../../core/constants/roots.const";
import {ILocationService, IScope, IWindowService} from "angular";

interface IViewModel {
    redirect(): void;

    label: string;
    viewPath: string;
    isSelected: boolean;
}

interface IMinibadgeScope extends IScope {
    vm: IViewModel;
}

class Controller implements ng.IController, IViewModel {
    label: string;
    viewPath: string;
    isSelected: boolean;

    constructor(private $scope: IMinibadgeScope,
                private $location: ILocationService,
                private $window: IWindowService) {
    }


    $onInit() {
    }

    $onDestroy() {
    }

    redirect = (): void => {
        this.$location.path(this.viewPath);
    }

}

function directive() {
    return {
        replace: true,
        restrict: 'E',
        templateUrl: `${RootsConst.directive}/navbar/navbar-item/navbar-item.html`,
        scope: {
            label: '=',
            viewPath: '=',
            isSelected: '='
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

export const navbarItem = ng.directive('navbarItem', directive)