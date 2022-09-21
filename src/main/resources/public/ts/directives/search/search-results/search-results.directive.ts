import {idiom as lang, ng} from 'entcore';
import {RootsConst} from "../../../core/constants/roots.const";
import {IScope} from "angular";

interface IViewModel {
    lang: typeof lang;
}

interface IDirectiveProperties {
    onDisplayResult(result: any): string;

    onSelectResult(result: any): void;

    results: any[];
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
        templateUrl: `${RootsConst.directive}/search/search-results/search-results.html`,
        scope: {
            results: '=',
            onDisplayResult: '&',
            onSelectResult: '&'
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

export const searchResults = ng.directive('searchResults', directive)