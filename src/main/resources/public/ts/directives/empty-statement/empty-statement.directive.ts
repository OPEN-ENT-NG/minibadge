import {ng, idiom as lang} from "entcore";
import {IDirective, ILocationService, IScope, IWindowService} from "angular";
import {RootsConst} from "../../core/constants/roots.const";

interface IViewModel {
    lang: typeof lang;
}


interface IDirectiveProperties {
    isDisplayed: boolean;
    emptyLabel: string;
}

interface IMinibadgeScope extends IScope {
    vm: IDirectiveProperties;
}

class Controller implements ng.IController, IViewModel {
    lang: typeof lang;

    constructor(private $scope: IMinibadgeScope,
                private $location: ILocationService,
                private $window: IWindowService) {
        this.lang = lang;
    }

    $onInit() {
        if (!this.$scope.vm.emptyLabel) this.$scope.vm.emptyLabel = "minibadge.default.empty.statement";
    }

    $onDestroy() {
    }

}

function directive(): IDirective {
    return {
        replace: true,
        restrict: 'E',
        templateUrl: `${RootsConst.directive}/empty-statement/empty-statement.html`,
        scope: {
            isDisplayed: '=',
            emptyLabel: '@?'
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

export const minibadgeEmptyStatement = ng.directive('minibadgeEmptyStatement', directive);