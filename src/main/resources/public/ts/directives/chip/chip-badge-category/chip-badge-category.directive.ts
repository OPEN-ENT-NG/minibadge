import { IDirective, IScope } from 'angular';
import { ng } from 'entcore';
import { RootsConst } from '../../../core/constants/roots.const';

interface Category {
    iconCssClass: string;
    name: string;
}

interface IDirectiveProperties {
    category: Category;
    isSelected?: boolean;
    onClick?: (args: { category: Category }) => void;
}

interface IChipBadgeCategoryScope extends IScope {
    vm: IDirectiveProperties;
}

class Controller {
    category: Category;
    isSelected: boolean;
    onClick: (args: { category: Category }) => void;

    constructor(private $scope: IChipBadgeCategoryScope) {}

    $onInit() {}

    handleClick(): void {
        if (this.onClick) {
            this.onClick({ category: this.category });
        }
    }

    $onDestroy() {}
}

function directive(): IDirective {
    return {
        restrict: 'E',
        templateUrl: `${RootsConst.directive}/chip/chip-badge-category/chip-badge-category.html`,
        scope: {
            category: '=',
            isSelected: '<?',
            onClick: '&?'
        },
        controllerAs: 'vm',
        bindToController: true,
        controller: ['$scope', Controller]
    };
}

export const chipBadgeCategory = ng.directive('chipBadgeCategory', directive);
