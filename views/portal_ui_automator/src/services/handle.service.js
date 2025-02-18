import { swalInputPass, swalNotification, swalToast } from '../utils/swal';
import { actionADB } from './adb.service';

export const typeText = async (data, setLoading) => {
  const text = await swalInputPass('Nhập ký tự', '', 'Nhập ký tự cần truyền vào thiết bị');
  if (!text) return;
  setLoading(true);
  await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() });
  setLoading(false);
};

export const enter = async (data) => {
  await actionADB({ action: 'enter', device_id: data.device_id });
};

export const home = async (data) => {
  await actionADB({ action: 'home', device_id: data.device_id });
};

export const unlockScreen = async (data) => {
  await actionADB({ action: 'unlockScreen', device_id: data.device_id });
};

export const delImg = async (data) => {
  await actionADB({ action: 'delImg', device_id: data.device_id });
};

export const camera = async (data) => {
  // camera_id: 1 => Cam trước
  // camera_id: 0 => Cam sau

  await actionADB({ action: 'camera', device_id: data.device_id, camera_id: 1 });
};

export const connect = async (data) => {
  await actionADB({ action: 'connect', device_id: data.device_id, title: data.title });
  await actionADB({ action: 'delImg', device_id: data.device_id });
};

export const connectTcpIp = async (data) => {
  return await actionADB({ action: 'connectTcpIp', device_id: data.device_id, type: data.type || 'wlan0' });
};

export const disconnectTcpIp = async (data) => {
  return await actionADB({ action: 'disconnectTcpIp', device_id: data.device_id });
};

// ============== OCB ============== //

export const ocbScanQR = async (data, setLoading) => {  
  const deviceCoordinates = await actionADB({ action: 'checkDeviceOCB', device_id: data.device_id }); 

  if (deviceCoordinates.status === 500) {
    return swalNotification("error", "Thiết bị chưa hỗ trợ OCB", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
  }

  setLoading(true);  

  const text = await swalInputPass('Nhập mã PIN', '', 'Nhập mã PIN cần truyền vào thiết bị');
  if (!text) return;    

  // console.log('1. Copy QR images'); 
  // await actionADB({ action: 'copyQRImages', device_id: data.device_id });

  console.log('1. Stop app OCB OMNI 4.0');
  await actionADB({ action: 'stopOCB', device_id: data.device_id });

  console.log('2. Start app OCB OMNI 4.0');
  await actionADB({ action: 'startOCB', device_id: data.device_id });
  await delay(8000);

  console.log('3. Login');
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 });
  await delay(2000);

  console.log('4. Input PIN');  
  await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() });
  await delay(5000);
  
  console.log('5. Scan QR, select img');
  await actionADB({ action: 'clickScanQROCB', device_id: data.device_id });
  await delay(500);
  await actionADB({ action: 'clickSelectImageOCB', device_id: data.device_id });
  await delay(2000);  

  setLoading(false);
};

// ============== NCB ============== //

export const ncbScanQR = async (data, setLoading) => {  
  const deviceCoordinates = await actionADB({ action: 'checkDeviceNCB', device_id: data.device_id }); 

  if (deviceCoordinates.status === 500) {
    return swalNotification("error", "Thiết bị chưa hỗ trợ NCB", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
  }  

  setLoading(true);    

  const text = await swalInputPass('Nhập mật khẩu', '', 'Nhập mã PIN cần truyền vào thiết bị');
  if (!text) return;

  // console.log('1. Copy QR images'); 
  // await actionADB({ action: 'copyQRImages', device_id: data.device_id });

  console.log('1. Stop app NCB');
  await actionADB({ action: 'stopNCB', device_id: data.device_id });  

  console.log('2. Start app NCB');
  await actionADB({ action: 'startNCB', device_id: data.device_id });

  await delay(10000);
  // Track NCB App while it is in process  
  // const trackNCBAppPromise = actionADB({ action: 'trackNCBApp', device_id: data.device_id });

  console.log('3. Input password and login');  
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() });
  await delay(1000);
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 }); 
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 }); 
  await delay(9000);

  console.log('4. Scan QR, select img');
  await actionADB({ action: 'clickScanQRNCB', device_id: data.device_id });
  await delay(500);
  await actionADB({ action: 'clickSelectImageNCB', device_id: data.device_id });
  await delay(3000); 

  // Đợi trackNCBApp hoàn thành (nếu app NCB bị thoát)
  // const trackResult = await trackNCBAppPromise;
  // if (!trackResult) {
  //   console.log('📢 Theo dõi NCB đã kết thúc.');
  // }

  console.log('5. Delete all of imgs in device');
  await actionADB({ action: 'delImg', device_id: data.device_id }); 

  setLoading(false);
};

