import {ng, template, model} from 'entcore';
import {IScope} from "angular";

declare let window: any;

interface ViewModel {
}

/**
 Wrapper controller
 ------------------
 Main controller.
 **/

class Controller implements ng.IController, ViewModel {
    constructor(private $scope: IScope,
                private $route: any) {
        this.$scope['vm'] = this;

        this.$route({
            defaultView: () => {
                template.open('main', `main`);
            }
        });
    }

    $onInit() {

    }

    $onDestroy() {
    }
}

export const mainController = ng.controller('MainController', ['$scope', 'route', Controller]);