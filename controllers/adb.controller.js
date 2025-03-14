const { listDevice, startADB, delADBImg, clickConfirmVTB, inputPINVPB, inputPINMSB, inputPINBIDV, inputPINVTB, 
  copyQRImages, clickSelectImageVTB, clickScanQRVTB, 
  clickConfirmScanFaceBIDV, clickScanQRVPB, clickScanQRMSB, clickScanQRNCB, clickLoginNAB, clickLoginBAB, clickScanQRBAB, clickSelectImageNAB, clickSelectImageBAB, clickSelectImageTPB, clickSelectImageVPB, clickSelectImageNCB, clickSelectImageMSB, clickSelectImageMB, clickSelectImageOCB, clickScanQRBIDV, clickSelectImageBIDV, clickConfirmMB, clickConfirmOCB, clickConfirmBIDV, 
  startAppADBACB, stopAppADBACB, stopAppADBOCB, startAppADBOCB, stopAppADBBIDV, startAppADBBIDV, stopAppADBBAB, stopAppADBTPB, stopAppADBVPB, stopAppADBNAB, startAppADBBAB, startAppADBTPB, startAppADBVPB, startAppADBNAB, stopAppADBNCB, startAppADBNCB, startAppADBMSB, stopAppADBMSB, stopAppADBMB, startAppADBMB, stopAppADBVCB, startAppADBVCB, stopAppADBVTB, startAppADBVTB, stopAppADBSHB, startAppADBSHB, 
  tapADB, inputADB, inputADBVTB, checkDeviceACB, checkDeviceNAB, checkDeviceTPB, checkDeviceVPB, checkDeviceMB, checkDeviceNCB, checkDeviceMSB, checkDeviceBAB, checkDeviceOCB, checkDeviceBIDV, checkDeviceVTB, checkDeviceFHD, enterADB, tabADB, newlineADB, unlockScreenADB, backHomeADB, keyEventADB, 
  connectTcpIp, disconnectTcpIp,
  clickLoginACB, clickSelectImageACB, trackACBApp, trackOCBApp, trackNABApp, trackTPBApp, trackVPBApp, trackMSBApp, trackMBApp } = require('../functions/adb.function');
const { connectScrcpy, cameraScrcpy } = require('../functions/scrcpy.function');
const responseHelper = require('../helpers/responseHelper');

const mapAction = {
  clickLoginACB: clickLoginACB,
  clickSelectImageACB: clickSelectImageACB,
  trackOCBApp: trackOCBApp,
  trackACBApp: trackACBApp,
  trackNABApp: trackNABApp,
  trackTPBApp: trackTPBApp,
  trackVPBApp: trackVPBApp,
  trackMBApp: trackMBApp,
  trackMSBApp: trackMSBApp,
  start: startADB,
  delImg: delADBImg,
  clickConfirmVTB: clickConfirmVTB,
  inputPINVPB: inputPINVPB,
  inputPINMSB: inputPINMSB,
  inputPINBIDV: inputPINBIDV,
  inputPINVTB: inputPINVTB,
  copyQRImages: copyQRImages,  
  clickSelectImageVTB: clickSelectImageVTB,
  clickScanQRVTB: clickScanQRVTB,  
  clickConfirmScanFaceBIDV: clickConfirmScanFaceBIDV,   
  clickScanQRVPB: clickScanQRVPB,  
  clickScanQRMSB: clickScanQRMSB,
  clickScanQRNCB: clickScanQRNCB,
  clickSelectImageNAB: clickSelectImageNAB,
  clickSelectImageBAB: clickSelectImageBAB,
  clickSelectImageTPB: clickSelectImageTPB,
  clickSelectImageVPB: clickSelectImageVPB,
  clickSelectImageMB: clickSelectImageMB,
  clickSelectImageMSB: clickSelectImageMSB,
  clickSelectImageNCB: clickSelectImageNCB,
  clickLoginNAB: clickLoginNAB,
  clickLoginBAB: clickLoginBAB,
  clickScanQRBAB: clickScanQRBAB,  
  clickSelectImageOCB: clickSelectImageOCB,
  clickConfirmMB: clickConfirmMB,
  clickConfirmOCB: clickConfirmOCB,
  clickScanQRBIDV: clickScanQRBIDV,
  clickSelectImageBIDV: clickSelectImageBIDV,
  clickConfirmBIDV: clickConfirmBIDV,  
  stopACB: stopAppADBACB,
  startACB: startAppADBACB,    
  stopOCB: stopAppADBOCB,
  startOCB: startAppADBOCB,
  stopBIDV: stopAppADBBIDV,
  startBIDV: startAppADBBIDV,
  stopNAB: stopAppADBNAB,
  stopBAB: stopAppADBBAB,
  startBAB: startAppADBBAB,
  stopTPB: stopAppADBTPB,
  stopVPB: stopAppADBVPB,
  startNAB: startAppADBNAB,
  startTPB: startAppADBTPB,
  startVPB: startAppADBVPB,
  stopMB: stopAppADBMB,
  startMB: startAppADBMB,
  stopNCB: stopAppADBNCB,
  startNCB: startAppADBNCB,
  stopMSB: stopAppADBMSB,
  startMSB: startAppADBMSB,
  stopVCB: stopAppADBVCB,
  startVCB: startAppADBVCB,
  stopVTB: stopAppADBVTB,
  startVTB: startAppADBVTB,
  stopSHB: stopAppADBSHB,
  startSHB: startAppADBSHB,  
  tap: tapADB,
  input: inputADB,
  inputVTB: inputADBVTB,
  checkDeviceACB: checkDeviceACB,
  checkDeviceNAB: checkDeviceNAB,
  checkDeviceTPB: checkDeviceTPB,
  checkDeviceVPB: checkDeviceVPB,
  checkDeviceMB: checkDeviceMB,
  checkDeviceNCB: checkDeviceNCB,
  checkDeviceMSB: checkDeviceMSB,
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