// ============== NAB ============== //

export const nabScanQR = async (data, setLoading) => {  
  const deviceCoordinates = await actionADB({ action: 'checkDeviceNAB', device_id: data.device_id }); 

  if (deviceCoordinates.status === 500) {
    return swalNotification("error", "Thiết bị chưa hỗ trợ NAB", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
  }  

  setLoading(true);    

  const text = await swalInputPass('Nhập mật khẩu', '', 'Nhập mã PIN cần truyền vào thiết bị');
  if (!text) return;

  // console.log('1. Copy QR images'); 
  // await actionADB({ action: 'copyQRImages', device_id: data.device_id });

  console.log('1. Stop app NAB');
  await actionADB({ action: 'stopNAB', device_id: data.device_id });

  console.log('2. Start app NAB');
  await actionADB({ action: 'startNAB', device_id: data.device_id });

  await delay(12000);
  // Track NAB app while it is in process  
  const trackNABAppPromise = actionADB({ action: 'trackNABApp', device_id: data.device_id });

  console.log('3. Click Log in');   
  await actionADB({ action: 'clickLoginNAB', device_id: data.device_id });

  console.log('4. Tab to Password field, input text, then enter twice');
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });  
  
  await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 });
  await delay(2000);  

  console.log('5. Scan QR, select img');
  await actionADB({ action: 'clickScanQRNAB', device_id: data.device_id });
  await delay(500);
  await actionADB({ action: 'clickSelectImageNAB', device_id: data.device_id });
  await delay(3000); 

  //Đợi trackNABApp hoàn thành (nếu app NAB bị thoát)
  const trackResult = await trackNABAppPromise;
  if (!trackResult) {
    console.log('📢 Theo dõi NAB đã kết thúc.');
  }

  setLoading(false);
};

// ============== MSB ============== //

export const msbScanQR = async (data, setLoading) => {  
  const deviceCoordinates = await actionADB({ action: 'checkDeviceMSB', device_id: data.device_id }); 

  if (deviceCoordinates.status === 500) {
    return swalNotification("error", "Thiết bị chưa hỗ trợ MB Bank", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
  }  

  setLoading(true);    

  const text = await swalInputPass('Nhập mã PIN', '', 'Nhập mã PIN cần truyền vào thiết bị');
  if (!text) return;

  // console.log('1. Copy QR images'); 
  // await actionADB({ action: 'copyQRImages', device_id: data.device_id });

  console.log('1. Stop app MSB');
  await actionADB({ action: 'stopMSB', device_id: data.device_id });  

  console.log('2. Start app MSB');
  await actionADB({ action: 'startMSB', device_id: data.device_id });

  await delay(10000);
  // Track MSB App while it is in process  
  const trackMSBAppPromise = actionADB({ action: 'trackMSBApp', device_id: data.device_id });

  console.log('3. Scan QR');
  await actionADB({ action: 'clickScanQRMSB', device_id: data.device_id }); 
  await delay(300); 

  console.log('4. Input PIN to login');    
  await actionADB({ action: 'inputPINMSB', device_id: data.device_id, text: text.trim() });   
  await delay(2000); 

  console.log('5. Select img');
  await actionADB({ action: 'clickSelectImageMSB', device_id: data.device_id });
  await delay(3000);
   
  // Đợi trackMSBApp hoàn thành (nếu app MSB bị thoát)
  const trackResult = await trackMSBAppPromise;
  if (!trackResult) {
    console.log('📢 Theo dõi MSB đã kết thúc.');
  }

  console.log('6. Delete all of imgs in device');
  await actionADB({ action: 'delImg', device_id: data.device_id }); 

  setLoading(false);
};

// ============== MB BANK ============== //

export const mbScanQR = async (data, setLoading) => {  
  const deviceCoordinates = await actionADB({ action: 'checkDeviceMB', device_id: data.device_id }); 

  if (deviceCoordinates.status === 500) {
    return swalNotification("error", "Thiết bị chưa hỗ trợ MB Bank", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
  }  

  setLoading(true);    

  const text = await swalInputPass('Nhập mật khẩu', '', 'Nhập mã PIN cần truyền vào thiết bị');
  if (!text) return;

  // console.log('1. Copy QR images'); 
  // await actionADB({ action: 'copyQRImages', device_id: data.device_id });

  console.log('1. Stop app MB Bank');
  await actionADB({ action: 'stopMB', device_id: data.device_id });  

  console.log('2. Start app MB Bank');
  await actionADB({ action: 'startMB', device_id: data.device_id });

  await delay(10000);
  // Track MB App while it is in process  
  const trackMBAppPromise = actionADB({ action: 'trackMBApp', device_id: data.device_id });

  console.log('3. Input password and login');  
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() });
  await delay(1000);
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 }); 
  await delay(9000);

  console.log('4. Scan QR, select img');
  await actionADB({ action: 'clickScanQRMB', device_id: data.device_id });
  await delay(500);
  await actionADB({ action: 'clickSelectImageMB', device_id: data.device_id });
  await delay(3000); 

  // Đợi trackMBApp hoàn thành (nếu app MB Bank bị thoát)
  const trackResult = await trackMBAppPromise;
  if (!trackResult) {
    console.log('📢 Theo dõi MB Bank đã kết thúc.');
  }

  console.log('5. Delete all of imgs in /sdcard and sdcard/DCIM/CAMERA');
  await actionADB({ action: 'delImg', device_id: data.device_id }); 

  setLoading(false);
};

