const adb = require('./adb.route');
const device = require('./device.route');
const bridge = require('./bridge.route');
const setting = require('./setting.route');

module.exports = (app) => {
  app.use('/adb', adb);
  app.use('/device', device);
  app.use('/bridge', bridge);
  app.use('/setting', setting);
};
