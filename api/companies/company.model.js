var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var companySchema = new Schema({
  ticker: {type: String, index: { unique: true }},
  name: String,
  lei: String,
  cik: String,
  latest_filing_date: String

}, {collection: 'companies'});

module.exports = mongoose.model('Companies', companySchema);