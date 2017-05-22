
import 'angular';

import zenHome from './directives/home'


angular.module('zenbot-ui',[zenHome])
    .controller('AppCtrl', [
        '$scope',
        function ($scope) {
            $scope.hai = 'bai';
        }
    ])