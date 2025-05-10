const express = require('express');
const { 
    restart, 
    stopShare, 
    startShare, 
    get_qr, 
    download_qr_for_account
} = require('../controllers/device.controller');

const Router = express.Router();

Router.route('/restart').get(restart);
Router.route('/stop-share').get(stopShare);
Router.route('/start-share').get(startShare);
Router.route('/get-qr').get(get_qr);
Router.route('/download_qr_for_account').get(download_qr_for_account);

module.exports = Router;
