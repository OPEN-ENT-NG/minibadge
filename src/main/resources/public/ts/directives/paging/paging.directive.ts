import {ng} from "entcore";
import {IDirective, IScope} from "angular";
import {RootsConst} from "../../core/constants/roots.const";
import {Paging} from "../../models/paging.model";

interface IViewModel {
    increasePage(): Promise<void>;

    decreasePage(): Promise<void>;
}

interface IDirectiveProperties {
    onChange(): Promise<void>;

    paging: Paging;
}

interface IMinibadgeScope extends IScope {
    vm: IDirectiveProperties;
}

class Controller implements ng.IController, IViewModel {
    constructor(private $scope: IMinibadgeScope) {
    }

    increasePage = async (): Promise<void> => {
        this.$scope.vm.paging.page++;
        await this.$scope.vm.onChange();
    };

    decreasePage = async (): Promise<void> => {
        this.$scope.vm.paging.page--;
        await this.$scope.vm.onChange();
    };

    $onInit() {
    }

    $onDestroy() {
    }

}

function directive(): IDirective {
    return {
        replace: true,
        restrict: 'E',
        templateUrl: `${RootsConst.directive}/paging/paging.html`,
        scope: {
            paging: '=',
            onChange: '&',
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

export const minibadgePaging = ng.directive('minibadgePaging', directive);