import {ng,idiom as lang} from "entcore";
import {IDirective, ILocationService, IScope, IWindowService} from "angular";
import {RootsConst} from "../../core/constants/roots.const";
import {safeApply} from "../../utils/safe-apply.utils";

interface IViewModel {
    lang: typeof lang
}

interface IDirectiveProperties {
    onChange(): void;
    date: Date;
    label: string;
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
    }

    $onDestroy() {
    }
}

function directive(): IDirective {
    return {
        replace: true,
        restrict: 'E',
        templateUrl: `${RootsConst.directive}/periode-picker/periode-picker.html`,
        scope: {
            date:"=",
            label:"=",
            onChange:"&"
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

export const minibadgePeriodePicker = ng.directive('minibadgePeriodePicker', directive);