const express = require('express');
const { actionHideDev } = require('../controllers/hideDev.controller');
const ipWhitelist = require('../middlewares/ipWhitelist');

const Router = express.Router();

Router.route('/action-hide-dev').post(ipWhitelist, actionHideDev);

module.exports = Router;