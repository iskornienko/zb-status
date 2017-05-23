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




io.on('connection', function(client) {
    console.log('Client connected...');

/*
    var MongoOplog = require('mongo-oplog');
    var oplog = MongoOplog('mongodb://127.0.0.1:27017/local', { ns: 'zenbrain.run_states' });

    oplog.tail().then(() => {
        console.log('tailing started')
    }).catch(err => console.error(err));

    var lastUpdate = new Date();

    oplog.on('update', doc => {
            console.log((new Date()).getTime() - lastUpdate.getTime());
        if((new Date()).getTime() - lastUpdate.getTime() > 1000*10) {
            client.emit('update',{});
            client.broadcast.emit('update',{});

            lastUpdate = new Date();
        }

    });
*/

    client.on('join', function(data) {
        console.log(data);

    });

});



function getLastPrice(currency, callback) {
    request({
        url: 'https://api.gdax.com/products/'+currency+'-USD/stats',
        headers: {
            'User-Agent': 'request'
        }
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            callback(JSON.parse(body).last)
        }
    })
}

function calcUSDTotalBalance( balance, callback) {

    getLastPrice('BTC', function (btcPrice) {
        getLastPrice('ETH', function (ethPrice) {

            var total = !isNaN(balance.USD) ? balance.USD : 0;
            total += !isNaN(balance.ETH) ? balance.ETH * ethPrice : 0;
            total += !isNaN(balance.BTC) ? balance.BTC * btcPrice : 0;

            callback(total);
        })
    })
}

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


        db.collection('sessions').find({}).sort({updated: -1}).limit(1)
            .toArray(function (err, result) {
                if (err) throw err;
            //    console.log(result[0])

                var trade = result[0].selector.split('.')[1];
                var currencies = trade.split('-');

                var balance = {};
                balance[currencies[0]] = result[0].balance.asset;
                balance[currencies[1]] = result[0].balance.currency;

                calcUSDTotalBalance(balance, function (usdTotal) {
                    result[0].balance.calculated = {
                        currencies: currencies,
                        balances: balance,
                        usdTotal: usdTotal,
                        timeCalculated: (new Date()).getTime()
                    }

                    db.collection('my_trades').find({
                        session_id : result[0].id
                    }).sort({time: -1})
                        .toArray(function (err, result2) {

                            console.log('RTADES', result2)

                            result[0].myTrades = result2;

                            db.collection('periods').find({
                                session_id : result[0].id
                            }).sort({time: -1})
                                .toArray(function (err, result3) {
                                    result[0].periods = result3;

                                    response.send(result);
                                    db.close();

                                });

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