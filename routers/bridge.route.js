const express = require('express');
const Router = express.Router();
const { getVersion, localdata } = require('../controllers/bridge.controller');

Router.route('/version').get(getVersion);
Router.route('/local-data').post(localdata);

module.exports = Router;
