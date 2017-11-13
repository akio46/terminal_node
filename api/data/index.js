'use strict';

var express = require('express');
var config = require('../../config');
var controller = require('./data.controller');

var router = express.Router();

router.get('/', controller.getAllData);
router.post('/fetch', controller.fetchData)

module.exports = router;