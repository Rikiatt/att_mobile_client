const { listDevice, stopAppADB, startAppADB, tapADB, inputADB, inputADBVTB, checkDevice, enterADB, tabADB, newlineADB, backHomeADB, keyEventADB, connectTcpIp, disconnectTcpIp } = require('../functions/adb.function');
const { connectScrcpy, cameraScrcpy } = require('../functions/scrcpy.function');
const responseHelper = require('../helpers/responseHelper');

const mapAction = {
  stop: stopAppADB,
  start: startAppADB,
  tap: tapADB,
  input: inputADB,
  inputVTB: inputADBVTB,
  checkDevice: checkDevice,
  enter: enterADB,
  tab: tabADB,
  newline: newlineADB,
  keyEvent: keyEventADB,
  home: backHomeADB,
  connect: connectScrcpy,
  camera: cameraScrcpy,
  connectTcpIp: connectTcpIp,
  disconnectTcpIp: disconnectTcpIp
};

module.exports = {
  getListDevices: async (req, res) => {
    try {
      const result = await listDevice();
      responseHelper(res, 200, result);
    } catch (error) {
      console.log(error);
      responseHelper(res, 500, { message: error.message });
    }
  },

  actionADB: async (req, res) => {
    try {      
      const result = await mapAction[req.body.action](req.body);
      console.log(result)

      responseHelper(res, 200, { status: result?.status || 200, valid: result.valid || true, message: result?.message || 'Thành công' });
    } catch (error) {
      console.log('error:', error);

      responseHelper(res, 500, { message: error.message });
    }
  }
};