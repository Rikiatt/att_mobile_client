const { listDevice, startADB, delADBImg, clickConfirmVTB, inputPINVPB, inputPINMSB, inputPINBIDV, inputPINVTB, 
  copyQRImages, scanQRVTB, clickScanQRVTB, 
  clickConfirmScanFaceBIDV, scanQRVPB2, scanQRVPB, clickScanQRMSB, clickScanQRNCB, clickLoginNAB, scanQRNAB, scanQRBAB, scanQRTPB, scanQRNCB, clickSelectImageMSB, scanQRMB, scanQROCB, scanQRSHBSAHA, clickScanQRBIDV, clickSelectImageBIDV, clickConfirmMB, clickConfirmOCB, clickConfirmBIDV, 
  startAppADBACB, stopAppADBACB, stopAppADBEIB, startAppADBEIB, stopAppADBOCB, startAppADBOCB, stopAppADBBIDV, startAppADBBIDV, stopAppADBBAB, stopAppADBTPB, stopAppADBVPB, stopAppADBNAB, startAppADBBAB, startAppADBTPB, startAppADBVPB, startAppADBNAB, stopAppADBNCB, startAppADBNCB, startAppADBMSB, stopAppADBMSB, stopAppADBMB, startAppADBMB, stopAppADBVCB, startAppADBVCB, stopAppADBVTB, startAppADBVTB, stopAppADBSHBSAHA, startAppADBSHBSAHA, 
  tapADB, inputADB, inputADBVTB, checkDeviceACB, checkDeviceEIB, checkDeviceNAB, checkDeviceTPB, checkDeviceVPB, checkDeviceMB, checkDeviceNCB, checkDeviceMSB, checkDeviceBAB, checkDeviceOCB, checkDeviceBIDV, checkDeviceVTB, checkDeviceFHD, enterADB, tabADB, newlineADB, unlockScreenADB, backHomeADB, keyEventADB, 
  connectTcpIp, disconnectTcpIp,
  closeAll, clickLoginACB, scanQRACB, scanQREIB, clickPasswordFieldEIB, trackACB, trackEIB, trackOCB, trackNAB, trackTPB, trackVPB, trackMSB, trackMB, trackSHBSAHA } = require('../functions/adb.function');
const { connectScrcpy, cameraScrcpy } = require('../functions/scrcpy.function');
const responseHelper = require('../helpers/responseHelper');

const mapAction = {  
  closeAll: closeAll,
  clickLoginACB: clickLoginACB,  
  scanQRACB: scanQRACB,
  scanQRBAB: scanQRBAB,
  scanQREIB: scanQREIB,
  scanQROCB: scanQROCB,
  clickScanQRNCB: clickScanQRNCB,
  scanQRNCB: scanQRNCB,
  scanQRNAB: scanQRNAB,  
  scanQRTPB: scanQRTPB,
  scanQRVPB2: scanQRVPB2,
  scanQRVPB: scanQRVPB,
  scanQRMB: scanQRMB,
  scanQRSHBSAHA: scanQRSHBSAHA,    
  clickPasswordFieldEIB: clickPasswordFieldEIB,
  trackACB: trackACB,
  trackEIB: trackEIB,
  trackOCB: trackOCB,  
  trackNAB: trackNAB,
  trackTPB: trackTPB,
  trackVPB: trackVPB,
  trackMB: trackMB,
  trackMSB: trackMSB,
  trackSHBSAHA: trackSHBSAHA,                
  start: startADB,
  delImg: delADBImg,
  clickConfirmVTB: clickConfirmVTB,
  inputPINVPB: inputPINVPB,
  inputPINMSB: inputPINMSB,
  inputPINBIDV: inputPINBIDV,
  inputPINVTB: inputPINVTB,
  copyQRImages: copyQRImages,  
  scanQRVTB: scanQRVTB,
  clickScanQRVTB: clickScanQRVTB,  
  clickConfirmScanFaceBIDV: clickConfirmScanFaceBIDV,       
  clickScanQRMSB: clickScanQRMSB,    
  clickSelectImageMSB: clickSelectImageMSB,  
  clickLoginNAB: clickLoginNAB,    
  clickConfirmMB: clickConfirmMB,
  clickConfirmOCB: clickConfirmOCB,
  clickScanQRBIDV: clickScanQRBIDV,
  clickSelectImageBIDV: clickSelectImageBIDV,
  clickConfirmBIDV: clickConfirmBIDV,        
  stopACB: stopAppADBACB,
  startACB: startAppADBACB,
  stopEIB: stopAppADBEIB,
  startEIB: startAppADBEIB,
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
  stopSHBSAHA: stopAppADBSHBSAHA,
  startSHBSAHA: startAppADBSHBSAHA,  
  tap: tapADB,
  input: inputADB,
  inputVTB: inputADBVTB,
  checkDeviceACB: checkDeviceACB,
  checkDeviceEIB: checkDeviceEIB,
  checkDeviceNCB: checkDeviceNCB,
  checkDeviceNAB: checkDeviceNAB,
  checkDeviceTPB: checkDeviceTPB,
  checkDeviceVPB: checkDeviceVPB,
  checkDeviceMB: checkDeviceMB,  
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