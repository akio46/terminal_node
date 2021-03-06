var Config = require('../../config');
var History = require('./history.model.js');
var Watch = require('../watches/watch.model.js');
var Security = require('../securities/security.model.js');
var request = require('request');
var moment = require('moment');
var async = require('async');
var _ = require('lodash');


exports.getAllHistories = function(req, res) {

    History.find({}, function(err, histories) {
        if (err) {
            res.status(402).send(err);
            return;
        }
        res.json(histories);
    });   

    // History.findOne({ date: {$lt : new Date(2017, 10, 10)}, ticker: 'AAPL' }).sort({date: -1}).exec(function(err, history) {
    //     if (err) {
    //         res.status(402).send(err);
    //         return;
    //     }
    //     res.json(history);
    // });  
}

exports.getHistoriesByTicker = function(req, res) {

    History.find({ticker: req.params.ticker}, function(err, histories) {
        if (err) {
            res.status(402).send(err);
            return;
        }
	    if(histories.length == 0) {
	        res.status(403).send('There is no history for this ticket')
	        return;
	    }
        res.json(histories);
    });   
}




exports.updateAllReturnHistories = function(req, res) {

	var date = parseDate('2017-12-15');
	console.log(date);

	History.find({ date: date, return: null }).sort( { ticker : 1 } ).exec(function(err, watches) {
        if (err) {
            res.status(402).send(err);
            return;
        }
	    if(watches.length == 0) {
	        res.status(403).send('There is no watch')
	        return;
	    }

		async.eachSeries(watches, function (watch, next)
			{
				var ticker = watch.ticker;

				seriesReturnUpdate(ticker, function(err){
					if (err) {
			            console.log(err);
			        }
			        next();
				});

			}, function (err) {
			    if (err) {
			        console.error('Error: ' + err.message);
			        res.json('fail');
			    }

			    res.json('success');
			}
		);
     });   

}


function seriesReturnUpdate(identifier, cb) {

	History.find({ ticker: identifier }).select('ticker adj_close_price').sort({date: -1}).exec(function(err, histories) {
        if (err) {
            cb(err);
            return;
        }

		var bulk = History.collection.initializeOrderedBulkOp();

        for (var i = 0; i < histories.length-1; i++) {
        	var history = histories[i];
        	var previousHistory = histories[i+1];
        	var stockReturn = (history.adj_close_price - previousHistory.adj_close_price) / previousHistory.adj_close_price;

		    bulk.find({ "_id": history._id }).updateOne({ 
		        "$set": { "return": stockReturn }
		    });

		    if (previousHistory.return != null) {
		    	break;
		    }
        }

        bulk.execute(function(err, result) {
	    	if (err) {
	    		console.log(err);
 				console.log(identifier + ' is not updated by error');
	            cb(err)
	            return;
		    }
		    console.log(identifier + ' is successfully updated');
		    cb(null);
		});

    }); 

}


var totalDailyPriceHistoriesArray = [];

exports.updateDailyPriceHistories = function(req, res) {

	totalDailyPriceHistoriesArray = [];

	var date = req.body.date;

	console.log('\n');
	console.log('************ Start Fetch Price for ' + date + ' ***************');
	console.log(new Date);

	var exch_symbols = ['^XNYS', '^BATS', '^XNAS'];

	async.eachSeries(exch_symbols, function (exch_symbol, next)
	{
		console.log('\n');
		console.log('****** ' + exch_symbol + ' *******');

		fetchDailyPriceHistoriesInPage(exch_symbol, date, 1, (err, total_pages, total_count) => {
			if (err) {
				console.log(err);
				res.json('fail');
				return;
			} 

			console.log(exch_symbol + ' total pages are ' + total_pages);
			console.log(exch_symbol + ' total trading securities count are ' + total_count);


			var pageNumberArray = [];
			if (total_pages > 1) {
				for (var i = 2; i <= total_pages; i++) {
				    pageNumberArray.push(i);
				}
			}

			seriesDailyPriceFetch(exch_symbol, date, pageNumberArray, function(error) {
				if (error) {
					res.status(403).send(error);					
				} else {
					next();
				}
			});
		});

	}, function (err)
	{
	    if (err) {
	        console.error('Error: ' + err.message);
    		res.json('fail');
	        return;
	    }

	    console.log(date + " total trading securities count is " + totalDailyPriceHistoriesArray.length);

		var bulk = History.collection.initializeOrderedBulkOp();

	    for (var i = 0; i < totalDailyPriceHistoriesArray.length; i++) {
	    	var history = totalDailyPriceHistoriesArray[i];
	    	var real_date = parseDate(history.date);

		    bulk.find({ 'ticker': history.ticker, date: real_date }).upsert().updateOne({ 
		        "$set": { 'ticker': history.ticker,
		        		  'date': real_date,
		        		  'adj_close_price': history.adj_close }
		    });
	    }
	    console.log('Saving on database...')
	    bulk.execute(function(err, result) {
	    	if (err) {
	    		console.log(err);
	    		res.json('fail');
	            return;
		    }
		   	console.log('All price data is successfully saved on database');
	   		console.log(new Date);

			res.json('success');
		});
	});
}


