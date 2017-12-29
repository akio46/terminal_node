module.exports = function(app) {

	// ROUTES FOR OUR API
	// =============================================================================

	// middleware to use for all requests

	app.use(function(req, res, next) {
		// do logging
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
		res.header("Access-Control-Allow-Methods", "PUT, POST, GET, PATCH, DELETE");
		next();
	});

	app.use('/api/companies', require('./api/companies'));
	app.use('/api/securities', require('./api/securities'));
	app.use('/api/histories', require('./api/histories'));
	app.use('/api/watches', require('./api/watches'));
	app.use('/api/fundamentals', require('./api/fundamentals'));
	app.use('/api/correlations', require('./api/correlations'));
	app.use('/api/cron', require('./api/cron'));
};