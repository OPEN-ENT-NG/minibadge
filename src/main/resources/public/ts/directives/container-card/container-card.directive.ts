import {ng, idiom as lang} from "entcore";
import {IDirective, IScope} from "angular";
import {RootsConst} from "../../core/constants/roots.const";

interface IViewModel {
    lang: typeof lang;
}

interface IDirectiveProperties {
    label?: string;
    icon?: string;
    isTitleCentered?: boolean;
}

interface IMinibadgeScope extends IScope {
    vm: IDirectiveProperties;
}

class Controller implements ng.IController, IViewModel {
    lang: typeof lang;

    constructor(private $scope: IMinibadgeScope) {
        this.lang = lang;
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
        transclude: {
            title: '?containerTitle',
            body: '?containerBody',
        },
        templateUrl: `${RootsConst.directive}/container-card/container-card.html`,
        scope: {
            label: '=?',
            icon: '=?',
            isTitleCentered: '=?',
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

export const minibadgeContainerCard = ng.directive('minibadgeContainerCard', directive);