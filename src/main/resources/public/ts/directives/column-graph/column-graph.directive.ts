import {angular, ng} from "entcore";
import {IDirective, IScope} from "angular";
import * as ApexCharts from 'apexcharts';
import {RootsConst} from "../../core/constants/roots.const";
import {IGraphItem} from "../../models/graph.model";
import {safeApply} from "../../utils/safe-apply.utils";

interface IViewModel extends ng.IController {
    graph: ApexCharts;
    options: ApexCharts.ApexOptions;
}

interface IDirectiveProperties {
    items: IGraphItem[];
}

interface IMinibadgeScope extends IScope {
    vm: IDirectiveProperties;
}

class Controller implements IViewModel {
    graph: ApexCharts;
    options: ApexCharts.ApexOptions;

    constructor(private $scope: IMinibadgeScope) {
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
        templateUrl: `${RootsConst.directive}/column-graph/column-graph.html`,
        scope: {
            items: '='
        },
        controllerAs: 'vm',
        bindToController: true,
        controller: ['$scope', Controller],
        /* interaction DOM/element */
        link: function (scope: ng.IScope,
                        element: ng.IAugmentedJQuery,
                        attrs: ng.IAttributes,
                        vm: IViewModel) {

            let renderGraph = async (): Promise<void> => {
                if (vm.graph) {
                    vm.graph.destroy();
                }

                vm.graph = new ApexCharts(element.find(`.minibadge-graph`)[0], JSON.parse(JSON.stringify(vm.options)));
                await vm.graph.render();
                await safeApply(scope);
            }


            scope.$watch(() => vm.items, async () => {
                const colors: string[] = vm.items ? vm.items.map(() =>
                    `#${('0'.repeat(6) + Math.floor(Math.random() * 16777215).toString(16)).slice(-6)}`
                ) : null

                const values: number[] = vm.items ? vm.items.map((item: IGraphItem) => item.graphValue()) : [];
                const maxValue: number = Math.max(...values, 0);

                vm.options = {
                    series: [{
                        data: values
                    }],
                    chart: {
                        type: 'bar',
                        height: 450,
                        width: angular.element(element.parent()).width(),
                    },
                    plotOptions: {
                        bar: {
                            columnWidth: "45%",
                            distributed: true
                        }
                    },
                    dataLabels: {
                        enabled: false
                    },
                    legend: {
                        show: false,
                    },
                    yaxis: {
                        min: 0,
                        forceNiceScale: true,
                        tickAmount: maxValue > 0 ? (maxValue <= 5 ? maxValue : Math.round(maxValue / 5) + 1) : 5,
                        max: maxValue <= 5 ? maxValue : Math.round(maxValue / 5) * 5 + 5,
                        labels: {
                            formatter: function (val: number) {
                                return val.toFixed(0);
                            }
                        }
                    },
                    xaxis: {
                        labels: {
                            minHeight: 30,
                            style: {
                                colors: colors,
                            }
                        },
                        categories: vm.items ? vm.items.map((item: IGraphItem) => item.graphCategory().split(' ')) : [],
                    },
                    colors: colors
                };

                await renderGraph();
            });

            angular.element(window).bind('resize', async (): Promise<void> => {
                await renderGraph();
            });

        }
    }
}

export const minibadgeColumnGraph = ng.directive('minibadgeColumnGraph', directive);