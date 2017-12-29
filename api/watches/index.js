'use strict';

var express = require('express');
var config = require('../../config');
var controller = require('./watch.controller');

var router = express.Router();

 router.get('/', controller.getWatches);
 router.get('/all', controller.getAllWatches);
router.post('/', controller.newWatch);
router.post('/fetch', controller.fetchWatches);


module.exports = router;