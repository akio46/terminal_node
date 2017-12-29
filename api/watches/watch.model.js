var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var watchSchema = new Schema({

	security: {	type: mongoose.Schema.Types.ObjectId,
		        ref: 'Security',
		        index: { unique: true }
	    	  },
	ticker: String,
	name: String,
	last_date: Date

}, {collection: 'watches'});

module.exports = mongoose.model('Watch', watchSchema);