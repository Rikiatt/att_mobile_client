const { listDevice, startADB, delADBImg, clickConfirmVTB, inputPINBIDV, inputPINVTB, 
  copyQRImages, clickSelectImageBAB, clickSelectImageVTB, clickScanQRVTB, 
  clickConfirmScanFaceBIDV, clickScanQRNAB, clickScanQRMB, clickLoginNAB, clickLoginBAB, clickScanQRBAB, clickScanQROCB, clickSelectImageNAB, clickSelectImageMB, clickSelectImageOCB, clickScanQRBIDV, clickSelectImageBIDV, clickConfirmMB, clickConfirmOCB, clickConfirmBIDV, 
  stopAppADBBAB, stopAppADBOCB, startAppADBBAB, startAppADBOCB, stopAppADBBIDV, startAppADBBIDV, stopAppADBNAB, startAppADBNAB, stopAppADBMB, startAppADBMB, stopAppADBVCB, startAppADBVCB, stopAppADBVTB, startAppADBVTB, stopAppADBSHB, startAppADBSHB, 
  tapADB, inputADB, inputADBVTB, checkDeviceNAB, checkDeviceMB, checkDeviceBAB, checkDeviceOCB, checkDeviceBIDV, checkDeviceVTB, checkDeviceFHD, enterADB, tabADB, newlineADB, unlockScreenADB, backHomeADB, keyEventADB, 
  connectTcpIp, disconnectTcpIp,
  trackNABApp, trackMBApp } = require('../functions/adb.function');
const { connectScrcpy, cameraScrcpy } = require('../functions/scrcpy.function');
const responseHelper = require('../helpers/responseHelper');

const mapAction = {
  trackNABApp: trackNABApp,
  trackMBApp: trackMBApp,
  start: startADB,
  delImg: delADBImg,
  clickConfirmVTB: clickConfirmVTB,
  inputPINBIDV: inputPINBIDV,
  inputPINVTB: inputPINVTB,
  copyQRImages: copyQRImages,
  clickSelectImageBAB: clickSelectImageBAB,
  clickSelectImageVTB: clickSelectImageVTB,
  clickScanQRVTB: clickScanQRVTB,  
  clickConfirmScanFaceBIDV: clickConfirmScanFaceBIDV, 
  clickScanQRNAB: clickScanQRNAB,
  clickScanQRMB: clickScanQRMB,
  clickSelectImageNAB: clickSelectImageNAB,
  clickSelectImageMB: clickSelectImageMB,
  clickLoginNAB: clickLoginNAB,
  clickLoginBAB: clickLoginBAB,
  clickScanQRBAB: clickScanQRBAB,
  clickScanQROCB: clickScanQROCB,
  clickSelectImageOCB: clickSelectImageOCB,
  clickConfirmMB: clickConfirmMB,
  clickConfirmOCB: clickConfirmOCB,
  clickScanQRBIDV: clickScanQRBIDV,
  clickSelectImageBIDV: clickSelectImageBIDV,
  clickConfirmBIDV: clickConfirmBIDV,  
  stopBAB: stopAppADBBAB,
  startBAB: startAppADBBAB,
  stopOCB: stopAppADBOCB,
  startOCB: startAppADBOCB,
  stopBIDV: stopAppADBBIDV,
  startBIDV: startAppADBBIDV,
  stopNAB: stopAppADBNAB,
  startNAB: startAppADBNAB,
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
  checkDeviceNAB: checkDeviceNAB,
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
  }
};