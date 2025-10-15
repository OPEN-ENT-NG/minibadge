import { IController, IDirective, IScope } from "angular";
import { ng } from "entcore";
import { RootsConst } from "../../core/constants/roots.const";
import { BadgeType } from "../../models/badge-type.model";
import { safeApply } from "../../utils/safe-apply.utils";

interface IViewModel {
    closeLightbox(): void;
    assignMyself(): void;
}

interface IDirectiveProperties {
    onAssignMyself: () => void;
    onClose: () => void;
    numberAssignable: number;
    isLightboxOpened: boolean;
    badgeType: BadgeType;
}

interface IMinibadgeScope extends IScope {
    vm: IDirectiveProperties;
}

class Controller implements IController, IViewModel {

    constructor(private $scope: IMinibadgeScope) {}

    closeLightbox(): void {
        this.$scope.vm.onClose();
        this.$scope.vm.isLightboxOpened = false;
        safeApply(this.$scope);
    }

    async assignMyself(): Promise<void> {
        if (this.$scope.vm.numberAssignable > 0) {
            this.$scope.vm.onAssignMyself();
            safeApply(this.$scope);
        }
    }
}


function directive(): IDirective {
    return {
        replace: true,
        restrict: "E",
        templateUrl: `${RootsConst.directive}/badge-assign-myself/badge-assign-myself.html`,
        scope: {
            onAssignMyself: "&",
            numberAssignable: "=",
            isLightboxOpened: "=",
            onClose: "&",
            badgeType: "="
        },
        controllerAs: "vm",
        bindToController: true,
        controller: ['$scope', Controller],
        /* interaction DOM/element */
        link: function (scope: ng.IScope,
                        element: ng.IAugmentedJQuery,
                        attrs: ng.IAttributes,
                        vm: ng.IController) {
        }
    };
}

export const minibadgeAssignMyself = ng.directive('minibadgeAssignMyself', directive);