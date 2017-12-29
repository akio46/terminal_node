var Config = require('../../config');
var Fundamental = require('./fundamental.model.js');
var Watch = require('../watches/watch.model.js');
var request = require('request');
var moment = require('moment');
var async = require('async');

exports.getAllFfundamentals = function(req, res) {

    Fundamental.find({}, function(err, fundamentals) {
        if (err) {
            res.status(402).send(err);
            return;
        }
        res.json(fundamentals);
    });   
}

exports.getFundamentalsByTicker = function(req, res) {

	var identifier = req.params.ticker;

    Fundamental.find({ticker: identifier}, function(err, fundamentals) {
        if (err) {
            res.status(402).send(err);
            return;
        }

        var instance;
	    if (fundamentals.length == 0) {
	        instance = new Fundamental({ticker: identifier});
	    } else {
	    	instance = fundamentals[0];
	    	if (instance.last_updated) {
		         var latest_date = moment(instance.last_updated);
		         var dateNow = moment(new Date());
		         durationDays = dateNow.diff(latest_date, 'days');
		         console.log('Durations days is ' + durationDays);
		         if (durationDays < 15) {
		         	console.log('So providing Exisiting Data');
		         	 res.json(instance);
		         	 return;
		         }
	    	} 
	    }

		console.log('Start Fetch fundamental data');

	   	var url = Config.intrinio_base_url + 'data_point';
		var itemArray = ['basiceps', 'roa', 'dividendyield', 'debttoequity', 'debttoebitda', 'short_interest', 'weightedavebasicsharesos'];
		var joinedItems = itemArray.join();
		var qs = {'item': joinedItems, 
				  'identifier' : identifier};
		request(
		    {   url : url,
		        headers : {"Authorization" : Config.intrinio_header},
		        qs: qs
		    },
		    function (error, response, body) {
		    	if (error) {
		    		console.log(error);
		    		res.status(500).send(err);
		    		return;
		    	}

		    	console.log(body);

		    	var jsonArray = JSON.parse(body).data;
		    	jsonArray.forEach(function(json) {
				    instance[json.item] = json.value;
				});
				instance.last_updated = new Date();
		        instance.save(function(err, data) {
		            if (err) {
		                res.status(402).send(err);
		                return;
		            } 
		            res.json(instance);
		        });
		    }
		); 

    });   
}


function fetchFundamentals (identifier, cb) {
	
	var url = Config.intrinio_base_url + 'data_point';

	var itemArray = ['basiceps', 'roa', 'dividendyield', 'debttoequity', 'debttoebitda', 'short_interest', 'weightedavebasicsharesos'];
	var joinedItems = itemArray.join();

	var qs = {'item': joinedItems, 
			  'identifier' : identifier};

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

	    	var fundamentalArray = jsonArray.map ( obj => new fundamental({ticker: identifier,
														        	 date: parseDate(obj.date),
														        	 adj_close_price: obj.value
														        	 }) );

	    	fundamental.collection.insertMany(fundamentalArray, {ordered: false}, function (err, docs) {

			    if (err) {
			        console.log('fundamentals in Page %d was saved with some duplicated errors.', current_page);
			    } else {
			        console.log('fundamentals in Page %d was saved without duplicated errors.', current_page);
			    }
			    cb(null, total_pages);
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






