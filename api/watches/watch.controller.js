var Config = require('../../config');
var Watch = require('./watch.model.js');
var Security = require('../securities/security.model.js');
var request = require('request');
var moment = require('moment');
var async = require('async');

exports.getWatches = function(req, res) {

/*
    Watch.find({ last_date: { $ne: null } }).populate('security').exec(function(err, watches) {
        if (err) {
            res.status(402).send(err);
            return;
        }
        res.json(watches);
    });   

*/

/*
    Watch.find({ last_date: { $ne: null } }).exec(function(err, watches) {
        if (err) {
            res.status(402).send(err);
            return;
        }
        res.json(watches);
    });   

 */

	Security.find({ last_date: { $ne: null } }).sort({ticker: 1}).exec(function(err, watches) {
	    if (err) {
	        res.status(402).send(err);
	        return;
	    }
	    res.json(watches);
	});  

}


exports.getAllWatches = function(req, res) {

/*
    Watch.find({}).populate('security').exec(function(err, watches) {
        if (err) {
            res.status(402).send(err);
            return;
        }
        res.json(watches);
    });  
*/
    Watch.find({}).sort({ticker: 1}).exec(function(err, watches) {
        if (err) {
            res.status(402).send(err);
            return;
        }
        res.json(watches);
    });  
}

/*
exports.getWatchByTicker = function(req, res) {

    Watch.find({ticker: req.params.ticker}, function(err, watches) {
        if (err) {
            res.status(402).send(err);
            return;
        }
	    if(watches.length == 0) {
	        res.status(403).send('There is no Watch for this ticket')
	        return;
	    }
        res.json(watches[0]);
    });   
}
*/

exports.newWatch = function(req, res) {

	console.log(req.body);

    if( (req.body.ticker == '' || req.body.ticker == null) ) {
        res.status(405).send('Missing Parameter');

    } else {
	    Watch.find({ticker: req.body.ticker}, function(err, watches) {
	        if (err) {
	            res.status(402).send(err);
	            return;
	        }
		    if(watches.length == 0) {

		    	Security.find({ticker: req.body.ticker}, function(err, securities) {
			        if (err) {
			            res.status(402).send(err);
			            return;
			        }
				    if(securities.length == 0) {

				    	res.status(405).send('Invalid Parameter');
				    	return;

				    } else {
				    	
				    	var newWatch = new Watch({
				        	ticker: req.body.ticker,
				        	name: securities[0].name,
				        	security: securities[0]._id,
				        	last_date: null
				        });
				        newWatch.save(function(err, data) {
				            if (err) {
				                res.status(402).send(err);
				                return;
				            } 
				            res.json(data);
				        });
				    }
			    }); 

		    } else {
		    	res.json(watches[0]);
		    }
	    }); 
    }
}


/*
exports.fetchWatches = function(req, res) {
	Security.find({}, function(err, securities) {
        if (err) {
            res.status(402).send(err);
            return;
        }

    	var watchArray = securities.map ( obj => new Watch({ticker: obj.ticker,
    														name: obj.name,
        													security: obj._id,
        													last_date: null }) );

    	Watch.collection.insertMany(watchArray, {ordered: false}, function (err, docs) {

		    if (err) {
		        console.log('Watches was saved with some duplicated errors.');
		    } else {
		        console.log('watches was saved without duplicated errors.');
		    }
		    res.json('success');

		});

    }); 
}
*/


var errNumbers = [];

function pageSeriesFetch(exchangeSymbol, pageNumbers, main_cb) {

	async.eachSeries(pageNumbers, function (page_number, next)
		{
		    fetchWatchesInPage(exchangeSymbol, page_number, (err, total_pages) =>
		    {
		    	if (err) {
		    		console.log('%d is not saved', page_number);
		    		errNumbers.push(page_number);
		    	}
		        next();
		    });
		}, function (err)
		{
		    if (err)
		    {
		        console.error('Error: ' + err.message);
		        return;
		    }

		    if (errNumbers.length === 0) {
		    	main_cb();
		    } else {
		    	console.log('There are some pages to be saved');
		    	console.log(errNumbers);
		    	pageSeriesFetch(exchangeSymbol, errNumbers, main_cb);
		    	errNumbers = [];
		    }
		 
		});
}