// ============== BIDV ============== //

export const anotherBankCheckQR = async (data, setLoading) => {
  const deviceCoordinates = await actionADB({ action: 'checkDeviceBIDV', device_id: data.device_id }); 

  if (deviceCoordinates.status === 500) {
    return swalNotification("error", "Thiết bị chưa hỗ trợ BIDV", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
  }

  const text = await swalInputPass('Nhập mật khẩu', '', 'Nhập mật khẩu đăng nhập bank khác bất kỳ');
  if (!text) return;

  setLoading(true);

  // Start app được chọn
  await actionADB({ action: 'start', device_id: data.device_id });

  // Nhập mật khẩu để đăng nhập vào app đó
  await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() });

  // Tab và đăng nhập
  // Tab vào QR / Click vào ô Scan QR (x, y)
  // Click vào ô chọn ảnh (x, y) ... chọn mã QR (duy nhất)

  setLoading(false);
};

export const bidvLogin = async (data, setLoading) => {
  const deviceCoordinates = await actionADB({ action: 'checkDeviceBIDV', device_id: data.device_id }); 

  if (deviceCoordinates.status === 500) {
    return swalNotification("error", "Thiết bị chưa hỗ trợ BIDV", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
  }

  const text = await swalInputPass('Nhập mật khẩu', '', 'Nhập mật khẩu cần truyền vào thiết bị');
  if (!text) return;

  setLoading(true);

  try {
    // Start app
    await actionADB({ action: 'stopBIDV', device_id: data.device_id });
    await actionADB({ action: 'startBIDV', device_id: data.device_id });
    await delay(8000);

    // Tab vào ô mật khẩu
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 });
    await delay(1000);

    // Nhập mật khẩu
    await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() });
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 });    
    await delay(1000);    

    // Tab và đăng nhập
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 20 });
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 });
    await delay(5000);

    setLoading(false);
  } catch (error) {
    swalToast({ title: `Đã xảy ra lỗi: ${error.message}`, icon: 'error' });
    console.error(error);
  } finally {
    setLoading(false);
  }
};

