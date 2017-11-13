'use strict';

var express = require('express');
var config = require('../../config');
var controller = require('./company.controller');

var router = express.Router();

router.get('/', controller.getCompanies);
router.get('/:ticker', controller.getCompanyByTicker);
router.post('/', controller.newCompany);
router.post('/fetch', controller.fetchCompanies)

module.exports = router;