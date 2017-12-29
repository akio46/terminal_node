'use strict';

var express = require('express');
var config = require('../../config');
var controller = require('./correlation.controller');

var router = express.Router();

// router.get('/', controller.getAllHistories);
// router.put('/', controller.updateHistories);
 router.get('/:ticker', controller.getThreeCorrelationsByTicker);
 router.post('/fetch', controller.createCorrelations);

module.exports = router;