var errNumbersForDailyPrice = [];

function seriesDailyPriceFetch(exch_symbol, date, pageNumbers, main_cb) {
	async.eachSeries(pageNumbers, function (page_number, next)
		{
		    fetchDailyPriceHistoriesInPage(exch_symbol, date, page_number, (err, total_pages, total_count) =>
		    {
				if (err) {
					console.log('%d is not saved', page_number);
					errNumbersForDailyPrice.push(page_number);
				}

				if (err && err.name == 'error_daily_limit') {
					next(err);
				} else {
					next();
				}
		    });
		}, function (err)
		{
		    if (err) {
		        console.log('Error: ' + err.message);
				main_cb(err);
		    } else {
				if (errNumbersForDailyPrice.length === 0) {
					main_cb();
				} else {
					console.log('There are some pages to be added');
					console.log(errNumbers);
					seriesDailyPriceFetch(exch_symbol, date, errNumbersForDailyPrice, main_cb);
					errNumbersForDailyPrice = [];
				}
			}


		}
	);
}


function fetchDailyPriceHistoriesInPage (exch_symbol, date, pageNumber, cb) {
	
	var url = Config.intrinio_base_url + 'prices/exchange';

	var qs = {'page_number' : pageNumber,
			  'price_date' : date,
			  'identifier' : exch_symbol};

	request(
	    {   url : url,
	        headers : {"Authorization" : Config.intrinio_header},
	        qs: qs
	    },
	    function (error, response, body) {
	    	if (error) {
	    		console.log(error);
	    		cb(error, null, null);
	    		return;
	    	}

	    	try {
		    	if (JSON.parse(body).errors) {
					var errors = JSON.parse(body).errors[0];
					console.log(errors);
					var err = new Error(errors.human);
					if (errors.access_codes[0] == 'com_fin_data'){
						err.name = 'error_daily_limit';
					}
		    		cb(err, null, null);
		    		return;
		    	}
			}
			catch (e) {
				console.log(e);
				cb(err, null, null);
				return;
			}

	    	var jsonArray = JSON.parse(body).data;
	    	var total_pages = JSON.parse(body).total_pages;
	    	var current_page = JSON.parse(body).current_page;
	    	var total_count = JSON.parse(body).result_count;

	    	console.log('Page' + current_page + ' is added');

	    	totalDailyPriceHistoriesArray = totalDailyPriceHistoriesArray.concat(jsonArray);

		    cb(null, total_pages, total_count);

	    }
	); 
}









exports.fetchPriceHistories = function(req, res) {

	console.log('Start Fetch.....');
	console.log(new Date);

	Security.find({ticker:'A'}).sort({ticker: 1}).exec(function(err, watches) {
        if (err) {
            res.status(402).send(err);
            return;
        }
	    if(watches.length == 0) {
	        res.status(403).send('There is no watch')
	        return;
	    }

	    console.log(watches);

	    fetchPriceHistoriesForSecurities(watches, function(err){
	    	if (err) {
	    		res.status(402).send(err);
	    	} else {
	    		res.json('success');
	    	}
	    });
 
    });   

}


