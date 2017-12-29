'use strict';

var express = require('express');
var config = require('../../config');
var controller = require('./fundamental.controller');

var router = express.Router();

router.get('/:ticker', controller.getFundamentalsByTicker);
// router.post('/fetch', controller.fetchfundamentals);

module.exports = router;