const express = require('express');
const { restart, stopShare, startShare, get_qr } = require('../controllers/device.controller');

const Router = express.Router();

Router.route('/restart').get(restart);
Router.route('/stop-share').get(stopShare);
Router.route('/start-share').get(startShare);
Router.route('/get-qr').get(get_qr);

module.exports = Router;
