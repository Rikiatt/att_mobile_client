const express = require('express');
const { getVersion } = require('../controllers/bridge.controller');
const Router = express.Router();

Router.route('/version').get(getVersion);

module.exports = Router;
