import {Behaviours, idiom as lang, notify} from "entcore"
import {
    badgeAssignedService,
    badgeTypeService,
    IBadgeAssignedService,
    IBadgeTypeService,
    IUserService,
    userService
} from "../services";
import {safeApply} from "../utils/safe-apply.utils";
import {AxiosError} from "axios";
import {IScope} from "angular";
import {IUserPayload, User} from "../models/user.model";
import {Subscription} from "rxjs";
import {MINIBADGE_APP} from "../minibadgeBehaviours";
import {IBadgeAssignedPayload} from "../models/badge-assigned.model";
import {BadgeType} from "../models/badge-type.model";
import {Setting} from "../models/setting.model";

interface IViewModel {
    closeLightbox(): void;

    onSearchUser(): Promise<void>;

    displayUser(user: User): string;

    removeUser(user: User): void;

    onSelectUser(user: User): void;

    assign(): Promise<void>;

    $scope: IMinibadgeScope;
    userService: IUserService;
    userPayload: IUserPayload;
    userSearchResults: User[];
    userSelected: User[];
    badgeAssignedPayload: IBadgeAssignedPayload;
    isLightBoxOpened: boolean;
    badgeType: BadgeType;
    searchQuery: string;
}

interface IMinibadgeScope extends IScope {
    vm: IViewModel;
    setting: Setting;
}

class ViewModel implements IViewModel {
    $scope: IMinibadgeScope;
    userService: IUserService;
    userPayload: IUserPayload;
    userSearchResults: User[];
    userSelected: User[];
    badgeAssignedService: IBadgeAssignedService;
    badgeAssignedPayload: IBadgeAssignedPayload;
    isLightBoxOpened: boolean;
    badgeType: BadgeType;
    searchQuery: string;

    subscriptions: Subscription = new Subscription();

    constructor($scope: IMinibadgeScope, badgeTypeService: IBadgeTypeService, userService: IUserService,
                badgeAssignedService: IBadgeAssignedService) {
        this.$scope = $scope;
        this.userService = userService;
        this.badgeAssignedService = badgeAssignedService;
        this.isLightBoxOpened = !!this.isLightBoxOpened;

        this.userSelected = []
        this.userPayload = {query: ''};
        this.badgeAssignedPayload = {ownerIds: []};

        this.subscriptions.add(Behaviours.applicationsBehaviours[MINIBADGE_APP].snipletBadgeAssignService
            .getBadgeTypeSubject()
            .subscribe((badgeType: BadgeType) => {
                this.badgeType = badgeType;
                this.isLightBoxOpened = true;
                safeApply(this.$scope);
            }));

        this.subscriptions.add(Behaviours.applicationsBehaviours[MINIBADGE_APP].snipletBadgeAssignService
            .getBadgeTypeIdSubject()
            .subscribe((badgeTypeId: number) => {
                badgeTypeService.getBadgeType(badgeTypeId)
                    .then((data: BadgeType) => {
                        if (data) {
                            this.badgeType = data;
                            this.isLightBoxOpened = true;
                        }
                        safeApply(this.$scope);
                    })
                    .catch((err: AxiosError) => notify.error('minibadge.error.get.badge.type'));
            }));

        this.$scope.$parent.$on("$destroy", () => {
            this.subscriptions.unsubscribe();
        });
    }

    private isUserSelected = (userA: User): boolean => !!this.userSelected.find(((userB: User) => userA.id === userB.id))

    closeLightbox = (): void => {
        this.badgeType = null;
        this.userPayload = {query: ''};
        this.badgeAssignedPayload = {ownerIds: []}
        this.userSearchResults = null;
        this.userSelected = [];
        this.isLightBoxOpened = false;
        safeApply(this.$scope);
    }

    onSearchUser = async (): Promise<void> => {
        this.userPayload.query = this.searchQuery;
        if (this.searchQuery && this.searchQuery.trim() != '')
            this.userService.searchUsers(this.userPayload)
                .then((data: User[]) => {
                    if (data) this.userSearchResults = data
                        .filter((user: User) => !this.isUserSelected(user));
                    safeApply(this.$scope);
                })
                .catch((err: AxiosError) => notify.error('minibadge.error.search.users'))
        else {
            this.userSearchResults = null;
            safeApply(this.$scope);
        }
    }

    displayUser = (user: User): string => {
        return user.getDisplayName();
    }

    removeUser = (userA: User): void => {
        this.userSelected = this.userSelected.filter((userB: User) => userA.id != userB.id);
    }

    onSelectUser = (user: User): void => {
        if (!this.isUserSelected(user))
            this.userSelected.push(user);
        this.userSearchResults = null;
        this.searchQuery = '';
        safeApply(this.$scope);
    }

    assign = async (): Promise<void> => {
        if (this.userSelected && this.userSelected.length > 0) {
            this.badgeAssignedPayload.ownerIds = this.userSelected.map((user: User) => user.id);
            this.badgeAssignedService.assign(this.badgeType.id, this.badgeAssignedPayload)
                .then(() => {
                    this.$scope.setting.incrementAssignationsNumbers(this.userSelected.length);
                    notify.success('minibadge.success.assign')
                    this.closeLightbox();
                    safeApply(this.$scope);
                })
                .catch((err: AxiosError) => notify.error('minibadge.error.assign'))
        }
    }
}

export const minibadgeBadgeAssign = {
    title: 'minibadge.badge-assign',
    public: false,
    that: null,
    controller: {
        init: function (): void {
            lang.addBundle('/minibadge/i18n', async () => {
                this.vm = new ViewModel(this, badgeTypeService, userService, badgeAssignedService);
            });
        }
    }
};