import {ng} from "entcore";
import {RootsConst} from "../../core/constants/roots.const";
import {IDirective, ILocationService} from "angular";
import {BadgeType} from "../../models/badge-type.model";
import {CARD_FOOTER} from "../../core/enum/card-footers.enum";

interface IViewModel {
    clickRedirect(): void;

    CARD_FOOTER: typeof CARD_FOOTER;
    footer?: CARD_FOOTER;
    badgeType: BadgeType;
    clickPath?: string;
}

class Controller implements ng.IController, IViewModel {
    CARD_FOOTER: typeof CARD_FOOTER;
    footer?: CARD_FOOTER;
    badgeType: BadgeType;
    clickPath?: string;

    constructor(private $location: ILocationService) {
        this.CARD_FOOTER = CARD_FOOTER;
    }

    $onInit() {
    }

    clickRedirect(): void {
        if (this.clickPath) this.$location.path(this.clickPath);
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
            clickPath: '=?',
            footer: '=?'
        },
        controllerAs: 'vm',
        bindToController: true,
        controller: ['$location', Controller],
        /* interaction DOM/element */
        link: function (scope: ng.IScope,
                        element: ng.IAugmentedJQuery,
                        attrs: ng.IAttributes,
                        vm: ng.IController) {
        }
    }
}

export const minibadgeCardType = ng.directive('minibadgeCardType', directive);