export const bidvScanQR = async (data, setLoading) => {
  const deviceCoordinates = await actionADB({ action: 'checkDeviceBIDV', device_id: data.device_id }); 

  if (deviceCoordinates.status === 500) {
    return swalNotification("error", "Thiết bị chưa hỗ trợ BIDV", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
  }

  setLoading(true);

  try {        
    // Click vào ô Scan QR  (540, 2125)
    await actionADB({ action: 'clickScanQRBIDV', device_id: data.device_id });
    setLoading(true);
    await delay(1000);

    // Click vào ô chọn ảnh (456, 1620) ... chọn mã QR thủ công
    await actionADB({ action: 'clickSelectImageBIDV', device_id: data.device_id });  
    setLoading(false);
  } catch (error) {
    swalToast({ title: `Đã xảy ra lỗi: ${error.message}`, icon: 'error' });
    console.error(error);
  } finally {
    setLoading(false);
  }
};

export const bidvConfirm = async (data, setLoading) => {  
  const deviceCoordinates = await actionADB({ action: 'checkDeviceBIDV', device_id: data.device_id }); 

  if (deviceCoordinates.status === 500) {
    return swalNotification("error", "Thiết bị chưa hỗ trợ BIDV", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
  }

  const text = await swalInputPass('Nhập mã PIN', '', 'Nhập mã PIN cần truyền vào thiết bị');
  if (!text) return;

  // Click vào Next 
  setLoading(true);
  await actionADB({ action: 'clickConfirmBIDV', device_id: data.device_id });
  await delay(4000);

  // Paste PIN  
  await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() });     
  await delay(4000);

  // Click Confirm
  await actionADB({ action: 'clickConfirmBIDV', device_id: data.device_id });

  setLoading(false);
};

export const bidvConfirmBeforeFace = async (data, setLoading) => {  
  const deviceCoordinates = await actionADB({ action: 'checkDeviceBIDV', device_id: data.device_id }); 

  if (deviceCoordinates.status === 500) {
    return swalNotification("error", "Thiết bị chưa hỗ trợ BIDV", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
  } 

  // Click vào Next
  await actionADB({ action: 'clickConfirmBIDV', device_id: data.device_id });
  setLoading(false);
};

export const bidvConfirmAfterFace = async (data, setLoading) => {  
  const deviceCoordinates = await actionADB({ action: 'checkDeviceBIDV', device_id: data.device_id }); 

  if (deviceCoordinates.status === 500) {
    return swalNotification("error", "Thiết bị chưa hỗ trợ BIDV", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
  }

  const text = await swalInputPass('Nhập mã PIN', '', 'Nhập mã PIN cần truyền vào thiết bị');
  if (!text) return;

  // Input PIN  
  await actionADB({ action: 'inputPINBIDV', device_id: data.device_id, text: text.trim() });   
  await delay(3000);

  // Xóa luôn ảnh trong thư viện trong lúc quét mặt
  await actionADB({ action: 'delImg', device_id: data.device_id });
  await delay(1000);  

  // Click vào Confirm
  await actionADB({ action: 'clickConfirmBIDV', device_id: data.device_id });
  setLoading(false);
};

export const bidvScanFaceConfirm = async (data, setLoading) => {  
  const deviceCoordinates = await actionADB({ action: 'checkDeviceBIDV', device_id: data.device_id }); 

  if (deviceCoordinates.status === 500) {
    return swalNotification("error", "Thiết bị chưa hỗ trợ BIDV", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
  }

  const text = await swalInputPass('Nhập mã PIN', '', 'Nhập mã PIN cần truyền vào thiết bị');
  if (!text) return;

  // Nhập PIN (sau bước quét mặt)
  await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() });
  setLoading(true);
  await actionADB({ action: 'clickConfirmBIDV', device_id: data.device_id });
  // await actionADB({ action: 'clickConfirmScanFaceBIDV', device_id: data.device_id });
  await delay(3000);  

  // Click vào Confirm
  // await actionADB({ action: 'clickConfirmBIDV', device_id: data.device_id });
  setLoading(false);
};

// ============== VCB ============== //

export const vcbOldClickLogin = async (data, setLoading) => {
  const text = await swalInputPass('Nhập mật khẩu', '', 'Nhập mật khẩu cần truyền vào thiết bị');
  if (!text) return;
  setLoading(true);
  await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() });
  await delay(2000);
  await enter({ device_id: data.device_id });
  setLoading(false);
};

// ============== VCB ============== //

