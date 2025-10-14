import { Behaviours, ng, notify } from 'entcore';

import { ILocationService, IScope } from "angular";
import { CARD_FOOTER } from "../core/enum/card-footers.enum";
import { MINIBADGE_APP } from "../minibadgeBehaviours";
import { BadgeCategory } from '../models/badge-category.model';
import { BadgeType, IBadgeTypesPayload } from "../models/badge-type.model";
import { Setting } from "../models/setting.model";
import { IBadgeTypeService } from "../services";
import { IBadgeCategoryService } from '../services/badge-category.service';
import { safeApply } from "../utils/safe-apply.utils";
import { unaccent } from "../utils/string.utils";


interface ViewModel {
    getBadgeTypes(): Promise<void>;

    initBadgeTypes(): Promise<void>;

    onScroll(): Promise<void>;

    redirectBadgeType(badgeType: BadgeType): void;

    onOpenLightbox(badgeType: BadgeType): void;

    badgeTypes: BadgeType[];
    badgeCategories: BadgeCategory[];
    getCardFooter: string;
    searchQuery: string;
    selectedCategory: BadgeCategory | null;
}

interface IMinibadgeScope extends IScope {
    vm: ViewModel;
    setting: Setting;
}

class Controller implements ng.IController, ViewModel {
    private payload: IBadgeTypesPayload;
    badgeTypes: BadgeType[];
    badgeCategories: BadgeCategory[];
    searchQuery: string;
    selectedCategory: BadgeCategory | null;
    getCardFooter: string;

    constructor(private $scope: IMinibadgeScope,
                private $location: ILocationService,
                private badgeTypeService: IBadgeTypeService,
                private badgeCategoryService: IBadgeCategoryService
            ) {
        this.$scope.vm = this;
        this.payload = {
            offset: 0,
        };
        this.selectedCategory = null;
        this.getCardFooter = this.$scope.setting.userPermissions.canAssign() ? CARD_FOOTER.AWARD_BADGE : null;
    }

    $onInit() {
        this.initBadgeCategories();
        this.initBadgeTypes();
    }

    getBadgeCategories = async (): Promise<void> => {
        this.badgeCategoryService.getBadgeCategories()
            .then((data: BadgeCategory[]) => {
                this.badgeCategories = this.orderCategoriesByName(data);
                safeApply(this.$scope);
            })
            .catch(() => notify.error('minibadge.error.get.badge.categories'));
    }

    private orderCategoriesByName = (categories: BadgeCategory[]): BadgeCategory[] => {
        return categories.sort((a, b) => unaccent(a.name).localeCompare(unaccent(b.name)));
    }

    resetBadgeCategories = (): void => {
        this.badgeCategories = [];
    }

    initBadgeCategories = async (): Promise<void> => {
        this.resetBadgeCategories();
        await this.getBadgeCategories();
    }

    toggleCategory = (category: BadgeCategory): void => {
        if (this.selectedCategory?.id === category.id) {
            this.selectedCategory = null;
        } else {
            this.selectedCategory = category;
        }
        // évite le clignotement du vidage de la liste des badges
        setTimeout(() => {
            this.initBadgeTypes();
        }, 50);
    }

    resetBadgeTypes = (): void => {
        this.payload.offset = 0;
        this.badgeTypes = [];
    }

    getBadgeTypes = async (): Promise<void> => {
        this.badgeTypeService.getBadgeTypes(this.payload)
            .then((data: BadgeType[]) => {
                if (data && data.length > 0) {
                    this.insertBadgeTypesKeepingOrder(this.badgeTypes.length - 1, data);
                    Behaviours.applicationsBehaviours[MINIBADGE_APP].infiniteScrollService
                        .updateScroll();
                }
                safeApply(this.$scope);
            })
            .catch(() => notify.error('minibadge.error.get.badge.types'))
    }

    private insertBadgeTypesKeepingOrder = async (index: number, data: BadgeType[]): Promise<void> => {
        const value = this.badgeTypes[index];
        if (!value || unaccent(value.label) <= unaccent(data[0].label)) {
            this.badgeTypes.splice(index < (this.$scope.setting.pageSize - 1) ? 0 : index + 1, 0, ...data);
            return;
        }
        return this.insertBadgeTypesKeepingOrder(index - this.$scope.setting.pageSize, data);
    };

    onScroll = async (): Promise<void> => {
        this.payload.offset += this.$scope.setting.pageSize;
        await this.getBadgeTypes();
    };

    initBadgeTypes = async (): Promise<void> => {
        this.payload.query = this.searchQuery;
        this.payload.categoryId = this.selectedCategory?.id;
        this.resetBadgeTypes();
        await this.getBadgeTypes();
    }

    redirectBadgeType = (badgeType: BadgeType): void => {
        this.$location.path(badgeType.getDetailPath());
    }

    onOpenLightbox = (badgeType: BadgeType): void => {
        Behaviours.applicationsBehaviours[MINIBADGE_APP].snipletBadgeAssignService
            .sendBadgeType(badgeType);
    }


    $onDestroy() {
    }
}

export const badgeTypesController = ng.controller('BadgeTypesController',
    ['$scope', '$location', 'BadgeTypeService', 'BadgeCategoryService', Controller]);