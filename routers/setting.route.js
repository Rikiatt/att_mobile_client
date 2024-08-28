const express = require('express'); 
const { get_setting } = require('../controllers/setting.controller');
const Router = express.Router();
 
Router.route('/').get(get_setting);

module.exports = Router;
