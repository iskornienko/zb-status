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



                        $scope.balances = [
                            {
                                amount: 123,
                                currency: 'ETH',
                                dayChange: -0.231
                            },
                            {
                                amount: 123,
                                currency: 'USD'
                            },
                            {
                                amount: 123,
                                currency: 'BTC',
                                dayChange: -0.231
                            }
                        ];

                        $scope.sessions = [
                            {
                                id: '231',
                                selector: 'ETC-BTC',
                                upTime: '5d3h',
                                trades: 4,
                                profit: -23.23,
                                profit_vs_buy_hold: -2.31
                            },
                            {
                                id: '2312',
                                selector: 'BTC-USD',
                                upTime: '2d3h',
                                trades: 1,
                                profit: -3.23,
                                profit_vs_buy_hold: -12.31
                            },
                            {
                                id: '2312',
                                selector: 'BTC-USD',
                                upTime: '2d3h',
                                trades: 1,
                                profit: -3.23,
                                profit_vs_buy_hold: -12.31
                            }
                        ];


                        $scope.trades = [
                            {
                                buy : {
                                    price : 123,
                                    slip: 231,
                                    size: 111
                                },
                                sell : {
                                    price : 123,
                                    slip: 231,
                                    size: 111
                                }
                            },
                            {
                                buy : {
                                    price : 23,
                                    slip: 231,
                                    size: 111
                                },
                                sell : {
                                    price : 123,
                                    slip: 231,
                                    size: 111
                                }
                            }
                        ];

                        console.log('HAI');



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
                                $scope.data = out.data;

                                $scope.textData = JSON.stringify(out.data);

                                $scope.allPairedTrades = [];
                                console.log('about to process data', out);

                                //pair buys & sells
                                for(var x = 0; x < out.data.sessions.length; x++) {
                                    var cSession = out.data.sessions[x];

                                    console.log('processing session', cSession)
                                    var cPairedTrade = null;
                                    if(cSession.trades != undefined) {

                                        for(var y = 0; y < cSession.trades.length; y++) {
                                            var cTrade = cSession.trades[y];

                                            console.log('processing trade', cTrade)

                                            if(cTrade.type == 'buy') {

                                                if(cPairedTrade != null) {
                                                    $scope.allPairedTrades.push(cPairedTrade);
                                                }

                                                cPairedTrade = {
                                                    session_id: cTrade.session_id,
                                                    buy: cTrade
                                                }

                                            } else {
                                                if(cPairedTrade != null) {
                                                    cPairedTrade.sell = cTrade;
                                                } else {
                                                    cPairedTrade = {
                                                        session_id: cTrade.session_id,
                                                        sell: cTrade
                                                    }
                                                }

                                            }

                                        }

                                    }

                                    if(cPairedTrade != null) {
                                        $scope.allPairedTrades.push(cPairedTrade);
                                    }

                                }


                                for(var x = 0; x < out.data.sessions.length; x++) {
                                    var cSession = out.data.sessions[x];

                                    $http.get('/periods/' + cSession.id)
                                        .then((function (chartData) {
                                            console.log('GOT IT', chartData)

                                            document.getElementById('chart_'+this.cSessionId).innerHTML = '';

                                            for(var x = 0; x < $scope.data.sessions.length; x++) {
                                                if($scope.data.sessions[x].id == this.cSessionId) {
                                                    sparkline('#chart_'+this.cSessionId, chartData.data, $scope.data.sessions[x].trades);

                                                    $scope.data.sessions[x].currentPeriod = chartData.data[chartData.data.length-1];

                                                    console.log('THIS - ',$scope.data.sessions[x])
                                                }
                                            }

                                        }).bind({cSessionId:cSession.id}));

                                }


                                console.log($scope.allPairedTrades);

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


                        var parseDate = d3.time.format("%b %d, %Y").parse;


                        function addLineToChart(svg, height,x, data, variable, color, strokeWidth) {

                            var line = d3.svg.line()
                                .x(function(d) {  return x((new Date(d.Date)).getTime()); })
                                .y(function(d) {  return y(d[variable]); });
                            var y = d3.scale.linear().range([height - 4, 0]);


                            y.domain(d3.extent(data, function(d) { return d[variable]; }));


                            svg.append('path')
                                .datum(data)
                                .attr('class', 'sparkline')
                                .style('stroke', color)
                                .style('stroke-width', strokeWidth)
                                .attr('d', line);


                            svg.append('circle')
                                .attr('class', 'sparkcircle')
                                .attr('cx', x(data[data.length-1].date))
                                .attr('cy', function () {
                                    if(data[data.length-1][variable] != undefined)
                                        return y(data[data.length-1][variable]);
                                    else
                                        return -10;
                                })
                                .style('fill', color)
                                .attr('r', 2);

                        }

                        function sparkline(elemId, data, balances) {

                            var width = d3.select(elemId)[0][0].clientWidth;
                            var height = 100;
                            var x = d3.scale.linear().range([0, width - 2]);

                            console.log(data, balances);

                            data.forEach(function(d) {
                                d.date = (new Date(d.Date)).getTime();//parseDate(d.Date);
                                d.close = +d.Close;
                            });
                            //  console.log(data);
                            x.domain(d3.extent(data, function(d) { return d.date; }));

                            var svg = d3.select(elemId)
                                .append('svg')
                                .attr('width', width)
                                .attr('height', height)
                                .append('g')
                                .attr('transform', 'translate(0, 2)');

                            addLineToChart(svg, height, x, data, "close", "black", 0.75);
                            addLineToChart(svg, height, x, data, "rsi", "#337ab7");
                            addLineToChart(svg, height, x, data, "trend_ema", "#d38312");

                            if(balances != undefined) {
                                svg.append('g').selectAll("line")
                                    .data(balances)
                                    .enter()
                                    .append("line")
                                    .attr("x1", function (d) {return x(d.time)})
                                    .attr("y1", 0)
                                    .attr("x2", function (d) {return x(d.time)})
                                    .attr("y2", height)
                                    .style("stroke-dasharray", function (d) { if(d.type=='buy') return 'none'; else return '5 5'});

                            }
                        }
                        


                        /*
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
*/
                    }

                ]
        }}
    ])


export default app.name;