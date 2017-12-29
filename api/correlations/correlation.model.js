var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var correlationSchema = new Schema({
	
  ticker1: String,
  ticker2: String,
  coefficient: Number,
  date_from: Date,
  date_to: Date,
  n: Number,
  sum_x2: Number,
  sum_y2: Number,
  sum_xy: Number,
  sum_x: Number,
  sum_y: Number

}, {collection: 'correlations' });

correlationSchema.index({ticker1: 1, ticker2: 1}, {unique: true});

module.exports = mongoose.model('Correlation', correlationSchema);