import {idiom as lang, ng} from "entcore";
import {IDirective, IScope} from "angular";
import {RootsConst} from "../../core/constants/roots.const";
import {User} from "../../models/user.model";
import {Paging} from "../../models/paging.model";

interface IViewModel {
    lang: typeof lang;
}

interface IDirectiveProperties {
    userPrecision?(): string;

    pageChange(): void;

    users: User[];
    label: string;
    listDistinction: string;
    usersPaging: Paging;
}

interface IMinibadgeScope extends IScope {
    vm: IDirectiveProperties;
}

class Controller implements ng.IController, IViewModel {
    lang: typeof lang;

    constructor(private $scope: IMinibadgeScope) {
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
        templateUrl: `${RootsConst.directive}/user-list/user-list.html`,
        scope: {
            users: '=',
            label: '=',
            listDistinction: '=',
            usersPaging: '=',
            pageChange: '&',
            userPrecision: '&?'
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

export const minibadgeUserList = ng.directive('minibadgeUserList', directive);