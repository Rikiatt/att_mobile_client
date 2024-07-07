const express = require('express');
const { restart } = require('../controllers/device.controller');

const Router = express.Router();

Router.route('/restart').get(restart);

module.exports = Router;
