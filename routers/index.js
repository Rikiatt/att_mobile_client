const adb = require('./adb.route');
const bank = require('./bank.route');
const device = require('./device.route');
const bridge = require('./bridge.route');
const setting = require('./setting.route');

module.exports = (app) => {
  app.use('/adb', adb);
  app.use('/bank', bank);
  app.use('/device', device);
  app.use('/bridge', bridge);
  app.use('/setting', setting);  
};