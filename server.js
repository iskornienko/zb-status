var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://127.0.0.1:27017/zenbot4";


var request = require('request');
const https = require('https')
const path = require('path')
const express = require('express')
const app = express()
const port = 3000

var server = require('http').createServer(app);
var io = require('socket.io')(server);

app.use(express.static('ui'));


var MongoOplog = require('mongo-oplog');
var oplog = MongoOplog('mongodb://127.0.0.1:27017/local', { ns: 'zenbot4.periods' });
var oplog2 = MongoOplog('mongodb://127.0.0.1:27017/local', { ns: 'zenbot4.my_trades' });

oplog.tail().then(() => {
    console.log('tailing started')
}).catch(err => console.error(err));

oplog2.tail().then(() => {
    console.log('tailing started')
}).catch(err => console.error(err));

var lastUpdate = new Date();
function refreshFrontEnd(event, doc) {

    console.log(doc)
/*
    if((new Date()).getTime() - lastUpdate.getTime() > 1000*3) {
        lastUpdate = new Date();
        console.log(event, lastUpdate);

    //    client.emit('update',{});
    //    client.broadcast.emit('update',{});
        allClients.forEach(function (client) {
            client.emit('update',{});
            client.broadcast.emit('update',{});
        })

    }
    */
}

function getSessionObj(sessionId, callback) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        db.collection('sessions').find({
            id: sessionId,
        }).limit(1)
            .toArray(function (err, result) {
                callback(result[0]);
            })
    })

}

oplog.on('insert', doc => {
    allClients.forEach(function (client) {
        getSessionObj(doc.o.session_id, function (session) {
            client.emit('period_added',{
                period:doc.o,
                session: session
            });
        })

    })
})

oplog.on('update', doc => {
    allClients.forEach(function (client) {
        getSessionObj(doc.o.session_id, function (session) {
            client.emit('period_updated',{
                period:doc.o,
                session: session
            });
        })
    })

});

oplog2.on('insert', doc => {
    allClients.forEach(function (client) {
      //  getSessionObj(doc.o.session_id, function (session) {
            client.emit('new_trade',{
                trade:doc.o,
            //    session: session
            });
      //  })
    })
})


var allClients = [];
io.on('connection', function(socket) {
    console.log('Client connected...');
    allClients.push(socket);



    socket.on('disconnect', function() {
        console.log('Got disconnect!');

        var i = allClients.indexOf(socket);
        allClients.splice(i, 1);
    });

});


setInterval(function () {
    console.log('CLIENTS: ', allClients.length)
    if(allClients.length > 0)
        calcUSDTotalBalance(function (stats) {
            allClients.forEach(function (client) {
                client.emit('update_stats',stats);
            })
        })
},5000);


function getLastPrice(currency, callback) {
    request({
        url: 'https://api.gdax.com/products/'+currency+'-USD/stats',
        headers: {
            'User-Agent': 'request'
        }
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {

            var stats = JSON.parse(body);

            stats.change= (stats.last-stats.open)/stats.open*100;

            callback(stats)
        }
    })
}

//function calcUSDTotalBalance( balance, callback) {
function calcUSDTotalBalance(callback) {
    getLastPrice('BTC', function (btcPrice) {
        getLastPrice('ETH', function (ethPrice) {
            callback({
                ETH: ethPrice,
                BTC: btcPrice
            });
        })
    })
}


function getDailyData(currency, callback) {
    console.log(currency)
    request({
        url: 'https://poloniex.com/public?command=returnChartData&currencyPair='+currency+'&start=1459900800&end=9999999999&period=86400',
        headers: {
            'User-Agent': 'request'
        }
    }, function (error, res, body) {
        if (!error && res.statusCode == 200) {

            var body = JSON.parse(body);

            callback(body)
        }
    })
}


function getWeekNumber(d) {
    // Copy date so don't modify original
    d = new Date(+d);
    d.setHours(0,0,0,0);
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    d.setDate(d.getDate() + 4 - (d.getDay()||7));
    // Get first day of year
    var yearStart = new Date(d.getFullYear(),0,1);
    // Calculate full weeks to nearest Thursday
    var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
    // Return array of year and week number
    return [d.getFullYear(), weekNo];
}



function getDailyChanges(currency, callback) {

    getDailyData(currency, function (data) {

        var weeks = [];

        for (var x =0; x < data.length; x++) {

            var dayOfWeek = (new Date(data[x].date*1000)).getDay();
            var weekOfYear = getWeekNumber((new Date(data[x].date*1000)));

            var wkId = weekOfYear[0]+'-'+weekOfYear[1];

            if(!weeks[wkId])
                weeks[wkId] = [];

            weeks[wkId][dayOfWeek] = {
                date: data[x].date,
                change: (data[x].close-data[x].open)/data[x].open*100
            }

        }

        var weekArray = [];
        for(var x in weeks) {
            weekArray.push({
                week: x,
                days: weeks[x]
            })
        }

        callback(weekArray)

    });
}


