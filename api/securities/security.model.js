var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var securitySchema = new Schema({
  ticker: {type: String, index: { unique: true }},
  name: String,
  figi_ticker: String,
  last_date: Date,
  is_trading: {type: Boolean, index: true}
}, {collection: 'securities'});


module.exports = mongoose.model('Security', securitySchema);