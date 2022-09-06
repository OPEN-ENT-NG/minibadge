import {idiom as lang, ng} from 'entcore';
import {RootsConst} from "../../core/constants/roots.const";
import {IScope, ITimeoutService} from "angular";

interface IViewModel {

    typing(): void;

    pausedTyping(): void;

    searchQuery: string;
    lang: typeof lang,
}

interface IMinibadgeScope extends IScope {
    vm: IViewModel;
}

class Controller implements ng.IController, IViewModel {
    private token: number;
    private typingTimeout: number;
    private onSearch: () => (query: string) => void;

    searchQuery: string;
    lang: typeof lang;

    constructor(private $scope: IMinibadgeScope, private $timeout: ITimeoutService) {
    }

    $onInit() {
        this.lang = lang;
    }

    private endTyping = (): void => {
        this.onSearch()(this.searchQuery);
        cancelAnimationFrame(this.token);
    }

    typing = (): void => {
        clearTimeout(this.typingTimeout);
        cancelAnimationFrame(this.token);
    }

    pausedTyping = (): void => {
        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(this.endTyping, 750);
    }

    $onDestroy() {
    }

}

function directive() {
    return {
        replace: true,
        restrict: 'E',
        templateUrl: `${RootsConst.directive}/search-input/search-input.html`,
        scope: {
            onSearch: '&',
            placeholder: '@?'
        },
        controllerAs: 'vm',
        bindToController: true,
        controller: ['$scope', '$timeout', Controller],
        /* interaction DOM/element */
        link: function (scope: ng.IScope,
                        element: ng.IAugmentedJQuery,
                        attrs: ng.IAttributes,
                        vm: ng.IController) {
        }
    }
}

export const searchInput = ng.directive('searchInput', directive)