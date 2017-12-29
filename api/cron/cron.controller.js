var Config = require('../../config');
var History = require('../histories/history.model.js');
var Watch = require('../watches/watch.model.js');
var Security = require('../securities/security.model.js');
var request = require('request');
var moment = require('moment');
var async = require('async');
var _ = require('lodash');




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


////////// Start //////////////////

var totalDailyPriceHistoriesArray = [];

exports.start = function(req, res) {

	totalDailyPriceHistoriesArray = [];

	var date = req.body.date;

	fetchDailyPriceHistories(date, function(error1){
		if (error1) {
			res.status(402).send(error1);
	        return;
	    }
	    saveTotalDailyPriceHistories(function(error2){
		    if (error2) {
			    res.status(402).send(error2);
				return;
		    } 
			updateTradingSecurities(date, function(error3, newSecurities){
			    if (error3) {
			    	res.status(402).send(error3);
					return;
			    } 
			    fetchPriceHistoriesForSecurities(newSecurities, function(error4){
			    	if (error4) {
			    		res.status(402).send(error4);
			    		return;
			    	} 
			    	updateReturnHistoriesForSecurities(newSecurities, function(error5){
				    	if (error4) {
				    		res.status(402).send(error5);
				    		return;
				    	} 
				    	updateDailyReturnForAllSecurities(date, function(error6){
					    	if (error6) {
					    		res.status(402).send(error6);
					    		return;
					    	} 
					    	res.json('success');
				    	})
			    	});
			    });
			})
	    });
	})
}


/// Fetch Daily Price Histories and Save

function fetchDailyPriceHistories(date, cb){

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
				cb(err);
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
					next(err);					
				} else {
					next();
				}
			});
		});

	}, function (err)
	{
	    if (err) {
	        console.error('Error: ' + err.message);
    		cb(err);
	        return;
	    }

	    console.log(date + " total trading securities count is " + totalDailyPriceHistoriesArray.length);
	    cb(null);
	
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


function saveTotalDailyPriceHistories(cb) {

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
    		cb(err);
            return;
	    }
	   	console.log('All price data is successfully saved on database');
   		console.log(new Date);

		cb(null);
	});
}


///////////// Security Update ///////////////


function updateTradingSecurities(date, cb){

	console.log('\n');
	console.log('************ Start Update Watchlist(trading securities) for ' + date + ' ***************');

    // Set all Securities is_trading as FALSE
	Security.update({}, {$set: { is_trading: false }}, { multi: true }, function(err, result){
    	if (err) {
            cb(err, null);
            return;
        }

        // create and update is_trading as TRUE

	    console.log('Updating trading securities on database...');
	    var bulk = Security.collection.initializeOrderedBulkOp();
	    for (var i = 0; i < totalDailyPriceHistoriesArray.length; i++) {
	    	var tradingSecurity = totalDailyPriceHistoriesArray[i];

		    bulk.find({ 'ticker': tradingSecurity.ticker }).upsert().updateOne({ 
		        "$set": { 'ticker': tradingSecurity.ticker,
		        		  'is_trading': true }
		    });
	    }
	    bulk.execute(function(err, result) {
	    	if (err) {
	    		console.log(err);
	    		cb(err, null);
	            return;
		    }
		   	console.log('Create or Update all securities are marked as is_trading');
		   	
		   	// Find new additional securities
		   	console.log('Finding new securities...');
		   	Security.find({is_trading: true, name: null}).sort({ticker:1}).exec(function(err, newSecurities){
				if (err) {
		            cb(err, null);
		            return;
		        } 
		        console.log('\n');
		        console.log('There are ' + newSecurities.length + ' new securities');

		        console.log(_.map(newSecurities, 'ticker'));

		        // Complete new securities (add name, figi_ticker items)
		        updateNewSecurities(newSecurities, function(err){
		        	if (err) {
		        		console.log(err);
		        	} else {
		        		console.log('Complete adding name, figi_tickers on all new securities');
		        		cb(null, newSecurities);
		        	}
		        });
		   	});
		});
    }); 

}




function updateNewSecurities (newSecurities, cb) {

	async.eachSeries(newSecurities, function (newSecurity, next) {
		completeSecuritiy(newSecurity, function(err){
			next();
		});

	}, function (err){
	    if (err) {
	        console.error('Error: ' + err.message);
	        cb(err);
	        return;
	    }
	    cb(null);
	});

}


function completeSecuritiy (newSecurity, cb) {

	var ticker = newSecurity.ticker;

	var url = Config.intrinio_base_url + 'securities';
	var qs = {'identifier' : ticker};

	request(
	    {   url : url,
	        headers : {"Authorization" : Config.intrinio_header},
	        qs: qs
	    },
	    function (error, response, body) {
	    	if (error) {
	    		console.log(error);
	    		cb(error);
	    		return;
	    	}
	    	var json =  JSON.parse(body);

	    	newSecurity.name = json.security_name;
	    	newSecurity.figi_ticker = json.figi_ticker

	        newSecurity.save(function(err, data) {
	            if (err) {
	                cb(err);
	                console.log(err);
	                return;
	            }
	            console.log('Successfully Update security ' + ticker); 
	            cb(null);
	        });
	    }
	);
}


//////////////  Fetch Historical Prices of new securities ////////////////////////


function fetchPriceHistoriesForSecurities(watches, cb) {

	console.log('\n');
	console.log('******** Start Fetch Historical prices for new securities *******');

	async.eachSeries(watches, function (watch, next)
		{
			var ticker = watch.ticker;
			var startDate;
			if (watch.last_date) {
				startDate = formatDate(watch.last_date);
			} else {
				startDate =  '1996-01-01'; //
			}

			console.log('----- Start Fetch : ' + ticker + ' ----');
			console.log('From ' + startDate);


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
						console.log('----- Finish Fetch : ' + ticker + ' ------');
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
				        console.log('Page %d is saved with duplicating', current_page);
				    } else {
				        console.log('Page %d is saved without duplicating', current_page);
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


////////// Calculate and Update Returns for new securities ////////

function updateReturnHistoriesForSecurities(watches, cb){

	console.log('\n');
	console.log('******** Start Update Historical Returns for new securities *******');

	async.eachSeries(watches, function (watch, next)
		{
			var ticker = watch.ticker;

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


///////// Update Daily return  //////////////




function updateDailyReturnForAllSecurities(date, cb){
	
	console.log('\n');
	console.log('************ Start Update Daily Returns for ' + date + ' ***************');

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

		console.log('The count of today histories is: ' + histories.length);
		console.log('Fetching previous day histories from database...');

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
	            cb(err);
	        } else {

	        	console.log('Fetched ' + previousHistories.length + 'previous day histories');

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
		        	} 
		        }
		        console.log('Calculated and saving returns for all today securities on database....');

		        bulk.execute(function(err1, result) {
			    	if (err) {
		 				console.log('err1');
			            cb(err)
			            return;
				    }
				    console.log('All return is successfully saved on database');
				    cb(null);
				});

	        }
	    });

	});

}






////////// Helper Function //////////////////


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






