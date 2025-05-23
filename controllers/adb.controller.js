const { listDevice, startADB, delADBImg, clickConfirmICB, inputPINVPB, inputPINMSB, inputPINBIDV, inputPINICB, 
  copyQRImages, scanQRICB, clickScanQRICB, 
  clickConfirmScanFaceBIDV, scanQRVPB2, scanQRVPB, clickScanQRMSB, clickScanQRNCB, clickLoginNAB, scanQRNAB, scanQRBAB, scanQRTPB, scanQRNCB, clickSelectImageMSB, scanQRMB, scanQROCB, scanQRSHBSAHA, clickScanQRBIDV, clickSelectImageBIDV, clickConfirmMB, clickConfirmOCB, clickConfirmBIDV, 
  startACB, stopACB, stopEIB, startEIB, stopOCB, startOCB, stopBIDV, startBIDV, stopBAB, stopTPB, stopVPB, stopNAB, startBAB, startTPB, startVPB, startNAB, stopNCB, startNCB, startMSB, stopMSB, stopMB, stopVCB, startVCB, stopICB, startICB, stopSHBSAHA, startSHBSAHA, 
  tapADB, inputADB, inputICB, checkDeviceACB, checkDeviceEIB, checkDeviceNAB, checkDeviceTPB, checkDeviceVPB, checkDevice, checkDeviceNCB, checkDeviceMSB, checkDeviceBAB, checkDeviceOCB, checkDeviceBIDV, checkDeviceICB, checkDeviceFHD, enterADB, tabADB, newlineADB, unlockScreenADB, backHomeADB, keyEventADB, 
  connectTcpIp, disconnectTcpIp,
  closeAll, clickLoginACB, scanQRACB, scanQREIB, clickPasswordFieldEIB, trackMSB, trackSHBSAHA } = require('../functions/adb.function');
const { connectScrcpy, cameraScrcpy } = require('../functions/scrcpy.function');
const responseHelper = require('../helpers/responseHelper');
const { trackingLoop } = require('../functions/bankStatus.function');

const mapAction = {    
  trackingLoop: trackingLoop,  
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
  trackMSB: trackMSB,
  trackSHBSAHA: trackSHBSAHA,                
  start: startADB,
  delImg: delADBImg,
  clickConfirmICB: clickConfirmICB,
  inputPINVPB: inputPINVPB,
  inputPINMSB: inputPINMSB,
  inputPINBIDV: inputPINBIDV,
  inputPINICB: inputPINICB,
  copyQRImages: copyQRImages,  
  scanQRICB: scanQRICB,
  clickScanQRICB: clickScanQRICB,  
  clickConfirmScanFaceBIDV: clickConfirmScanFaceBIDV,       
  clickScanQRMSB: clickScanQRMSB,    
  clickSelectImageMSB: clickSelectImageMSB,  
  clickLoginNAB: clickLoginNAB,    
  clickConfirmMB: clickConfirmMB,
  clickConfirmOCB: clickConfirmOCB,
  clickScanQRBIDV: clickScanQRBIDV,
  clickSelectImageBIDV: clickSelectImageBIDV,
  clickConfirmBIDV: clickConfirmBIDV,        
  stopACB: stopACB,
  startACB: startACB,
  stopEIB: stopEIB,
  startEIB: startEIB,
  stopOCB: stopOCB,
  startOCB: startOCB,
  stopBIDV: stopBIDV,
  startBIDV: startBIDV,
  stopNAB: stopNAB,
  stopBAB: stopBAB,
  startBAB: startBAB,
  stopTPB: stopTPB,
  stopVPB: stopVPB,
  startNAB: startNAB,
  startTPB: startTPB,
  startVPB: startVPB,
  stopMB: stopMB,  
  stopNCB: stopNCB,
  startNCB: startNCB,
  stopMSB: stopMSB,
  startMSB: startMSB,
  stopVCB: stopVCB,
  startVCB: startVCB,
  stopICB: stopICB,
  startICB: startICB,
  stopSHBSAHA: stopSHBSAHA,
  startSHBSAHA: startSHBSAHA,  
  tap: tapADB,
  input: inputADB,
  inputICB: inputICB,
  checkDeviceACB: checkDeviceACB,
  checkDeviceEIB: checkDeviceEIB,
  checkDeviceNCB: checkDeviceNCB,
  checkDeviceNAB: checkDeviceNAB,
  checkDeviceTPB: checkDeviceTPB,
  checkDeviceVPB: checkDeviceVPB,
  checkDevice: checkDevice,  
  checkDeviceMSB: checkDeviceMSB,
  checkDeviceBAB: checkDeviceBAB,
  checkDeviceOCB: checkDeviceOCB,
  checkDeviceBIDV: checkDeviceBIDV,
  checkDeviceICB: checkDeviceICB,
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