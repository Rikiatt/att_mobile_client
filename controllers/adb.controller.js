const { listDevice, delADBImg, clickConfirmICB, inputPINVPB, inputPINMSB, inputPINBIDV, inputPINICB, 
  copyQRImages, scanQRICB, clickScanQRICB, 
  clickConfirmScanFaceBIDV, clickScanQRMSB, clickScanQRNCB, clickLoginNAB, scanQRBAB, clickScanQRBIDV, clickSelectImageBIDV, clickConfirmMB, clickConfirmOCB, clickConfirmBIDV, 
  stopICB, startICB,  
  tapADB, inputADB, inputICB, checkDeviceACB, checkDeviceEIB, checkDeviceNAB, checkDeviceTPB, checkDeviceVPB, checkDevice, checkDeviceNCB, checkDeviceMSB, checkDeviceOCB, enterADB, tabADB, newlineADB, unlockScreenADB, backHomeADB, keyEventADB, 
  connectTcpIp, disconnectTcpIp,
  stopBIDV, startBIDV, closeAll, clickLoginACB, clickPasswordFieldEIB } = require('../functions/adb.function');
const { connectScrcpy, cameraScrcpy } = require('../functions/scrcpy.function');
const responseHelper = require('../helpers/responseHelper');
const { trackingLoop } = require('../functions/bankStatus.function');

const mapAction = {    
  trackingLoop: trackingLoop,  
  closeAll: closeAll,
  clickLoginACB: clickLoginACB,  
  scanQRBAB: scanQRBAB,
  clickScanQRNCB: clickScanQRNCB,   
  clickPasswordFieldEIB: clickPasswordFieldEIB,             
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
  clickLoginNAB: clickLoginNAB,    
  clickConfirmMB: clickConfirmMB,
  clickConfirmOCB: clickConfirmOCB,
  clickScanQRBIDV: clickScanQRBIDV,
  clickSelectImageBIDV: clickSelectImageBIDV,
  clickConfirmBIDV: clickConfirmBIDV,        
  stopICB: stopICB,
  startICB: startICB,
  stopBIDV: stopBIDV,
  startBIDV: startBIDV,
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