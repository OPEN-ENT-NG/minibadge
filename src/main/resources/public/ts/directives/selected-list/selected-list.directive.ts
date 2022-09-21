import {ng} from "entcore";
import {IDirective, IScope} from "angular";
import {RootsConst} from "../../core/constants/roots.const";

interface IViewModel {
    displayItem(item: any): string;

    removeItem(item: any): void;

    onDisplayItem(item: any): string;

    onRemoveItem(item: any): void;

    selectedList: any[];
}

interface IMinibadgeScope extends IScope {
    vm: IViewModel;
}

class Controller implements ng.IController, IViewModel {
    onDisplayItem: (item: any) => string;

    onRemoveItem: (item: any) => void;

    selectedList: any[];

    constructor(private $scope: IMinibadgeScope) {
    }

    displayItem = (item: any): string => this.onDisplayItem(item);

    removeItem = (item: any): void => this.onRemoveItem(item);


    $onInit() {
    }

    $onDestroy() {
    }

}

function directive(): IDirective {
    return {
        replace: true,
        restrict: 'E',
        templateUrl: `${RootsConst.directive}/selected-list/selected-list.html`,
        scope: {
            onDisplayItem: '=',
            onRemoveItem: '=',
            selectedList: '='
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

export const minibadgeSelectedList = ng.directive('minibadgeSelectedList', directive);