app.get('/weekly-data/:symbol', (rq, response) => {

    getDailyChanges(rq.params.symbol, function (data) {
        response.send(data);
    })

});


app.get('/periods/:session_id', (request, response) => {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        db.collection('periods').find({
            session_id: request.params.session_id,
        }).sort({time: -1}).limit(100)
            .toArray(function (err, result) {
                if (err) throw err;

                //    console.log(result);
                var needed = result.reduce(function (acc, current) {

                    acc.push(current);

                    return acc;
                },[]);

                needed = needed.sort(function (a,b) {
                    if(a.time > b.time)
                        return 1;
                    else
                        return -1;
                })

                db.close();
                response.send(needed)

            })
    })
})
/*
app.get('/chart-data/:selector', (request, response) => {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        db.collection('trades').find({
            selector: request.params.selector,
            time: {"$gte": (new Date()).getTime() - 1000 * 60 * 60 * 8},
            trade_id : { $mod: [ 20, 0 ] }
        }).sort({time: 1})
            .toArray(function (err, result) {
                if (err) throw err;

            //    console.log(result);
                var needed = result.reduce(function (acc, current) {

                    acc.push({
                        Date : current.time,
                        Close : current.price,
                    });

                    return acc;
                },[])

                db.close();
                response.send(needed)

            })
    })
})
*/

    /*
     zb3 logic
    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        db.collection('ticks').find({size: '5m', time: {"$gte": (new Date()).getTime() - 1000 * 60 * 60 * 30}}).sort({time : 1})
            .toArray(function (err, result) {
                if (err) throw err;

                var needed = result.reduce(function (acc, current) {

                    if(current.data.trades.gdax[request.params.currency]) {
                        acc.push({
                            Date : current.time,
                            Close : current.data.trades.gdax[request.params.currency].close,
                        });
                    }

                    return acc;
                },[])

                db.close();
                response.send(needed)

            });
    });
    */

app.get('/data', (request, response) => {

    MongoClient.connect(url, function(err, db) {
        if (err) throw err;


        db.collection('sessions').find({
            updated: {$gt: (new Date()).getTime() - 30000}
        }).sort({updated: -1})
            .toArray(function (err, result) {
                if (err) throw err;


       //         calcUSDTotalBalance(balance, function (usdTotal, stats) {
                calcUSDTotalBalance(function (stats) {

                    /*
                    var totals = {
                        currencies: Object.keys(balance).sort(function (a,b) {if(a>b) return 1; return -1}),
                        balances: balance,
                        usdTotal: usdTotal,
                        timeCalculated: (new Date()).getTime(),
                        stats: stats
                    }*/


                    db.collection('my_trades').find({
                        session_id : {$in: result.map(function (a) {return a.id})}
                    }).sort({time: 1}).limit(100)
                        .toArray(function (err, result2) {

                         //   console.log('RTADES', result2)

                            result2.forEach(function (trade) {
                                result.forEach(function (session) {
                                    if(trade.session_id == session.id) {
                                        if(!session.trades) session.trades = [];

                                        session.trades.push(trade);
                                    }
                                })
                            })

                            response.send({
                                sessions:result,
                                stats: stats
                            });
                            db.close();

                            /*

                            db.collection('periods').find({
                                session_id : result[0].id
                            }).sort({time: -1}).limit(100)
                                .toArray(function (err, result3) {
                                    result[0].periods = result3;

                                    response.send(result);
                                    db.close();

                                });*/

                        });


                })

            });
    });


    /*
    zb3 logic

 MongoClient.connect(url, function(err, db) {
     if (err) throw err;

     var query = {_id : 'zb_run'};

     db.collection("run_states").find(query).toArray(function(err, result) {
         if (err) throw err;
         console.log(result[0].time);
         console.log((new Date()).getTime());

         result[0].time_passed = (new Date()).getTime() - result[0].time;

         calcUSDTotalBalance(result[0].balance, function (total) {
             result[0].usd_total = total;
             response.send(result)
             db.close();
         });

     });
 });

    */


})

server.listen(port);

/*
app.listen(port, (err) => {
    if (err) {
        return console.log('something bad happened', err)
    }

    console.log(`server is listening on ${port}`)
})
*/


/*
//executing some code before exiting the app
process.stdin.resume();//so the program will not close instantly

function exitHandler(options, err) {
    console.log("EXITING");
    db.close(function () {
        process.exit();
    });
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));
*/


/*
var MongoOplog = require('mongo-oplog');
var oplog = MongoOplog('mongodb://127.0.0.1:27017/zenbrain', { ns: 'run_states.time' });

oplog.tail().then(() => {
    console.log('tailing started')
}).catch(err => console.error(err));


oplog.on('op', data => {
    console.log(data);
});

oplog.on('insert', doc => {
    console.log(doc);
});

oplog.on('update', doc => {
    console.log(doc);
});*/