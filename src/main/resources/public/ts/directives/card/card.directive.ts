import {ng} from "entcore";
import {RootsConst} from "../../core/constants/roots.const";
import {IDirective, IScope, isFunction} from "angular";
import {BadgeType} from "../../models/badge-type.model";
import {CARD_FOOTER} from "../../core/enum/card-footers.enum";

interface IViewModel {
    bodyClick(): void;

    CARD_FOOTER: typeof CARD_FOOTER;

}

interface IDirectiveProperties {
    onBodyClick?(badgeType: BadgeType): void;

    onFooterClick?(badgeType: BadgeType): void;

    footer?: CARD_FOOTER;
    badgeType: BadgeType;
}

interface IMinibadgeScope extends IScope {
    vm: IDirectiveProperties;
}

class Controller implements ng.IController, IViewModel {
    CARD_FOOTER: typeof CARD_FOOTER;

    constructor(private $scope: IMinibadgeScope) {
        this.CARD_FOOTER = CARD_FOOTER;
    }

    $onInit() {
    }

    bodyClick(): void {
        if (isFunction(this.$scope.vm.onBodyClick)) this.$scope.vm.onBodyClick(this.$scope.vm.badgeType)
    }

    $onDestroy() {
    }

}


function directive(): IDirective {
    return {
        replace: true,
        restrict: 'E',
        templateUrl: `${RootsConst.directive}/card/card.html`,
        scope: {
            badgeType: '=',
            footer: '=?',
            onBodyClick: '&?',
            onFooterClick: '&?'
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

export const minibadgeCardType = ng.directive('minibadgeCardType', directive);