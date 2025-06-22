const express = require('express');
const { getOrder, clearOrder } = require('../controllers/order.controller');

const Router = express.Router();

Router.get('/get-order', getOrder);
Router.post('/clear', clearOrder);

module.exports = Router;