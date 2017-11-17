var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var historySchema = new Schema({
	
  ticker: String,
  close_price: Number,
  date: String

}, {collection: 'histories' });

historySchema.index({ticker: 1, date: 1}, {unique: true});

module.exports = mongoose.model('Histories', historySchema);