export const vcbLogin = async (data, setLoading) => {
  const text = await swalInputPass('Nhập mật khẩu', '', 'Nhập mật khẩu cần truyền vào thiết bị');
  if (!text) return;

  setLoading(true);
  
  try{
    // Start app (hidden because of taking a lot of time starting app vcb with some kind of devices)
    // await actionADB({ action: 'stopVCB', device_id: data.device_id });
    // await actionADB({ action: 'startVCB', device_id: data.device_id });
    // await delay(8000);

    // Tab vào ô mật khẩu
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });    

    // Nhập mật khẩu và click nút Đăng nhập
    await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() });
    await delay(1000);
    await enter({ device_id: data.device_id });
    await enter({ device_id: data.device_id });    
  } catch(error) {
    swalToast({ title: `Đã xảy ra lỗi: ${error.message}`, icon: 'error' });
    console.error(error);
  } finally {
    setLoading(false);
  }
};

export const vcbNewClickConfirm = async (data, setLoading) => {
  const text = await swalInputPass('Nhập mã PIN', '', 'Nhập mã PIN cần truyền vào thiết bị');
  if (!text) return;
  setLoading(true);
  await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() });
  await delay(1000);
  await enter({ device_id: data.device_id });
  await enter({ device_id: data.device_id });
  await delay(1000);
  setLoading(false);
};

export const vcbNewGetOTP = async (data, setLoading) => {
  const text = await swalInputPass('Nhập mã PIN', '', 'Nhập mã PIN cần truyền vào thiết bị');
  if (!text) return;
  setLoading(true);
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await enter({ device_id: data.device_id });
  await delay(2000);
  await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() });
  await enter({ device_id: data.device_id });
  await enter({ device_id: data.device_id });
  await delay(1000);
  setLoading(false);
};

// ============== VTB ============== //

export const vietinLogin = async (data, setLoading) => {  
  const text = await swalInputPass('Nhập mật khẩu', '', 'Nhập mật khẩu cần truyền vào thiết bị');
  if (!text) return;
  
  setLoading(true);

  try {       
    const deviceCoordinates = await actionADB({ action: 'checkDeviceVTB', device_id: data.device_id });    
    const checkDeviceFHDOrNot = await actionADB({ action: 'checkDeviceFHD', device_id: data.device_id });    
            
    if (deviceCoordinates.status === 500) {
      return swalNotification("error", "Thiết bị chưa hỗ trợ VTB", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
    }    

    if (checkDeviceFHDOrNot.status === 500) {
      return swalNotification("error", "Vui lòng cài đặt kích thước màn hình về FHD+");      
    } 
    
    // Start app
    await actionADB({ action: 'stopVTB', device_id: data.device_id });
    await actionADB({ action: 'startVTB', device_id: data.device_id });
    await delay(8000);

    // Tab vào ô mật khẩu
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 });

    // Nhập mật khẩu và click nút Đăng nhập
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
    await delay(50);
    await actionADB({ action: 'inputVTB', device_id: data.device_id, text: text.trim() });
    await delay(1000);
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 20 });
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 });  

    setLoading(false);
  } catch (error) {
    swalToast({ title: `Đã xảy ra lỗi: ${error.message}`, icon: 'error' });
    console.error(error);
  } finally {
    setLoading(false);
  }
};

