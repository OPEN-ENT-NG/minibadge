import {ng} from "entcore";
import {IDirective, IScope, isFunction} from "angular";
import {RootsConst} from "../../core/constants/roots.const";
import {safeApply} from "../../utils/safe-apply.utils";

interface IViewModel {
    closeLightbox(): void;

    changeChartAcceptationStatus(): void;

    validChart(): Promise<void>;

}

interface IDirectiveProperties {
    chartValidate(): Promise<void>;

    onClose?(): void;

    isLightboxOpened: boolean;
    isMinibadgeAccepted: boolean;
    isChartAccepted: boolean;
}

interface IMinibadgeScope extends IScope {
    vm: IDirectiveProperties;
}

class Controller implements ng.IController, IViewModel {

    constructor(private $scope: IMinibadgeScope) {
    }

    $onInit() {
        if (this.$scope.vm.isMinibadgeAccepted == undefined) this.$scope.vm.isMinibadgeAccepted = false;
        if (this.$scope.vm.isChartAccepted == undefined) this.$scope.vm.isChartAccepted = false;
    }

    closeLightbox(): void {
        if (isFunction(this.$scope.vm.onClose)) this.$scope.vm.onClose();
        this.$scope.vm.isLightboxOpened = false;
        safeApply(this.$scope);
    }

    changeChartAcceptationStatus(): void {
        if (!this.$scope.vm.isChartAccepted) this.$scope.vm.isMinibadgeAccepted = false;
        safeApply(this.$scope);
    }

    async validChart(): Promise<void> {
        this.$scope.vm.chartValidate()
            .then(() => this.closeLightbox());
    }

    $onDestroy() {
    }

}

function directive(): IDirective {
    return {
        replace: true,
        restrict: 'E',
        templateUrl: `${RootsConst.directive}/chart/chart.html`,
        scope: {
            isLightboxOpened: '=',
            isChartAccepted: '=',
            isMinibadgeAccepted: '=',
            chartValidate: '&',
            onClose: '&?',
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

export const minibadgeChart = ng.directive('minibadgeChart', directive);