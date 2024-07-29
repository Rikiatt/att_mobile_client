const express = require('express');
const { restart, stopShare, startShare } = require('../controllers/device.controller');

const Router = express.Router();

Router.route('/restart').get(restart);
Router.route('/stop-share').get(stopShare);
Router.route('/start-share').get(startShare);

module.exports = Router;
