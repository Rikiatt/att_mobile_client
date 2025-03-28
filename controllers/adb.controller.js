const { listDevice, startADB, delADBImg, clickConfirmVTB, inputPINVPB, inputPINMSB, inputPINBIDV, inputPINVTB, 
  copyQRImages, clickSelectImageVTB, clickScanQRVTB, 
  clickConfirmScanFaceBIDV, clickScanQRVPB2, clickScanQRVPB, clickScanQRMSB, clickScanQRNCB, clickLoginNAB, ScanQRNAB, clickSelectImageBAB, scanQRTPB, scanQRVPB, ScanQRNCB, clickSelectImageMSB, scanQRMB, ScanQROCB, clickScanQRBIDV, clickSelectImageBIDV, clickConfirmMB, clickConfirmOCB, clickConfirmBIDV, 
  startAppADBACB, stopAppADBACB, stopAppADBEXIM, startAppADBEXIM, stopAppADBOCB, startAppADBOCB, stopAppADBBIDV, startAppADBBIDV, stopAppADBBAB, stopAppADBTPB, stopAppADBVPB, stopAppADBNAB, startAppADBBAB, startAppADBTPB, startAppADBVPB, startAppADBNAB, stopAppADBNCB, startAppADBNCB, startAppADBMSB, stopAppADBMSB, stopAppADBMB, startAppADBMB, stopAppADBVCB, startAppADBVCB, stopAppADBVTB, startAppADBVTB, stopAppADBSHBSAHA, startAppADBSHBSAHA, 
  tapADB, inputADB, inputADBVTB, checkDeviceACB, checkDeviceEXIM, checkDeviceNAB, checkDeviceTPB, checkDeviceVPB, checkDeviceMB, checkDeviceNCB, checkDeviceMSB, checkDeviceBAB, checkDeviceOCB, checkDeviceBIDV, checkDeviceVTB, checkDeviceFHD, enterADB, tabADB, newlineADB, unlockScreenADB, backHomeADB, keyEventADB, 
  connectTcpIp, disconnectTcpIp,
  clickLoginACB, ScanQRACB, ScanQREXIM, trackACB, trackEXIM, trackOCB, trackNAB, trackTPB, trackVPB, trackMSB, trackMB } = require('../functions/adb.function');
const { connectScrcpy, cameraScrcpy } = require('../functions/scrcpy.function');
const responseHelper = require('../helpers/responseHelper');

const mapAction = {
  clickLoginACB: clickLoginACB,
  ScanQRACB: ScanQRACB,
  ScanQREXIM: ScanQREXIM,
  trackOCB: trackOCB,
  trackACB: trackACB,
  trackEXIM: trackEXIM,
  trackNAB: trackNAB,
  trackTPB: trackTPB,
  trackVPB: trackVPB,
  trackMB: trackMB,
  trackMSB: trackMSB,
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
  clickScanQRVPB2: clickScanQRVPB2,
  clickScanQRVPB: clickScanQRVPB,  
  clickScanQRMSB: clickScanQRMSB,
  clickScanQRNCB: clickScanQRNCB,
  ScanQRNAB: ScanQRNAB,
  clickSelectImageBAB: clickSelectImageBAB,
  scanQRTPB: scanQRTPB,
  scanQRVPB: scanQRVPB,
  scanQRMB: scanQRMB,
  clickSelectImageMSB: clickSelectImageMSB,
  ScanQRNCB: ScanQRNCB,
  clickLoginNAB: clickLoginNAB,  
  ScanQROCB: ScanQROCB,
  clickConfirmMB: clickConfirmMB,
  clickConfirmOCB: clickConfirmOCB,
  clickScanQRBIDV: clickScanQRBIDV,
  clickSelectImageBIDV: clickSelectImageBIDV,
  clickConfirmBIDV: clickConfirmBIDV,        
  stopACB: stopAppADBACB,
  startACB: startAppADBACB,
  stopEXIM: stopAppADBEXIM,
  startEXIM: startAppADBEXIM,
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
  checkDeviceEXIM: checkDeviceEXIM,
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