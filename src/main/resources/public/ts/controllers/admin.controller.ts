import { idiom as lang, moment, ng, notify } from 'entcore';

import { ILocationService, IScope } from "angular";
import { AxiosError } from 'axios';
import { DATE_FORMAT } from "../core/enum/date.enum";
import { BadgeAssigned, IBadgeAllPayload } from "../models/badge-assigned.model";
import { Setting } from "../models/setting.model";
import { User } from '../models/user.model';
import { IBadgesAllService, IRevokeUsersService, IUserService } from '../services';
import { safeApply } from "../utils/safe-apply.utils";


interface ViewModel {
    onOpenRevokeUsersModal(): void;
    onCloseRevokeUsersModal(): void;
    onOpenConfirmRevokeUsersModal(): void;
    onCloseConfirmRevokeUsersModal(): void;
    onConfirmRevokeUsers(): Promise<void>;
    onSelectUser(user: User): void;
    removeUser(user: User): void;
    onSearchUser(): Promise<void>;
    
    startDate: Date;
    endDate: Date;
    labelTo: string
    labelFrom: string
    searchQuery: string;
    badges: BadgeAssigned[];
    payload: IBadgeAllPayload;
    isRevokeUsersModalOpen: boolean;
    isConfirmRevokeUsersModalOpen: boolean;
    selectedUsers: User[];
    searchUserToRevoke: string;
    userSearchResults: User[] | null;
}


interface IMinibadgeScope extends IScope {
    vm: ViewModel;
    setting: Setting;
}

class Controller implements ng.IController, ViewModel {

    badges: BadgeAssigned[] = [];
    payload = {
        query: "",
        startDate: "",
        endDate: "",
        sortType: "",
        sortAsc: true,
    };
    startDate: Date;
    endDate: Date;
    labelTo: string;
    labelFrom: string;
    searchQuery: string = "";
    searchUserToRevoke: string = "";
    userSearchResults: User[] | null = null;
    selectedUsers: User[] = [];
    isRevokeUsersModalOpen: boolean = false;
    isConfirmRevokeUsersModalOpen: boolean = false;

    constructor(private $scope: IMinibadgeScope,
                private $location: ILocationService,
                private BadgesAllService: IBadgesAllService,
                private userService: IUserService,
                private revokeService: IRevokeUsersService
            ) {
        this.endDate = new Date();
        this.startDate = moment().subtract('months', 1).toDate();
        this.labelTo = "minibadge.periode.date.to";
        this.labelFrom = "minibadge.periode.date.from";
        this.$scope.vm = this;
    }

    filterBadges = async (sortLabel: string, isAsc: boolean) => {
        //need to wait directives changes
        await safeApply(this.$scope);
        this.payload.sortType = lang.translate(sortLabel);
        this.payload.sortAsc = isAsc;
        this.initAllBadges();
    }

    onSearchUser = async (): Promise<void> => {
        if (this.searchUserToRevoke && this.searchUserToRevoke.trim() != '') {
            this.userService.searchUsersToRevoke({query: this.searchUserToRevoke})
                .then((data: User[]) => {
                    if(data) this.userSearchResults = data.filter((user: User) => !this.isUserSelected(user));
                    safeApply(this.$scope);
                })
                .catch((err: AxiosError) => notify.error('minibadge.error.search.users'))
        }
        else {
            this.userSearchResults = null;
            safeApply(this.$scope);
        }
    }

    private isUserSelected = (userA: User): boolean => !!this.selectedUsers.find(((userB: User) => userA.id === userB.id));
    
    onSelectUser = (user: User): void => {
        if (!this.isUserSelected(user))
            this.selectedUsers.push(user);
        this.userSearchResults = null;
        this.searchUserToRevoke = '';
        safeApply(this.$scope);
    }

    removeUser = (userA: User): void => {
        this.selectedUsers = this.selectedUsers.filter((userB: User) => userA.id != userB.id);
    }

    $onInit() {
        this.initAllBadges();
    }

    onOpenRevokeUsersModal = (): void => {
        this.isRevokeUsersModalOpen = true;
    }

    onCloseRevokeUsersModal = (): void => {
        this.isRevokeUsersModalOpen = false;
        this.selectedUsers = [];
        this.searchUserToRevoke = "";
        this.userSearchResults = null;
    }

    onOpenConfirmRevokeUsersModal = (): void => {
        this.isConfirmRevokeUsersModalOpen = true;
    }

    onCloseConfirmRevokeUsersModal = (): void => {
        this.isConfirmRevokeUsersModalOpen = false;
    }

    onConfirmRevokeUsers = async (): Promise<void> => {
        this.revokeService.revokeUsers({userIds: this.selectedUsers.map(user => user.id)})
            .then(() => {
                this.onCloseConfirmRevokeUsersModal();
                this.onCloseRevokeUsersModal();
                notify.success('minibadge.confirm.revoke.users.success')
                safeApply(this.$scope);
            })
            .catch((err: AxiosError) => notify.error('minibadge.confirm.revoke.users.error'))
    }

    private async initAllBadges() {
        //need to wait directives changes
        await safeApply(this.$scope)
        this.badges = [];
        this.payload.query = this.searchQuery;
        if (this.startDate && this.endDate) {
            this.payload.startDate = moment(this.startDate).format(DATE_FORMAT.DAY_MONTH_YEAR_MOMENT);
            this.payload.endDate = moment(this.endDate).format(DATE_FORMAT.DAY_MONTH_YEAR_MOMENT);
        }
        await this.BadgesAllService.getAllBadges(this.payload).then(
            (data: BadgeAssigned[]) => {
                if (data && data.length > 0) {
                    this.badges.push(...data);
                }
                safeApply(this.$scope);
            }
        );
    }

    $onDestroy() {
    }
}

export const adminController = ng.controller('AdminController',
    ['$scope', '$location', 'BadgesAllService', 'UserService', 'RevokeUsersService', Controller]);