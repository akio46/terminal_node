'use strict';

var express = require('express');
var config = require('../../config');
var controller = require('./cron.controller');

var router = express.Router();

router.post('/', controller.start);

module.exports = router;