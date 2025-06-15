const express = require('express');
const { actionHideUSB } = require('../controllers/hideUSB.controller');
const ipWhitelist = require('../middlewares/ipWhitelist');

const Router = express.Router();

Router.route('/action-hide-usb').post(ipWhitelist, actionHideUSB);

module.exports = Router;