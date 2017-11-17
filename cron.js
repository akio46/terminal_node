// Cron job
var CronJob = require('cron').CronJob;

var job1 = new CronJob('00 * * * * *', function() {
     console.log('job1 started');
     console.log(new Date());
  }, function () {
  	 console.log('job stopped'); 
  },
  true,
  'America/Los_Angeles' 
);

var job2 = new CronJob('30 * * * * *', function() {
     console.log('job2 started');
     console.log(new Date());
  }, function () {
  	 console.log('job stopped');
  },
  true,
  'America/Los_Angeles' 
);

module.exports.job = {
	job1: job1,
	job2: job2
};