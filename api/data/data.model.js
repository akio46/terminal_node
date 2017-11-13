var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var dataSchema = new Schema({
	
  ticker: String,
  close_price: Number,
  percent_change: Number,
  date: Date

}, {collection: 'data' });

module.exports = mongoose.model('Data', dataSchema);