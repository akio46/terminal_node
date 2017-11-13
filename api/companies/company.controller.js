var Config = require('../../config');
var Company = require('./company.model.js');
var request = require('request');
var moment = require('moment');
var async = require('async');

exports.getCompanies = function(req, res) {

    Company.find({}, function(err, companies) {
        if (err) {
            res.status(402).send(err);
            return;
        }
        res.json(companies);
    });   
}

exports.getCompanyByTicker = function(req, res) {

    Company.find({ticker: req.params.ticker}, function(err, companies) {
        if (err) {
            res.status(402).send(err);
            return;
        }
	    if(companies.length == 0) {
	        res.status(403).send('There is no company for this ticket')
	        return;
	    }
        res.json(companies[0]);
    });   
}

exports.newCompany = function(req, res) {

    if( (req.body.ticker == '' || req.body.ticker == null) || (req.body.name == '' || req.body.name == null) ) {
        res.status(405).send('Missing Parameter');

    } else {
	    Company.find({ticker: req.body.ticker}, function(err, companies) {
	        if (err) {
	            res.status(402).send(err);
	            return;
	        }
		    if(companies.length == 0) {
		    	var newCompany = new Company({
		        	ticker: req.body.ticker,
		        	name: req.body.name,
		        	cik: req.body.cik,
		        	lei: req.body.lei,
		        	latest_filing_date: req.body.latest_filing_date
		        });
		        newCompany.save(function(err, data) {
		            if (err) {
		                res.status(402).send(err);
		                return;
		            } 
		            res.json(data);
		        });
		    } else {
		    	companies[0].update({$set: {
		        	ticker: req.body.ticker,
		        	name: req.body.name,
		        	cik: req.body.cik,
		        	lei: req.body.lei,
		        	latest_filing_date: req.body.latest_filing_date
                }}, function(err) {
                    if (err){
                        res.status(402).send(err);
                        return;
                    }
                    res.json(companies[0]);
                });
		    }
	    }); 
    }
}

var errNumbers = [];

function abc(numbers, main_cb) {
	async.eachSeries(numbers, function (page_number, next)
		{
		    fetchCompaniesInPage(page_number, (err, total_pages) =>
		    {
		    	if (err) {
		    		console.log('%d is not saved', page_number);
		    		errNumbers.push(page_number);
		    	}
		   //      if (err)
		   //      {
					// console.log(err);
					// res.json('fail');
		   //          next(err);
		   //      }
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
		    	console.log('Finished!');
		    	main_cb();
		    } else {
		    	console.log('There are some pages to be saved');
		    	console.log(errNumbers);
		    	abc(errNumbers, main_cb);
		    	errNumbers = [];
		    }
		 
		});

}

exports.fetchCompanies = function(req, res) {

	fetchCompaniesInPage(1, (err, total_pages) => {
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

		abc(pageNumberArray, function() {

		});

	});

}

function fetchCompaniesInPage (pageNumber, cb) {
	
	var url = Config.intrinio_base_url + 'companies';

	var qs = {'page_number' : pageNumber};
	request(
	    {   url : url,
	        headers : {"Authorization" : Config.intrinio_header},
	        qs: qs
	    },
	    function (error, response, body) {
	    	if (error) {
	    		console.log(error);
	    		cb(error, null, pageNumber);
	    		return;
	    	}

	    	console.log("There are body");

	    	var jsonArray = JSON.parse(body).data;
	    	var total_pages = JSON.parse(body).total_pages;
	    	var current_page = JSON.parse(body).current_page;
	    	Company.collection.insertMany(jsonArray, {ordered: false}, function (err, docs) {

			    if (err) {
			        console.log('Companies in Page %d was saved with some duplicated errors.', current_page);
			    } else {
			        console.log('Companies in Page %d was saved without duplicated errors.', current_page);
			    }
			    cb(null, total_pages);
			});
	    }
	); 


}


