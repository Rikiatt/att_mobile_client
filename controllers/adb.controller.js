const { closeAll, listDevice, delADBImg, 
  tapADB, inputADB,  checkDeviceACB, checkDeviceEIB, checkDeviceNAB, checkDeviceTPB, checkDeviceVPB, checkDevice, checkDeviceNCB, checkDeviceMSB, checkDeviceOCB, enterADB, tabADB, newlineADB, unlockScreenADB, backHomeADB, keyEventADB,
  connectTcpIp, disconnectTcpIp }
  = require('../functions/adb.function');
const { connectScrcpy, cameraScrcpy } = require('../functions/scrcpy.function');
const responseHelper = require('../helpers/responseHelper');
const { trackingLoop } = require('../functions/bankStatus.function');

const mapAction = {
  closeAll: closeAll,
  trackingLoop: trackingLoop,  
  delImg: delADBImg,  
  tap: tapADB,
  input: inputADB,    
  checkDeviceACB: checkDeviceACB,
  checkDeviceEIB: checkDeviceEIB,
  checkDeviceNCB: checkDeviceNCB,
  checkDeviceNAB: checkDeviceNAB,
  checkDeviceTPB: checkDeviceTPB,
  checkDeviceVPB: checkDeviceVPB,
  checkDevice: checkDevice,
  checkDeviceMSB: checkDeviceMSB,
  checkDeviceOCB: checkDeviceOCB,
  enter: enterADB,
  tab: tabADB,
  newline: newlineADB,
  keyEvent: keyEventADB,
  home: backHomeADB,
  unlockScreen: unlockScreenADB,
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
      responseHelper(res, 200, { status: result?.status || 200, valid: result.valid || true, message: result?.message || 'Thành công' });
    } catch (error) {
      console.log('error:', error);
      responseHelper(res, 500, { message: error.message });
    }
  }
};