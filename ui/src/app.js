
import 'angular';

import zenHome from './directives/home'
import weekChart from './directives/week-chart'


angular.module('zenbot-ui',[zenHome,weekChart])
    .controller('AppCtrl', [
        '$scope',
        function ($scope) {
            $scope.hai = 'bai';
        }
    ])