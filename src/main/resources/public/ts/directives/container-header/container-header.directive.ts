import {ng, idiom as lang} from "entcore";
import {IDirective, IScope} from "angular";
import {RootsConst} from "../../core/constants/roots.const";
import {ContainerHeader} from "../../models/container-header.model";
import {ActionOption} from "../../models/action-option.model";
import {safeApply} from "../../utils/safe-apply.utils";

interface IViewModel {
    buttonClick(actionOption: ActionOption): Promise<void>;

    lang: typeof lang;
}

interface IDirectiveProperties {
    containerHeader?: ContainerHeader;
    openChartLightbox(): void;
}

interface IMinibadgeScope extends IScope {
    vm: IDirectiveProperties;
}

class Controller implements ng.IController, IViewModel {
    lang: typeof lang = lang;

    constructor(private $scope: IMinibadgeScope) {
    }

    $onInit() {
    }

    async buttonClick(actionOption: ActionOption): Promise<void> {
        await actionOption.action();
        safeApply(this.$scope);
    }

    $onDestroy() {
    }

}

function directive(): IDirective {
    return {
        replace: true,
        restrict: 'E',
        templateUrl: `${RootsConst.directive}/container-header/container-header.html`,
        scope: {
            openChartLightbox: '&',
            containerHeader: '=?'
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

export const minibadgeContainerHeader = ng.directive('minibadgeContainerHeader', directive);