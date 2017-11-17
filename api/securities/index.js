'use strict';

var express = require('express');
var config = require('../../config');
var controller = require('./security.controller');

var router = express.Router();

router.get('/', controller.getSecurities);
router.get('/:ticker', controller.getSecurityByTicker);
router.post('/', controller.newSecurity);
router.post('/fetch', controller.fetchSecurities)

module.exports = router;