export const vietinScanQR = async (data, setLoading) => {  
  try {       
    const deviceCoordinates = await actionADB({ action: 'checkDeviceVTB', device_id: data.device_id });    
    const checkDeviceFHDOrNot = await actionADB({ action: 'checkDeviceFHD', device_id: data.device_id });    
            
    if (deviceCoordinates.status === 500) {
      return swalNotification("error", "Thiết bị chưa hỗ trợ VTB", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
    }    

    if (checkDeviceFHDOrNot.status === 500) {
      return swalNotification("error", "Vui lòng cài đặt kích thước màn hình về FHD+");      
    } 
    
    // Tab vào ô Scan QR và chọn ảnh .. chọn mã QR thủ công ... xóa luôn ảnh trong thư viện
    await actionADB({ action: 'clickSelectImageVTB', device_id: data.device_id }); // Chọn ảnh từ trong máy     
    setLoading(true); 

    setLoading(false);
  } catch (error) {
    swalToast({ title: `Đã xảy ra lỗi: ${error.message}`, icon: 'error' });
    console.error(error);
  } finally {
    setLoading(false);
  }
};

export const vietinConfirm = async (data, setLoading) => {  
  try {       
    const deviceCoordinates = await actionADB({ action: 'checkDeviceVTB', device_id: data.device_id });    
    const checkDeviceFHDOrNot = await actionADB({ action: 'checkDeviceFHD', device_id: data.device_id });    
            
    if (deviceCoordinates.status === 500) {
      return swalNotification("error", "Thiết bị chưa hỗ trợ VTB", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
    }    

    if (checkDeviceFHDOrNot.status === 500) {
      return swalNotification("error", "Vui lòng cài đặt kích thước màn hình về FHD+");      
    }    

    const text = await swalInputPass('Nhập mã PIN', '', 'Nhập mã PIN cần truyền vào thiết bị');
    if (!text) return;
    
    setLoading(true);

    // Click Tiếp tục (= Xác nhận)
    await actionADB({ action: 'clickConfirmVTB', device_id: data.device_id });  
    await delay(12500);  
    
    // Nhập mã PIN và xác nhận ... xóa luôn ảnh trong thư viện
    await actionADB({ action: 'inputPINVTB', device_id: data.device_id, text: text.trim() });    
    await delay(3000);
    await actionADB({ action: 'delImg', device_id: data.device_id });    
    await delay(1000);

    // Click xác nhận
    await actionADB({ action: 'clickConfirmVTB', device_id: data.device_id });

    setLoading(false);
  } catch (error) {
    swalToast({ title: `Đã xảy ra lỗi: ${error.message}`, icon: 'error' });
    console.error(error);
  } finally {
    setLoading(false);
  }
};

export const vietinConfirmAfterFace = async (data, setLoading) => {  
  try {       
    const deviceCoordinates = await actionADB({ action: 'checkDeviceVTB', device_id: data.device_id });    
    const checkDeviceFHDOrNot = await actionADB({ action: 'checkDeviceFHD', device_id: data.device_id });    
            
    if (deviceCoordinates.status === 500) {
      return swalNotification("error", "Thiết bị chưa hỗ trợ VTB", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
    }    

    if (checkDeviceFHDOrNot.status === 500) {
      return swalNotification("error", "Vui lòng cài đặt kích thước màn hình về FHD+");      
    }    

    const text = await swalInputPass('Nhập mã PIN', '', 'Nhập mã PIN cần truyền vào thiết bị');
    if (!text) return;
    
    setLoading(true);

    // Click Tiếp tục (= Xác nhận)
    await actionADB({ action: 'clickConfirmVTB', device_id: data.device_id });
    await delay(10000); // chờ quét mặt hoặc video loading...
    
    // Nhập mã PIN và xác nhận ... xóa luôn ảnh trong thư viện    
    await actionADB({ action: 'inputPINVTB', device_id: data.device_id, text: text.trim() });    
    await actionADB({ action: 'delImg', device_id: data.device_id });    
    await delay(1000);

    // Click xác nhận
    await actionADB({ action: 'clickConfirmVTB', device_id: data.device_id });

    setLoading(false);
  } catch (error) {
    swalToast({ title: `Đã xảy ra lỗi: ${error.message}`, icon: 'error' });
    console.error(error);
  } finally {
    setLoading(false);
  }
};

// ============== SHB ============== //

export const shbLogin = async (data, setLoading) => {
  const text = await swalInputPass('Nhập mật khẩu', '', 'Nhập mật khẩu cần truyền vào thiết bị');
  if (!text) return;
  setLoading(true);

  try {
    // Start app
    await actionADB({ action: 'stopSHB', device_id: data.device_id });
    await actionADB({ action: 'startSHB', device_id: data.device_id });
    await delay(6000);

    // Tab vào ô mật khẩu
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });

    // Nhập mật khẩu và click nút Đăng nhập
    await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() });
    await delay(1000);
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 });
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 });
  } catch (error) {
    swalToast({ title: `Đã xảy ra lỗi: ${error.message}`, icon: 'error' });
    console.error(error);
  } finally {
    setLoading(false);
  }
};

