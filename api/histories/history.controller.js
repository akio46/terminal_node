var Config = require('../../config');
var History = require('./history.model.js');
var request = require('request');
var moment = require('moment');
var async = require('async');

exports.getAllHistories = function(req, res) {

    History.find({}, function(err, histories) {
        if (err) {
            res.status(402).send(err);
            return;
        }
        res.json(histories);
    });   
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



var errNumbers = [];

function seriesFetch(identifier, numbers, main_cb) {
	async.eachSeries(numbers, function (page_number, next)
		{
		    fetchHistoriesInPage(identifier, page_number, (err, total_pages) =>
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
		    	seriesFetch(identifier, errNumbers, main_cb);
		    	errNumbers = [];
		    }
		 
		});

}

exports.fetchHistories = function(req, res) {

	console.log('Start Fetch.....');
	console.log(new Date);

	var identifier = req.body.ticker;

	fetchHistoriesInPage(identifier, 1, (err, total_pages) => {
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

		seriesFetch(identifier, pageNumberArray, function() {
			console.log('Finish Fetch.....');
			console.log(new Date);
			res.json('success');
		});

	});

}

function fetchHistoriesInPage (identifier, pageNumber, cb) {
	
	var url = Config.intrinio_base_url + 'historical_data';

	var qs = {'page_number' : pageNumber,
			  'start_date' : '1995-01-01',
			  'item': 'close_price', 
			  'identifier' : identifier };

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

	    	var historyArray = jsonArray.map ( obj => new History({ticker: identifier,
														        	 date: obj.date,
														        	 close_price: obj.value
														        	 }) );

	    	History.collection.insertMany(historyArray, {ordered: false}, function (err, docs) {

			    if (err) {
			        console.log('Histories in Page %d was saved with some duplicated errors.', current_page);
			    } else {
			        console.log('Histories in Page %d was saved without duplicated errors.', current_page);
			    }
			    cb(null, total_pages);
			});
	    }
	); 
}






