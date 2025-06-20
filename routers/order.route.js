const express = require('express');
const { getOrder } = require('../controllers/order.controller');

const Router = express.Router();

Router.get('/get-order', getOrder);

module.exports = Router;