// ============== BAB ============== //

export const babLogin = async (data, setLoading) => {  
  const deviceCoordinates = await actionADB({ action: 'checkDeviceBAB', device_id: data.device_id }); 

  if (deviceCoordinates.status === 500) {
    return swalNotification("error", "Thiết bị chưa hỗ trợ BAB", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
  }

  const text = await swalInputPass('Nhập mật khẩu', '', 'Nhập mật khẩu cần truyền vào thiết bị');
  if (!text) return;

  setLoading(true);   

  // delImg xoa failed thi thong bao, return; luon

  console.log('1. Stop app Bac A Bank');
  await actionADB({ action: 'stopBAB', device_id: data.device_id });

  console.log('2. Start app Bac A Bank');
  await actionADB({ action: 'startBAB', device_id: data.device_id });
  await delay(6000);

  console.log('3. Login');
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await delay(1000);
  await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() });
  await actionADB({ action: 'clickLoginBAB', device_id: data.device_id });

  setLoading(false);
};

export const babScanQR = async (data, setLoading) => {
  const deviceCoordinates = await actionADB({ action: 'checkDeviceBAB', device_id: data.device_id }); 

  if (deviceCoordinates.status === 500) {
    return swalNotification("error", "Thiết bị chưa hỗ trợ BAB", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
  }

  setLoading(true);

  try {        
    // Click vào ô Scan QR  (540, 2125)
    await actionADB({ action: 'clickScanQRBAB', device_id: data.device_id });
    await delay(1000);
    await actionADB({ action: 'clickSelectImageBAB', device_id: data.device_id }); 
    
    setLoading(false);
  } catch (error) {
    swalToast({ title: `Đã xảy ra lỗi: ${error.message}`, icon: 'error' });
    console.error(error);
  } finally {
    setLoading(false);
  }
};

// ============== ABB ============== //

export const abbClickLogin = async (data, setLoading) => {
  const text = await swalInputPass('Nhập mật khẩu', '', 'Nhập mật khẩu cần truyền vào thiết bị');
  if (!text) return;
  setLoading(true);

  await actionADB({
    action: 'tap',
    device_id: data.device_id,
    percent: {
      X: percentage(310 * 1, data.X),
      Y: percentage(840 * 1, data.Y)
    },
    screenSize: { X: data.X, Y: data.Y }
  });
  await delay(1000);
  await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() });
  await delay(2000);
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 4 });
  await delay(2000);
  await actionADB({
    action: 'tap',
    device_id: data.device_id,
    percent: {
      X: percentage(290 * 1, data.X),
      Y: percentage(1048 * 1, data.Y)
    },
    screenSize: { X: data.X, Y: data.Y }
  });

  await delay(1000);
  setLoading(false);
};

// ============== SHINHAN BANK ============== //

export const shinhanClickLogin = async (data, setLoading) => {
  const text = await swalInputPass('Nhập mật khẩu', '', 'Nhập mật khẩu cần truyền vào thiết bị');
  if (!text) return;
  setLoading(true);
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await enter({ device_id: data.device_id });

  await delay(5000);

  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await enter({ device_id: data.device_id });

  await delay(5000);

  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() });

  setLoading(false);
};

export const runMacro = async (macro, device) => {
  try {
    const sizeX = device.screenSize.split('x')[0];
    const sizeY = device.screenSize.split('x')[1];

    for (const step of macro) {
      if (step.action === 'tap') {
        const sendData = {
          action: step.action,
          device_id: device.id,
          percent: {
            X: percentage(step.X * 1, sizeX),
            Y: percentage(step.Y * 1, sizeY)
          },
          screenSize: { X: sizeX, Y: sizeY }
        };
        await actionADB(sendData);
      }
      if (step.action === 'delay') {
        await delay(step.time * 1);
      } else {
        step.device_id = device.id;
        step.screenSize = { X: sizeX, Y: sizeY };
        await actionADB(step);
      }
    }
  } catch (error) {
    console.log(error);
    swalToast('error', error.message);
  }
};

const percentage = (smallPart, largePart) => {
  return ((smallPart / largePart) * 100).toFixed(0);
};

const delay = async (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};