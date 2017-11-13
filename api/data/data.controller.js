var Config = require('../../config');
var Data = require('./data.model.js');
var request = require('request');

exports.getAllData = function(req, res) {

    Data.find({}, function(err, data) {
        if (err) {
            res.status(402).send(err);
            return;
        }
        res.json(data);
    });   
}



exports.fetchData = function(req, res) {

	console.log(Config.intrinio_header);
	var url = Config.intrinio_base_url + 'historical_data';
	var qs = {'page_number' : 5};
	request(
	    {
	        url : url,
	        headers : {"Authorization" : Config.intrinio_header},
	        qs: qs
	    },
	    function (error, response, body) {
	    	if (error) {
	    		return console.log(error)
	    	}
	    	var info = JSON.parse(body);
	    	console.log(info);
	    }
	); 
}



