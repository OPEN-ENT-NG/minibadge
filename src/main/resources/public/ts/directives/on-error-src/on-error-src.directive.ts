import {ng} from "entcore";

function directive() {
    return {
        restrict: 'A',
        /* interaction DOM/element */
        link: function (scope: ng.IScope,
                        element: ng.IAugmentedJQuery,
                        attrs: ng.IAttributes) {
            element.bind('error', (): void => {
                if (attrs.src != attrs.onErrorSrc) attrs.$set('src', attrs.onErrorSrc);
            });
        }
    }
}

export const onErrorSrc = ng.directive('onErrorSrc', directive)