const express = require('express');
const { actionBank } = require('../controllers/bank.controller');

const Router = express.Router();

Router.route('/action-bank').post(actionBank);

module.exports = Router;
