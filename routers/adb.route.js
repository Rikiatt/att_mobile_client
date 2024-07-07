const express = require('express');
const { getListDevices, actionADB } = require('../controllers/adb.controller');

const Router = express.Router();

Router.route('/list-devices').get(getListDevices);

Router.route('/action-adb').post(actionADB);

module.exports = Router;
