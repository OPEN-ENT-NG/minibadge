import {ng} from "entcore";
import {RootsConst} from "../../core/constants/roots.const";
import {IDirective, IScope, isFunction} from "angular";

interface IViewModel {
    bodyClick(): void;

    isFunction: typeof isFunction;
}

interface IDirectiveProperties {
    onBodyClick?(): void;

    bodyIcon?: string;
    label?: string;
    isBodyDisabled?: boolean;
    isDisabled?: boolean;
    parentClass?: string;
    isBodyClickDefined?: boolean;
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

    bodyClick(): void {
        if (!this.$scope.vm.isDisabled && !this.$scope.vm.isBodyDisabled && isFunction(this.$scope.vm.onBodyClick))
            this.$scope.vm.onBodyClick()
    }

    $onDestroy() {
    }

}


function directive(): IDirective {
    return {
        replace: true,
        restrict: 'E',
        templateUrl: `${RootsConst.directive}/card/card.html`,
        scope: {
            parentClass: '=?',
            bodyIcon: '=?',
            label: '=?',
            isDisabled: '=?',
            isBodyDisabled: '=?',
            isBodyClickDefined: '=?',
            onBodyClick: '&?'
        },
        transclude: {
            body: '?containerBody',
            footer: '?containerFooter',
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

export const minibadgeCard = ng.directive('minibadgeCard', directive);