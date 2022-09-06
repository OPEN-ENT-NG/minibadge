import {idiom as lang, ng} from "entcore";
import {RootsConst} from "../../core/constants/roots.const";
import {ILocationService, IScope, IWindowService} from "angular";
import {NAVBAR_VIEWS} from "../../core/enum/navbar.enum";

interface IViewModel {
    isSelected(navbarView: NAVBAR_VIEWS): boolean;

    lang: typeof lang;
    NAVBAR_VIEWS: typeof NAVBAR_VIEWS;
    navbarViewSelected: NAVBAR_VIEWS;
}

interface IMinibadgeScope extends IScope {
    vm: IViewModel;
}

class Controller implements ng.IController, IViewModel {
    lang: typeof lang;
    NAVBAR_VIEWS: typeof NAVBAR_VIEWS;
    navbarViewSelected: NAVBAR_VIEWS;

    constructor(private $scope: IMinibadgeScope,
                private $location: ILocationService,
                private $window: IWindowService) {
    }

    $onInit() {
        this.lang = lang;
        this.NAVBAR_VIEWS = NAVBAR_VIEWS;
    }

    $onDestroy() {
    }

    isSelected = (navbarView: NAVBAR_VIEWS): boolean => navbarView === this.navbarViewSelected;

}

function directive() {
    return {
        restrict: 'E',
        templateUrl: `${RootsConst.directive}/navbar/navbar.html`,
        scope: {
            navbarViewSelected: '=',
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

export const minibadgeNavbar = ng.directive('minibadgeNavbar', directive)