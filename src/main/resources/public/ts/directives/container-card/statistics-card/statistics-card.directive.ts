import {idiom as lang, ng} from "entcore";
import {IDirective, IScope, ITranscludeFunction} from "angular";
import {RootsConst} from "../../../core/constants/roots.const";

interface IViewModel {
    lang: typeof lang;
}

interface IDirectiveProperties {
    label?: string;
    icon?: string;
}

interface IMinibadgeScope extends IScope {
    vm: IDirectiveProperties;
}

class Controller implements ng.IController, IViewModel {
    lang: typeof lang;

    constructor(private $scope: IMinibadgeScope, private $transclude: ITranscludeFunction) {
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
        templateUrl: `${RootsConst.directive}/container-card/statistics-card/statistics-card.html`,
        scope: {
            label: '=?',
            icon: '=?',
        },
        controllerAs: 'vm',
        bindToController: true,
        controller: ['$scope', '$transclude', Controller],
        /* interaction DOM/element */
        link: function (scope: ng.IScope,
                        element: ng.IAugmentedJQuery,
                        attrs: ng.IAttributes,
                        vm: ng.IController) {
        }
    }
}

export const minibadgeStatisticsCard = ng.directive('minibadgeStatisticsCard', directive);