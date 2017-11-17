var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var securitySchema = new Schema({
  ticker: {type: String, index: { unique: true }},
  name: String,
  figi_ticker: String
}, {collection: 'securities'});


module.exports = mongoose.model('Securities', securitySchema);