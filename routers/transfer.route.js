const express = require('express');
const { actionTransfer } = require('../controllers/transfer.controller');

const Router = express.Router();

Router.route('/action-transfer').post(actionTransfer);

module.exports = Router;