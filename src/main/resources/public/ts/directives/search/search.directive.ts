import {idiom as lang, ng} from 'entcore';
import {IScope} from "angular";
import {RootsConst} from "../../core/constants/roots.const";

interface IViewModel {
    lang: typeof lang;

}

interface IDirectiveProperties {
    onSearch(): void;

    onDisplayResult(result: any): string;

    onSelectResult(result: any): void;

    placeholder?: string;
    results: any[];
    searchQuery: string;
}

interface IMinibadgeScope extends IScope {
    vm: IDirectiveProperties;
}

class Controller implements ng.IController, IViewModel {
    lang: typeof lang;

    constructor(private $scope: IMinibadgeScope) {
    }

    $onInit() {
        this.lang = lang;
    }

    $onDestroy() {
    }

}

function directive() {
    return {
        replace: true,
        restrict: 'E',
        templateUrl: `${RootsConst.directive}/search/search.html`,
        scope: {
            onSearch: '&',
            onDisplayResult: '&',
            onSelectResult: '&',
            placeholder: '@?',
            results: "=",
            searchQuery: "=",
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

export const minibadgeSearch = ng.directive('minibadgeSearch', directive)