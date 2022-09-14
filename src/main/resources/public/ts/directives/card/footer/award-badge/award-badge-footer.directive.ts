import {ng} from "entcore";
import {IDirective} from "angular";
import {RootsConst} from "../../../../core/constants/roots.const";
import {BadgeType} from "../../../../models/badge-type.model";

interface IViewModel {
    badgeType: BadgeType;
}

class Controller implements ng.IController, IViewModel {
    badgeType: BadgeType;

    constructor() {
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
        templateUrl: `${RootsConst.directive}/card/footer/award-badge/award-badge-footer.html`,
        scope: {
            badgeType: '=',
            clickPath: '=?',
        },
        controllerAs: 'vm',
        bindToController: true,
        controller: [Controller],
        /* interaction DOM/element */
        link: function (scope: ng.IScope,
                        element: ng.IAugmentedJQuery,
                        attrs: ng.IAttributes,
                        vm: ng.IController) {
        }
    }
}

export const awardBadgeFooter = ng.directive('awardBadgeFooter', directive);