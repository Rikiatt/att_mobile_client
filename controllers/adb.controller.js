const { listDevice, startADB, delADBImg, clickConfirmADBVTB, inputPINADBVTB, clickSelectImageADBVTB, clickScanQRADBVTB, 
  clickConfirmScanFaceADBBIDV, clickScanQRADBBIDV, clickSelectImageADBBIDV, clickConfirmADBBIDV, 
  stopAppADBBIDV, startAppADBBIDV, stopAppADBMB, startAppADBMB, stopAppADBVCB, startAppADBVCB, stopAppADBVTB, startAppADBVTB, stopAppADBSHB, startAppADBSHB, 
  tapADB, inputADB, inputADBVTB, checkDeviceBIDV, checkDeviceVTB, checkDeviceFHD, enterADB, tabADB, newlineADB, backHomeADB, keyEventADB, 
  connectTcpIp, disconnectTcpIp } = require('../functions/adb.function');
const { connectScrcpy, cameraScrcpy } = require('../functions/scrcpy.function');
const responseHelper = require('../helpers/responseHelper');

const mapAction = {
  start: startADB,
  delImg: delADBImg,
  clickConfirmVTB: clickConfirmADBVTB,
  inputPINVTB: inputPINADBVTB,
  clickSelectImageVTB: clickSelectImageADBVTB,
  clickScanQRVTB: clickScanQRADBVTB,
  clickConfirmScanFaceBIDV: clickConfirmScanFaceADBBIDV,  
  clickScanQRBIDV: clickScanQRADBBIDV,
  clickSelectImageBIDV: clickSelectImageADBBIDV,
  clickConfirmBIDV: clickConfirmADBBIDV,  
  stopBIDV: stopAppADBBIDV,
  startBIDV: startAppADBBIDV,
  stopMB: stopAppADBMB,
  startMB: startAppADBMB,
  stopVCB: stopAppADBVCB,
  startVCB: startAppADBVCB,
  stopVTB: stopAppADBVTB,
  startVTB: startAppADBVTB,
  stopSHB: stopAppADBSHB,
  startSHB: startAppADBSHB,  
  tap: tapADB,
  input: inputADB,
  inputVTB: inputADBVTB,
  checkDeviceBIDV: checkDeviceBIDV,
  checkDeviceVTB: checkDeviceVTB,
  checkDeviceFHD: checkDeviceFHD,
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