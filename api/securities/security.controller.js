var Config = require('../../config');
var Security = require('./security.model.js');
var request = require('request');
var moment = require('moment');
var async = require('async');

exports.getSecurities = function(req, res) {

    Security.find({}, function(err, securities) {
        if (err) {
            res.status(402).send(err);
            return;
        }
        res.json(securities);
    });   
}

exports.getSecurityByTicker = function(req, res) {

    Security.find({ticker: req.params.ticker}, function(err, securities) {
        if (err) {
            res.status(402).send(err);
            return;
        }
	    if(securities.length == 0) {
	        res.status(403).send('There is no security for this ticket')
	        return;
	    }
        res.json(securities[0]);
    });   
}

exports.newSecurity = function(req, res) {

    if( (req.body.ticker == '' || req.body.ticker == null) || (req.body.name == '' || req.body.name == null) ) {
        res.status(405).send('Missing Parameter');

    } else {
	    Security.find({ticker: req.body.ticker}, function(err, securities) {
	        if (err) {
	            res.status(402).send(err);
	            return;
	        }
		    if(securities.length == 0) {
		    	var newSecurity = new Security({
		        	ticker: req.body.ticker,
		        	name: req.body.security_name,
		        	figi_ticker: req.body.figi_ticker
		        });
		        newSecurity.save(function(err, data) {
		            if (err) {
		                res.status(402).send(err);
		                return;
		            } 
		            res.json(data);
		        });
		    } else {
		    	securities[0].update({$set: {
		        	ticker: req.body.ticker,
		        	name: req.body.security_name,
		        	figi_ticker: req.body.figi_ticker
                }}, function(err) {
                    if (err){
                        res.status(402).send(err);
                        return;
                    }
                    res.json(securities[0]);
                });
		    }
	    }); 
    }
}

var errNumbers = [];

function seriesFetch(numbers, main_cb) {
	async.eachSeries(numbers, function (page_number, next)
		{
		    fetchSecuritiesInPage(page_number, (err, total_pages) =>
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
		    	seriesFetch(errNumbers, main_cb);
		    	errNumbers = [];
		    }
		 
		});

}

exports.fetchSecurities = function(req, res) {

	console.log('Start Fetch.....');
	console.log(new Date);

	fetchSecuritiesInPage(1, (err, total_pages) => {
		if (err) {
			console.log(err);
			res.json('fail');
			return;
		} 
		console.log(total_pages);
		var pageNumberArray = [];
		if (total_pages > 1) {
			for (var i = 2; i <= total_pages; i++) {
			    pageNumberArray.push(i);
			}
		}

		seriesFetch(pageNumberArray, function() {
			console.log('Finish Fetch.....');
			console.log(new Date);
			res.json('success');
		});

	});

}

function fetchSecuritiesInPage (pageNumber, cb) {
	
	var url = Config.intrinio_base_url + 'securities';

	var qs = {'page_number' : pageNumber,
              'exch_symbol' : '^XSES'};
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
	    	var current_page = JSON.parse(body).current_page;

	    	var securityArray = jsonArray.map ( obj => new Security({ticker: obj.ticker,
														        	 name: obj.security_name,
														        	 figi_ticker: obj.figi_ticker
														        	 }) );

	    	Security.collection.insertMany(securityArray, {ordered: false}, function (err, docs) {

			    if (err) {
			        console.log('securities in Page %d was saved with some duplicated errors.', current_page);
			    } else {
			        console.log('securities in Page %d was saved without duplicated errors.', current_page);
			    }
			    cb(null, total_pages);
			});
	    }
	); 
}


