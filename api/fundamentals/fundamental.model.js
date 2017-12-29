var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var fundamentalSchema = new Schema({
	
  ticker: {type: String, index: { unique: true }},
  basiceps: Number,
  roa: Number,
  dividendyield: Number,
  debttoequity: Number,
  debttoebitda: Number,
  short_interest: Number,
  weightedavebasicsharesos: Number,
  last_updated: Date

}, {collection: 'fundamentals' });

module.exports = mongoose.model('Fundamental', fundamentalSchema);