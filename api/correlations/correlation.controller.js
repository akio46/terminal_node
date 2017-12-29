var Config = require('../../config');
var Correlation = require('./correlation.model.js');
var Watch = require('../watches/watch.model.js');
var Security = require('../securities/security.model.js');
var History = require('../histories/history.model.js');
var request = require('request');
var moment = require('moment');
var async = require('async');
var _ = require('lodash');

exports.getThreeCorrelationsByTicker = function(req, res) {

	var ticker = req.params.ticker;

    Correlation.find({$or: [{ticker1: ticker}, {ticker2: ticker}]}).sort({coefficient: -1}).limite(3).exec(function(err, correlations) {
        if (err) {
            res.status(402).send(err);
            return;
        }
	    if(correlations.length == 0) {
	        res.status(403).send('There is no correlations for this ticket')
	        return;
	    }
        res.json(correlations);
    });   
}




function getReturns(cb) {

	var start_date = new Date();
	start_date.setDate(start_date.getDate() - 40);
	console.log(start_date);

	Security.find({ is_trading: true }).select('ticker').sort({ticker: 1}).exec(function(err, watches) {
        if (err) {
            res.status(402).send(err);
            return;
        }
	    if(watches.length == 0) {
	        res.status(403).send('There is no watch')
	        return;
	    }
	    var watchlist = _.map(watches, 'ticker');
	    console.log(watchlist);

	    var returns = {};

	    console.log(new Date);
	    console.log('Fetching all historical returns needed...');

		History.find({ date: { $gt : start_date }, ticker: { $in: watchlist } })
			.select('ticker date return')
			.sort({ticker: 1, date: 1})
			.exec(function(err, histories){
				if (err) {
					console.log(err);
					cb(err, null, null);
				}

				console.log(histories.length + ' histories fetched');

				watchlist.forEach(function(identifier) {

					console.log(identifier);

					var filteredArray = _.filter(histories, {ticker: identifier});
					var returnObject = {};
					
					filteredArray.forEach(function(history){
						var dateString = formatDate(history.date);
						returnObject[dateString] = history.return;
					});

				    returns[identifier] = returnObject;
				});

				cb(null, returns, watchlist);
			});


 
    }); 
}




exports.createCorrelations = function (req, res) {

	Correlation.remove({}, function (err) {
    
	    if (err) {
	    	console.log(err);
	    	res.json('Remove All Correlation Error');
	    } else {
	    	console.log('Removed all correlations');

			getReturns(function (err, returns, watchlist) {
				if (err) {
		            res.status(402).send(err);
				} else {
					console.log(returns);
					async.eachSeries(watchlist, function(identifier, next)
						{
							seriesUpdateCorrelations(identifier, watchlist, returns, function(err){
								if (err) {
						            console.log(err);
						        }
						        next();
							});

						}, function (err)
						{
						    if (err) {
						        console.error('Error: ' + err.message);
						        res.json('fail');
						    }
						    res.json('success');
						}
					);

				}
			});

	    }
	});
}



function seriesUpdateCorrelations(identifier, watchlist, returns, cb) {

	var index = _.indexOf(watchlist, identifier);
	console.log('****** ' + identifier + ' ---- ' + index);

	var correlationArray = [];

	for (var i = index+1; i < watchlist.length; i++) {

		var secondIdentifier = watchlist[i];
		var firstReturns = returns[identifier];
		var secondReturns = returns[secondIdentifier];
		var firstKeys = _.keys(firstReturns);
		var secondKeys = _.keys(secondReturns);
		var dateKeys;
		if (firstKeys.length > secondKeys.length) {
			dateKeys = secondKeys;
		} else {
			dateKeys = firstKeys;
		}

		var sumxy = 0;
		var sumx = 0;
		var sumy = 0;
		var sumx2 = 0;
		var sumy2 = 0;
		var start_date;
		var end_date;
		var n = 0;

		for (var j = 0; j < dateKeys.length; j++) {
			
			var dateKey = dateKeys[j];
			var x = firstReturns[dateKey];
			var y = secondReturns[dateKey];

			if (x == undefined || y == undefined) {
				continue;
			}

			sumx += x;
			sumy += y;
			sumx2 += (x * x);
			sumy2 += (y * y);
			sumxy += (x * y);
			n ++;

			if (start_date == undefined) {
				start_date = parseDate(dateKey);
			} 
			end_date = parseDate(dateKey);
		}

		var coefficient = (n * sumxy - sumx * sumy)/(Math.sqrt(n * sumx2 - sumx * sumx) * Math.sqrt(n * sumy2 - sumy * sumy));
		var correlation = new Correlation({ticker1: identifier,
								           ticker2: secondIdentifier,
								           coefficient: coefficient });
		correlationArray.push(correlation);
		console.log('  ' + i + ' -- ' + secondIdentifier);
	}

	if (correlationArray.length == 0) {
		cb(null);
		return;
	}

	Correlation.collection.insertMany(correlationArray, {ordered: false}, function (err, docs) {
	    if (err) {
	    	if (err.code != 11000) {
	    		console.log(err);
	    	}
	        console.log(identifier + ' Correlation was saved with some errors.');
	    } else {
	        console.log(identifier + ' Correlation was saved without errors.');
	    }
	    cb(null);
	});
}




function parseDate(input) {
  var parts = input.split('-');
  return new Date(Date.UTC(parts[0], parts[1]-1, parts[2])); 
}

function formatDate(date) {
    var d = new Date(date),
        month = '' + (d.getUTCMonth() + 1),
        day = '' + d.getUTCDate(),
        year = d.getUTCFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}






