import {model, ng, routes} from 'entcore';
import * as controllers from './controllers';
import * as directives from './directives';
import * as services from './services';
import {rights} from "./core/constants/rights.const";

for (let controller in controllers) {
    ng.controllers.push(controllers[controller]);
}


for (let directive in directives) {
    ng.directives.push(directives[directive]);
}


for (let service in services) {
    ng.services.push(services[service]);
}

routes.define(function ($routeProvider) {
    $routeProvider
        .when('/', {
            action: 'badgeReceived'
        })
        .when('/badge-types', {
            action: 'badgeTypes'
        })
        .when('/badge-types/:typeId', {
            action: 'badgeType'
        })
        .when('/badges-given', {
            action: 'badgeGiven'
        })
        .otherwise({
            redirectTo: '/'
        });

    if (model.me.hasWorkflow(rights.workflow.statisticsView)) {
        $routeProvider.when('/statistics', {
            action: 'statistics'
        });
    }
})