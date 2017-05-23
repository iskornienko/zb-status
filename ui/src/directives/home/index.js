import 'angular';

import "./style.less";

let app = angular.module('zen-home',[])
    .directive('zenHome',[
        function () {
            return {
                restrict:"AEC",
                replace:true,
                scope:{},
                template:require('./template.html'),
                controller: [
                    '$scope', '$http',
                    function ($scope, $http) {

                        var socket = io.connect();
                        socket.on('connect', function(data) {
                            console.log('connected')
                            socket.emit('join', 'Hello World from client');
                        });

                        socket.on('update', function(data) {
                            updateData();
                        });

                        function updateData() {
                            $http.get('/data').then(function (out) {
                                console.log(out);
                                $scope.data = out.data[0];
                                $scope.keys = Object.keys(out.data[0]);

                                $scope.stringData = JSON.stringify(out.data[0], null, 4)

                                $http.get('/chart-data/' + out.data[0].selector)
                                    .then(function (chartData) {
                                        console.log('GOT IT', chartData)
                                        document.getElementById('spark_goog').innerHTML = '';
                                        sparkline('#spark_goog', chartData.data, out.data[0].myTrades);
                                    })
                            });
                        }

                        updateData();

                        $scope.printTimeElapsed = function(seconds, shorten) {

                            var printTime = "";

                            var min = seconds/60;
                            var hour = seconds/60/60;
                            var day = seconds/60/60/24;

                            if(seconds < 60) {
                                printTime = seconds+'s';
                            } else if (min < 60) {
                                printTime = Math.floor(min)+'m';

                                if(!shorten) {
                                    printTime += ' '+Math.floor((seconds-Math.floor(min)*60))+'s';
                                }
                            } else if (hour < 24) {
                                printTime = Math.floor(hour)+"h";

                                if(!shorten) {
                                    printTime += ' '+Math.floor((min-Math.floor(hour)*60))+'m';
                                }
                            } else {
                                printTime = Math.floor(day)+"d";

                                if(!shorten) {
                                    printTime += ' '+Math.floor((hour-Math.floor(day)*24))+'h';
                                }
                            }

                            return printTime;
                        }


                        var width = 300;
                        var height = 80;
                        var x = d3.scale.linear().range([0, width - 2]);
                        var y = d3.scale.linear().range([height - 4, 0]);
                        var parseDate = d3.time.format("%b %d, %Y").parse;
                        var line = d3.svg.line()
                            .x(function(d) {  return x((new Date(d.Date)).getTime()); })
                            .y(function(d) {  return y(d.close); });

                        function sparkline(elemId, data, balances) {
                              console.log(data, balances);

                            data.forEach(function(d) {
                                d.date = (new Date(d.Date)).getTime();//parseDate(d.Date);
                                d.close = +d.Close;
                            });
                            //  console.log(data);
                            x.domain(d3.extent(data, function(d) { return d.date; }));
                            y.domain(d3.extent(data, function(d) { return d.close; }));

                            var svg = d3.select(elemId)
                                .append('svg')
                                .attr('width', width)
                                .attr('height', height)
                                .attr('shape-rendering', 'crispEdges')
                                .append('g')
                                .attr('transform', 'translate(0, 2)');

                            svg.append('path')
                                .datum(data)
                                .attr('class', 'sparkline')
                                .attr('d', line);

                            svg.append('circle')
                                .attr('class', 'sparkcircle')
                                .attr('cx', x(data[data.length-1].date))
                                .attr('cy', y(data[data.length-1].close))
                                .attr('r', 2);


                            svg.append('g').selectAll("line")
                                .data(balances)
                                .enter()
                                .append("line")
                                .attr("x1", function (d) {return x(d.time)})
                                .attr("y1", 0)
                                .attr("x2", function (d) {return x(d.time)})
                                .attr("y2", height)
                        }

                    }
                ]
        }}
    ])


export default app.name;