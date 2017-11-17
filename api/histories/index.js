'use strict';

var express = require('express');
var config = require('../../config');
var controller = require('./history.controller');

var router = express.Router();

router.get('/', controller.getAllHistories);
router.get('/:ticker', controller.getHistoriesByTicker);
router.post('/fetch', controller.fetchHistories);

module.exports = router;