function fetchPriceHistoriesForSecurities(watches, cb) {

	async.eachSeries(watches, function (watch, next)
		{
			var ticker = watch.ticker;
			var startDate;
			if (watch.last_date) {
				startDate = formatDate(watch.last_date);
			} else {
				startDate = '1996-01-01';
			}

			console.log(startDate);
			console.log('********** Start Fetch : ' + ticker + ' ***********');


			fetchHistoriesInPage(ticker, startDate, 1, (err, total_pages) => {
				if (err) {
					console.log(err);
					cb(err);
					return;
				} 

				console.log(total_pages);
				var pageNumberArray = [];
				if (total_pages > 1) {
					for (var i = 2; i <= total_pages; i++) {
					    pageNumberArray.push(i);
					}
				}

				seriesFetch(ticker, startDate, pageNumberArray, function(error) {
					if (error) {
						next(err);					
					} else {
						console.log('********** Finish Fetch : ' + ticker + ' ***********');
						watch.update({$set: {last_date: parseDate(formatDate(new Date()))}}, function(sub_error) {
							if (sub_error){
								console.log(sub_error);
							}
						});
						next();
					}
				});

			});

		}, function (err)
		{
		    if (err) {
		        console.error('Error: ' + err.message);
		        cb(err);
		    } else {
		    	cb(null);
		    }

		}
	);
}



var errNumbers = [];

function seriesFetch(identifier, startDate, pageNumbers, main_cb) {
	async.eachSeries(pageNumbers, function (page_number, next)
		{
		    fetchHistoriesInPage(identifier, startDate, page_number, (err, total_pages) =>
		    {
				if (err) {
					console.log('%d is not saved', page_number);
					errNumbers.push(page_number);
				}

				if (err && err.name == 'error_daily_limit') {
					next(err);
				} else {
					next();
				}
		    });
		}, function (err)
		{
		    if (err) {
		        console.log('Error: ' + err.message);
				main_cb(err);
		    } else {
				if (errNumbers.length === 0) {
					main_cb();
				} else {
					console.log('There are some pages to be saved');
					console.log(errNumbers);
					seriesFetch(identifier, startDate, errNumbers, main_cb);
					errNumbers = [];
				}
			}


		}
	);
}





function fetchHistoriesInPage (identifier, startDate, pageNumber, cb) {
	
	var url = Config.intrinio_base_url + 'historical_data';

	var qs = {'page_number' : pageNumber,
			  'start_date' : startDate,
			  'item': 'adj_close_price', 
			  'identifier' : identifier,
			  'sort_order' : 'asc'};

	request(
	    {   url : url,
	        headers : {"Authorization" : Config.intrinio_header},
	        qs: qs
	    },
	    function (error, response, body) {
	    	if (error) {
	    		console.log(error);
	    		cb(error, null);
	    		return;
	    	}

	    	try {
		    	if (JSON.parse(body).errors) {
					var errors = JSON.parse(body).errors[0];
					console.log(errors);
					var err = new Error(errors.human);
					if (errors.access_codes[0] == 'com_fin_data'){
						err.name = 'error_daily_limit';
					}
		    		cb(err, null);
		    		return;
		    	}
			}
			catch (e) {
				console.log(body);
				console.log(e);
				cb(err, null);
				return;
			}

	    	var jsonArray = JSON.parse(body).data;
	    	var total_pages = JSON.parse(body).total_pages;
	    	var current_page = JSON.parse(body).current_page;

	    	var historyArray = jsonArray.map ( obj => new History({ticker: identifier,
														        	 date: parseDate(obj.date),
														        	 adj_close_price: obj.value
														        	 }) );

	    	if (historyArray.length > 0) {
		    	History.collection.insertMany(historyArray, {ordered: false}, function (err, docs) {

				    if (err) {
				    	if (err.code != 11000) {
				    		console.log(err);
				    		cb(err. null);
				    		return;
				    	}
				        console.log('Histories in Page %d was saved with some duplicated errors.', current_page);
				    } else {
				        console.log('Histories in Page %d was saved without duplicated errors.', current_page);
				    }
				    cb(null, total_pages);
				});
	    	} else {
	    		console.log('There is no items to add in page ', current_page);
	    		cb(null, total_pages);
	    	}
	    }
	); 
}


exports.updateDailyReturnHistories = function(req, res){
	var date = req.body.date;

	updateDailyReturnForAllSecurities(date, function(err, result){
		if (err) {
			res.json(err);
		} else {
			res.json(result);
		}

	});
}



