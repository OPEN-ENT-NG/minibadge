import { IController, IDirective, IScope } from "angular";
import { ng } from "entcore";
import { RootsConst } from "../../core/constants/roots.const";
import { User } from "../../models/user.model";
import { safeApply } from "../../utils/safe-apply.utils";
import { translate } from "../../utils/string.utils";

interface IViewModel {
    closeRevokeUsersModal(): void;
    openConfirmRevokeUsersModal(): void;
    closeConfimRevokeUsersModal(): void;
    confirmRevokeUsers(): void;
    selectUser(user: User): void;
    translate: typeof translate;
    searchUser(): void;
    displayUser(user: User): string;
}

interface IDirectiveProperties {
    onCloseRevokeUsersModal: () => void;
    onOpenConfirmRevokeUsersModal: () => void;
    onCloseConfirmRevokeUsersModal: () => void;
    onConfirmRevokeUsers: () => Promise<void>;
    onSelectUser: (user: User) => void;
    onRemoveUser: (user: User) => void;
    onSearchUser(): Promise<void>;
    selectedUsers: User[];
    isRevokeUsersModalOpen: boolean;
    isConfirmRevokeUsersModalOpen: boolean;
    search: string;
    results: User[] | null;
}

interface IMinibadgeScope extends IScope {
    vm: IDirectiveProperties;
}

class Controller implements IController, IViewModel {

    translate: typeof translate = translate;

    constructor(private $scope: IMinibadgeScope) {}

    closeRevokeUsersModal(): void {
        this.$scope.vm.onCloseRevokeUsersModal()
        this.$scope.vm.isRevokeUsersModalOpen = false;
        safeApply(this.$scope);
    }

    openConfirmRevokeUsersModal(): void {
        this.$scope.vm.onOpenConfirmRevokeUsersModal();
        this.$scope.vm.isConfirmRevokeUsersModalOpen = true;
        safeApply(this.$scope);
    }

    closeConfimRevokeUsersModal(): void {
        this.$scope.vm.onCloseConfirmRevokeUsersModal();
        this.$scope.vm.isConfirmRevokeUsersModalOpen = false;
        safeApply(this.$scope);
    }

    async confirmRevokeUsers(): Promise<void> {
        this.$scope.vm.onConfirmRevokeUsers();
        safeApply(this.$scope);
    }

    selectUser(user: User) : void {
        this.$scope.vm.onSelectUser(user);
        safeApply(this.$scope);
    }

    displayUser = (user: User) : string => {
        return user.getDisplayName() + 
            (user.minibadgeUserState ? 
                " (" + translate(`minibadge.${user.minibadgeUserState?.toLowerCase()}`) + ")" : 
                ""
            );
    } 

    searchUser(): void {
        this.$scope.vm.onSearchUser();
        safeApply(this.$scope);
    }
}

function directive(): IDirective {
    return {
        replace: true,
        restrict: "E",
        templateUrl: `${RootsConst.directive}/revoke-users/revoke-users.html`,
        scope: {
            onOpenRevokeUsersModal: "&",
            onCloseRevokeUsersModal: "&",
            onOpenConfirmRevokeUsersModal: "&",
            onCloseConfirmRevokeUsersModal: "&",
            onConfirmRevokeUsers: "&",
            onSelectUser: "=",
            onRemoveUser: "=",
            onSearchUser: "&",
            selectedUsers: "=",
            isRevokeUsersModalOpen: "=",
            isConfirmRevokeUsersModalOpen: "=",
            search: "=",
            results: "="
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

export const minibadgeRevokeUsers = ng.directive('minibadgeRevokeUsers', directive);