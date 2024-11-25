const express = require('express');
const Router = express.Router();
const { getVersion, localdata, connectEP } = require('../controllers/bridge.controller');

Router.route('/version').get(getVersion);
Router.route('/local-data').post(localdata);
Router.route('/connect').post(connectEP);

module.exports = Router;
