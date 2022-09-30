import {angular, idiom as lang, ng} from "entcore";
import {IAugmentedJQuery, IDirective, IScope, isFunction} from "angular";
import {RootsConst} from "../../../../core/constants/roots.const";
import {Badge} from "../../../../models/badge.model";
import {BadgeType} from "../../../../models/badge-type.model";
import {ActionOption} from "../../../../models/action-option.model";
import {safeApply} from "../../../../utils/safe-apply.utils";

interface IViewModel extends ng.IController {
    infoClick(): void;

    actionClick(actionOption: ActionOption): Promise<void>

    changeActionsShowingStatus?(): Promise<void>;

    lang: typeof lang;
    isActionOpened: boolean;
}

interface IDirectiveProperties {
    onInfoClick?(badgeType: BadgeType): void;

    badgeType: BadgeType;
    badge: Badge;
}

interface IMinibadgeScope extends IScope {
    vm: IDirectiveProperties;
}

class Controller implements IViewModel {
    lang: typeof lang;
    isActionOpened: boolean;

    constructor(private $scope: IMinibadgeScope) {
        this.lang = lang;
        this.isActionOpened = false;
    }

    $onInit() {
    }

    infoClick(): void {
        if (isFunction(this.$scope.vm.onInfoClick)) this.$scope.vm.onInfoClick(this.$scope.vm.badgeType)
    }

    async actionClick(actionOption: ActionOption): Promise<void> {
        await actionOption.action();
        this.isActionOpened = false;
        safeApply(this.$scope);
    }

    $onDestroy() {
    }

}


function directive(): IDirective {
    return {
        replace: true,
        restrict: 'E',
        templateUrl: `${RootsConst.directive}/card/footer/badge-detail/badge-detail-footer.html`,
        scope: {
            badgeType: '=',
            badge: '=',
            onInfoClick: '&?'
        },
        controllerAs: 'vm',
        bindToController: true,
        controller: ['$scope', Controller],
        /* interaction DOM/element */
        link: function (scope: ng.IScope,
                        element: ng.IAugmentedJQuery,
                        attrs: ng.IAttributes,
                        vm: IViewModel) {
            $(document).bind('click', (event: JQueryEventObject): void => {
                if (!element.find(event.target).length && vm.isActionOpened)
                    vm.isActionOpened = false;
                safeApply(scope);
            });

            let repositionActionOptions = (): void => {
                let windowElem: IAugmentedJQuery = angular.element(window);
                let actionOptionsElem: IAugmentedJQuery =
                    angular.element(element.find('div.minibadge-action-options'));
                let repositionClass: string = 'minibadge-reposition';
                // if element position element is left sided, we want to check right sided position to see if it goes
                // out of the screen, so we add 2 times the element width.
                let actionOptionX: number =
                    actionOptionsElem.offset().left +
                    (actionOptionsElem.width() * (actionOptionsElem.hasClass(repositionClass) ? 2 : 1));

                if (actionOptionX >= windowElem.width() && !actionOptionsElem.hasClass(repositionClass))
                    actionOptionsElem.addClass(repositionClass);
                else if (actionOptionX < windowElem.width() && actionOptionsElem.hasClass(repositionClass))
                    actionOptionsElem.removeClass(repositionClass)
            }

            angular.element(window).bind('resize', async (): Promise<void> => {
                await safeApply(scope); // waiting dom recalculate
                repositionActionOptions();
            });

            vm.changeActionsShowingStatus = async (): Promise<void> => {
                vm.isActionOpened = !vm.isActionOpened;
                await safeApply(scope); // waiting dom recalculate
                if (vm.isActionOpened) repositionActionOptions();
            }
        }
    }
}

export const badgeDetailFooter = ng.directive('badgeDetailFooter', directive);