exports.fetchWatches = function(req, res) {

	Watch.remove({}, function (err) {
	    
	    if (err) {
	    	console.log(err);
	    	res.json('Remove Watch Error');
	    }
	    else {
	    	console.log('*********** Removed all watches ***********');

	    	var exch_symbols = ['^XNYS', '^BATS', '^XNAS'];

			async.eachSeries(exch_symbols, function (exch_symbol, next)
			{
				console.log(new Date);
				console.log('********* Start Fetch ' + exch_symbol + ' watches **************');

				fetchWatchesInPage(exch_symbol, 1, (err, total_pages) => {

					if (err) {
						console.log(err);
						res.json('fail');
						return;
					} 
					console.log('Total Count : ' + total_pages);
					var pageNumberArray = [];
					if (total_pages > 1) {
						for (var i = 2; i <= total_pages; i++) {
						    pageNumberArray.push(i);
						}
					}

					pageSeriesFetch(exch_symbol, pageNumberArray, function() {
						console.log('********* Finish Fetch ' + exch_symbol + ' **************');
						console.log(new Date);
						next();
					});

				});

			}, function (err)
			{
			    if (err)
			    {
			        console.error('Error: ' + err.message);
			        return;
			    }
			    res.json('success');
			 
			});
	       
	    }
	});
}

function fetchWatchesInPage (exchangeSymbol, pageNumber, cb) {
	
	var url = Config.intrinio_base_url + 'prices/exchange';
	var priceDate = '2017-12-19';  //formatDate(new Date());
	console.log('Fetch Page for ' + exchangeSymbol + ': ' + pageNumber);
	console.log(priceDate);

	var qs = {'page_number' : pageNumber,
              'identifier' : exchangeSymbol,
          	  'price_date' : priceDate};
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

	    	var jsonArray = JSON.parse(body).data;
	    	var total_pages = JSON.parse(body).total_pages;


			async.eachSeries(jsonArray, function (json, next)
			{
				Security.findOne({'ticker' : json.ticker}, function(error1, security){
				    if (error1) {
				    	console.log('error when find ' + json.ticker + ' in the securities');
				    	console.log(error1);
				    	next();
				    	return;
				    } 
				    if (!security) {
				    	addNewSecurity(json.ticker, function (error2, newSecurity) {
				    		if (error2) {
				    			console.log('skip add watch: '+ json.ticker);
				    			console.log(error2);
				    			next();

				    		} else {
						    	var instance =	new Watch({ticker: newSecurity.ticker,
															name: newSecurity.name,
															security: newSecurity._id});

					    		instance.save(function(error3, data) {
						            if (error3) {
						            	console.log(error3);
						            	console.log('error when saving '+ newSecurity.ticker);
						            } else {
						            	console.log('create watch ' + newSecurity.ticker);
						            } 

						            next();
						        });
				    		}
				    	});
				    } else {
				    	var instance =	new Watch({ticker: security.ticker,
													name: security.name,
													security: security._id});

			    		instance.save(function(err, data) {
				            if (err) {
				            	console.log(err);
				            	console.log('error when saving '+ security.ticker);
				            }  else {
				            	console.log('create watch ' + security.ticker);
				            }
				            next();
				        });

				    }
				});

			}, function (err)
			{
			    if (err)
			    {
			        console.error('Error: ' + err.message);
			    }
			    cb(null, total_pages);
			});
	    }
	); 
}


function addNewSecurity (ticker, cb) {

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
	    		cb(error, null);
	    		return;
	    	}
	    	var json =  JSON.parse(body);
	    	var newSecurity = new Security({
	        	ticker: json.ticker,
	        	name: json.security_name,
	        	figi_ticker: json.figi_ticker,
	        	last_date: null
	        });
	        newSecurity.save(function(err, data) {
	            if (err) {
	                cb(err, null);
	                console.log(err);
	                return;
	            }
	            console.log(' *********** Create new security ' + ticker + ' ***********'); 
	            cb(null, newSecurity);
	        });
	    }
	);
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




