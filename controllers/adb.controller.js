const { listDevice, startADB, delADBImg, clickConfirmADBVTB, inputPINADBBIDV, inputPINADBVTB, clickSelectImageADBBAB, clickSelectImageADBVTB, clickScanQRADBVTB, 
  clickConfirmScanFaceADBBIDV, clickScanQRADBMB, clickLoginADBBAB, clickScanQRADBBAB, clickScanQRADBOCB, clickSelectImageADBMB, clickSelectImageADBOCB, clickScanQRADBBIDV, clickSelectImageADBBIDV, clickConfirmADBMB, clickConfirmADBOCB, clickConfirmADBBIDV, 
  stopAppADBBAB, stopAppADBOCB, startAppADBBAB, startAppADBOCB, stopAppADBBIDV, startAppADBBIDV, stopAppADBMB, startAppADBMB, stopAppADBVCB, startAppADBVCB, stopAppADBVTB, startAppADBVTB, stopAppADBSHB, startAppADBSHB, 
  tapADB, inputADB, inputADBVTB, checkDeviceMB, checkDeviceBAB, checkDeviceOCB, checkDeviceBIDV, checkDeviceVTB, checkDeviceFHD, enterADB, tabADB, newlineADB, unlockScreenADB, backHomeADB, keyEventADB, 
  connectTcpIp, disconnectTcpIp,
  trackMBApp } = require('../functions/adb.function');
const { connectScrcpy, cameraScrcpy } = require('../functions/scrcpy.function');
const responseHelper = require('../helpers/responseHelper');

const mapAction = {
  trackMBApp: trackMBApp,
  start: startADB,
  delImg: delADBImg,
  clickConfirmVTB: clickConfirmADBVTB,
  inputPINBIDV: inputPINADBBIDV,
  inputPINVTB: inputPINADBVTB,
  clickSelectImageBAB: clickSelectImageADBBAB,
  clickSelectImageVTB: clickSelectImageADBVTB,
  clickScanQRVTB: clickScanQRADBVTB,  
  clickConfirmScanFaceBIDV: clickConfirmScanFaceADBBIDV, 
  clickScanQRMB: clickScanQRADBMB,
  clickSelectImageMB: clickSelectImageADBMB,
  clickLoginBAB: clickLoginADBBAB,
  clickScanQRBAB: clickScanQRADBBAB,
  clickScanQROCB: clickScanQRADBOCB,
  clickSelectImageOCB: clickSelectImageADBOCB,
  clickConfirmMB: clickConfirmADBMB,
  clickConfirmOCB: clickConfirmADBOCB,
  clickScanQRBIDV: clickScanQRADBBIDV,
  clickSelectImageBIDV: clickSelectImageADBBIDV,
  clickConfirmBIDV: clickConfirmADBBIDV,  
  stopBAB: stopAppADBBAB,
  startBAB: startAppADBBAB,
  stopOCB: stopAppADBOCB,
  startOCB: startAppADBOCB,
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
  checkDeviceMB: checkDeviceMB,
  checkDeviceBAB: checkDeviceBAB,
  checkDeviceOCB: checkDeviceOCB,
  checkDeviceBIDV: checkDeviceBIDV,
  checkDeviceVTB: checkDeviceVTB,
  checkDeviceFHD: checkDeviceFHD,
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
  },

  actionADB2: (req, res) => {
    try {      
      const result = mapAction[req.body.action](req.body);           

      responseHelper(res, 200, { status: result?.status || 200, valid: result.valid || true, message: result?.message || 'Thành công' });
    } catch (error) {
      console.log('error:', error);

      responseHelper(res, 500, { message: error.message });
    }
  }
};