function updateDailyReturnForAllSecurities(date, cb){
	
	console.log('\n');
	console.log('************ Start Update Daily Returns for ' + date + ' ***************');

	//console.log('The count of all securities is: ' + totalDailyPriceHistoriesArray.length);

	var last_date = parseDate(date);

	History.find({ date: last_date }).sort( { ticker : 1 } ).exec(function(err, histories) {
        if (err) {
            cb(err);
            return;
        }
	    if(histories.length == 0) {
	        cb(err);
            return;
	    }

	    console.log(histories);

		console.log('The count of today histories is: ' + histories.length);

		var aggregation = History.aggregate(
							[
							    {
							    	$match: {
						                date: {$lt: last_date}
						            }
						        },
							 	{$sort: {ticker:1, date: -1}}, 
							 	{
							 		$group: {_id: "$ticker",
								       		data: {$first : "$$ROOT"}            
									}
								}
						    ]);

	    aggregation.options = { allowDiskUse: true };

		aggregation.exec(function (err, previousHistories) {
	        if (err) {
	        	console.log(err);
	            cb(err, null);
	        } else {
	        	console.log(previousHistories);
	        	console.log(previousHistories.length);

	        	var bulk = History.collection.initializeOrderedBulkOp();

		        for (var i = 0; i < histories.length; i++) {
		        	var history = histories[i];
		        	var ticker = history.ticker;
		        	var previousHistory = _.find(previousHistories, {"_id": ticker});

		        	if (previousHistory) {
		        		var stockReturn = (history.adj_close_price - previousHistory.data.adj_close_price) / previousHistory.data.adj_close_price;
					    bulk.find({ "_id": history._id }).updateOne({ 
					        "$set": { "return": stockReturn }
					    });
		        	} else {
		        		console.log(ticker);
		        	}
		        }

		        bulk.execute(function(err1, result) {
			    	if (err) {
		 				console.log('err1');
			            cb(err)
			            return;
				    }
				    console.log('All return is successfully updated');
				    cb(null);
				});

	        }
	    });

	});

}


exports.completeUpdateReturns = function(req, res){

	console.log('\n');
	console.log('********** Start update missing returns **********');

	getReturnMissedSecurities(function(err, results){
		if (err) {
			res.json(err);
		} else {
			updateReturnHistoriesForSecurities(results, function(error){
				if (error) {
					res.json(err);
				} else {
					res.json('success');
				}
			});
		}
	});
}


function getReturnMissedSecurities(cb){

	console.log('Finding return missing securities...');
	
	var aggregation = History.aggregate(
						[
						    { $match: {	return: null } },
						 	{ $sort: { ticker:1 } }, 
						 	{ $group: {_id: "$ticker", count: { $sum : 1 } } }
					    ]);

    aggregation.options = { allowDiskUse: true };
	aggregation.exec(function (err, results) {
        if (err) {
        	console.log(err);
            cb(err, null);
        } else {
        	var missings = _.filter(results, function(o) { return o.count > 1 ; });
        	console.log(missings);
        	console.log("All missing securities count is " + missings.length);
            cb(null, missings);
        }
    });
}

function updateReturnHistoriesForSecurities(missingSecurities, cb){

	console.log('\n');
	console.log('******** Start Update Missed Returns *******');

	async.eachSeries(missingSecurities, function (result, next)
		{
			var ticker = result._id;

			seriesHistoricalReturnUpdate(ticker, function(err){
				if (err) {
		            console.log(err);
		        }
		        next();
			});

		}, function (err) {
		    if (err) {
		        console.error('Error: ' + err.message);
		        cb(err);
		    } else {

		    	cb(null);
		    }
		}
	);
}

function seriesHistoricalReturnUpdate(identifier, cb) {

	History.find({ ticker: identifier }).select('ticker adj_close_price').sort({date: -1}).exec(function(err, histories) {
        if (err) {
            cb(err);
            return;
        }

		var bulk = History.collection.initializeOrderedBulkOp();

        for (var i = 0; i < histories.length-1; i++) {
        	var history = histories[i];
        	var previousHistory = histories[i+1];
        	var stockReturn = (history.adj_close_price - previousHistory.adj_close_price) / previousHistory.adj_close_price;

		    bulk.find({ "_id": history._id }).updateOne({ 
		        "$set": { "return": stockReturn }
		    });

		    if (previousHistory.return != null) {
		    	break;
		    }
        }

        bulk.execute(function(err, result) {
	    	if (err) {
 				console.log(identifier + ' return is not updated by error');
	            cb(err)
	            return;
		    }
		    console.log(identifier + ' return is successfully updated');
		    cb(null);
		});

    }); 

}

//////////////////////



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






