var Config = require('../../config');
var Security = require('./security.model.js');
var request = require('request');
var moment = require('moment');
var async = require('async');
var History = require('../histories/history.model.js');


exports.getSecurities = function(req, res) {


    // Security.find({}, function(err, securities) {
    //     if (err) {
    //         res.status(402).send(err);
    //         return;
    //     }
    //     res.json(securities);
    // });  


    // For multiple update

    Security.update({ticker: {$gt : 'ECCZ'}}, {$set: { last_date: null }}, { multi: true }, function(err, docs){
    	if (err) {
            res.status(402).send(err);
            return;
        }
        console.log(docs);
        res.json(docs);
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






exports.updateTradingSecurities = function(req, res) {

	var date = req.body.date;
	var today = parseDate(date);

	console.log('\n');
	console.log('************ Start Update Watchlist(trading securities) for ' + date + ' ***************');

    // Set all Securities is_trading as FALSE
	Security.update({}, {$set: { is_trading: false }}, { multi: true }, function(err, result){
    	if (err) {
            res.status(402).send(err);
            return;
        }
        console.log(result);

        // Find the today's securities (trading securities),  create and update is_trading as TRUE
    	History.find({date: today}).sort({ticker:1}).exec(function(err, tradingArray) {
            if (err) {
	            res.status(402).send(err);
	            return;
	        }
		    if(tradingArray.length == 0) {
		        res.status(403).send('There is no security for this date')
		        return;
		    }

		    console.log(tradingArray.length);

		    console.log('Updating trading securities on database...');
		    var bulk = Security.collection.initializeOrderedBulkOp();
		    for (var i = 0; i < tradingArray.length; i++) {
		    	var tradingSecurity = tradingArray[i];

			    bulk.find({ 'ticker': tradingSecurity.ticker }).upsert().updateOne({ 
			        "$set": { 'ticker': tradingSecurity.ticker,
			        		  'is_trading': true }
			    });
		    }
		    bulk.execute(function(err, result) {
		    	if (err) {
		    		console.log(err);
		    		res.json('fail');
		            return;
			    }
			   	console.log('Create or Update all securities are marked as is_trading');
			   	
			   	// Find new additional securities
			   	console.log('Finding new securities...');
			   	Security.find({is_trading: true, name: null}).sort({ticker:1}).exec(function(err, newSecurities){
					if (err) {
			            res.status(402).send(err);
			            return;
			        } 
			        console.log('There are ' + newSecurities.length + ' new securities');

			        // Complete new securities (add name, figi_ticker items)
			        updateNewSecurities(newSecurities, function(err){
			        	if (err) {
			        		console.log(err);
			        	} else {
			        		console.log('Complete new securities');
			        		res.json('success');
			        	}
			        });
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

//////// Remove relisted securities //////////

function removeRelistedSecurity (ticker, cb) {

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






