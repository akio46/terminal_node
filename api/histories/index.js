'use strict';

var express = require('express');
var config = require('../../config');
var controller = require('./history.controller');

var router = express.Router();

router.get('/', controller.getAllHistories);
router.get('/:ticker', controller.getHistoriesByTicker);
router.put('/daily_price', controller.updateDailyPriceHistories);
router.put('/daily_return', controller.updateDailyReturnHistories);
router.post('/prices', controller.fetchPriceHistories);
router.post('/returns', controller.updateAllReturnHistories);
router.post('/update_missing_returns', controller.completeUpdateReturns);

module.exports = router;