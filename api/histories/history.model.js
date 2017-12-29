var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var historySchema = new Schema({
	
  ticker: {type: String, index: true},
  adj_close_price: Number,
  date: {type: Date, index: true},
  return: Number


}, {collection: 'histories' });

historySchema.index({ticker: 1, date: 1}, {unique: true});

module.exports = mongoose.model('History', historySchema);