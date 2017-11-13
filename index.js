var express = require('express')
var app = express()


var config = require('./config');
var mongoose = require('mongoose');

app.set('port', (process.env.PORT || 5000))
app.use(express.static(__dirname + '/public'))


// CREATE OUR ROUTER
require('./route')(app);

mongoose.connect(config.database); // connect to database

var db = mongoose.connection;
db.on('error', function(err){
	console.log('DB connection failed with error:', err);
});
db.once('open', function(){
	console.log('DB connected');
})


app.get('/', function(req, res) {
  res.send('Hellffffo World!')
})


app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
})
