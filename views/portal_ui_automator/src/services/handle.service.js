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
  // await actionADB({ action: 'delImg', device_id: data.device_id });
  // Tại vì đôi khi người ta tạo lệnh xong rồi mới "MỞ THIẾT BỊ"
  // nên sẽ bị mất ảnh trong thiết bị sau khi tạo lệnh trên ORG hoặc ATTPAY+
  await actionADB({ action: 'checkRunningBanks', device_id: data.device_id }); 
  await actionADB({ action: 'mainTracking', device_id: data.device_id }); 
};

export const connectTcpIp = async (data) => {
  return await actionADB({ action: 'connectTcpIp', device_id: data.device_id, type: data.type || 'wlan0' });
};

export const disconnectTcpIp = async (data) => {
  return await actionADB({ action: 'disconnectTcpIp', device_id: data.device_id });
};

// ============== ACB ============== //

export const acbScanQR = async (data, setLoading) => {  
  // const deviceCoordinates = await actionADB({ action: 'checkDeviceACB', device_id: data.device_id }); 

  // if (deviceCoordinates.status === 500) {
  //   return swalNotification("error", "Thiết bị chưa hỗ trợ ACB", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
  // }  

  setLoading(true);    

  const text = await swalInputPass('Nhập mật khẩu', '', 'Nhập mật khẩu ACB cần truyền vào thiết bị');
  if (!text) return;

  console.log('1. Đang đóng các app đang mở...');
  await actionADB({ action: 'closeAll', device_id: data.device_id }); 
  await delay(1000); 

  console.log('2. Khởi động app ACB...');
  await actionADB({ action: 'startACB', device_id: data.device_id });
  await delay(12000);

  console.log('3. Scan QR');
  await actionADB({ action: 'scanQRACB', device_id: data.device_id }); 
  await delay(500);

  console.log('4. Login');   
  await actionADB({ action: 'clickLoginACB', device_id: data.device_id });
  await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 });  
  await delay(4000); // trong lúc loading vào trong thì cho chờ thêm để giảm số file track  

  // Track ACB App while it is in process  
  console.log('5. Đang theo dõi ACB...');
  const trackACBPromise = actionADB({ action: 'trackACB', device_id: data.device_id }); 
        
  //Đợi trackACBPromise hoàn thành (nếu app ACB bị thoát)
  const trackResult = await trackACBPromise;
  if (!trackResult) {
    console.log('📢 Theo dõi ACB đã kết thúc.');
  }

  // console.log('5. Delete all of imgs in device');
  // await actionADB({ action: 'delImg', device_id: data.device_id }); 

  setLoading(false);
};

// ============== EIB ============== //

export const eibScanQR = async (data, setLoading) => {  
  const deviceCoordinates = await actionADB({ action: 'checkDeviceEIB', device_id: data.device_id }); 

  if (deviceCoordinates.status === 500) {
    return swalNotification("error", "Thiết bị chưa hỗ trợ EIB", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
  }  

  setLoading(true);    

  const text = await swalInputPass('Nhập mật khẩu', '', 'Nhập mật khẩu EIB cần truyền vào thiết bị');
  if (!text) return;

  console.log('1. Đang đóng các app đang mở...');
  await actionADB({ action: 'closeAll', device_id: data.device_id }); 
  await delay(1000); 

  console.log('2. Khởi động app EIB...');
  await actionADB({ action: 'startEIB', device_id: data.device_id });

  await delay(3500);  

  console.log('3. Scan QR');
  await actionADB({ action: 'scanQREIB', device_id: data.device_id });   

  console.log('4. Login');
  await actionADB({ action: 'clickPasswordFieldEIB', device_id: data.device_id });   
  await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() });
  await delay(1000);
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 });
  await delay(4000); // trong lúc loading vào trong thì cho chờ thêm để giảm số file track

  // Track EIB while it is in process 
  const trackEIBPromise = actionADB({ action: 'trackEIB', device_id: data.device_id });
   
  // Đợi trackEIBPromise hoàn thành (nếu app EIB bị thoát)
  const trackResult = await trackEIBPromise;
  if (!trackResult) {
    console.log('📢 Theo dõi EIB đã kết thúc.');
  }

  // console.log('5. Delete all of imgs in device');
  // await actionADB({ action: 'delImg', device_id: data.device_id }); 

  setLoading(false);
};

// ============== OCB ============== //

export const ocbScanQR = async (data, setLoading) => {  
  const deviceCoordinates = await actionADB({ action: 'checkDeviceOCB', device_id: data.device_id }); 

  if (deviceCoordinates.status === 500) {
    return swalNotification("error", "Thiết bị chưa hỗ trợ OCB", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
  }

  setLoading(true);  

  const text = await swalInputPass('Nhập mã PIN', '', 'Nhập mã PIN OCB cần truyền vào thiết bị');
  if (!text) return;    

  console.log('1. Đang đóng các app đang mở...');
  await actionADB({ action: 'closeAll', device_id: data.device_id }); 
  await delay(1000);

  console.log('2. Đang khởi động OCB...');
  await actionADB({ action: 'startOCB', device_id: data.device_id });
  await delay(6000);
  // await delay(10000);

  console.log('3. Login');
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 });
  await delay(1000);  
  await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() });
  await delay(4000); // trong lúc loading vào trong thì cho chờ thêm để giảm số file track

  // Track OCB while it is in process  
  console.log('4. Đang theo dõi OCB...');
  const trackOCBPromise = actionADB({ action: 'trackOCB', device_id: data.device_id });
  
  console.log('5. Scan QR');   
  await actionADB({ action: 'scanQROCB', device_id: data.device_id });   

  // Đợi trackOCB hoàn thành (nếu app OCB bị thoát)
  const trackResult = await trackOCBPromise;
  if (!trackResult) {
    console.log('📢 Theo dõi OCB đã kết thúc.');
  }

  // console.log('6. Delete all of imgs in /sdcard');
  // await actionADB({ action: 'delImg', device_id: data.device_id }); 

  setLoading(false);
};

// ============== NCB ============== //

export const ncbScanQR = async (data, setLoading) => {  
  const deviceCoordinates = await actionADB({ action: 'checkDeviceNCB', device_id: data.device_id }); 

  if (deviceCoordinates.status === 500) {
    return swalNotification("error", "Thiết bị chưa hỗ trợ NCB", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
  }  

  setLoading(true);    

  const text = await swalInputPass('Nhập mật khẩu', '', 'Nhập mật khẩu NCB cần truyền vào thiết bị');
  if (!text) return;

  console.log('1. Đang đóng các app đang mở...');
  await actionADB({ action: 'closeAll', device_id: data.device_id }); 
  await delay(1000);  

  console.log('2. Khởi động NCB...');
  await actionADB({ action: 'startNCB', device_id: data.device_id });
  await delay(6000);

  // Track NCB App while it is in process  
  // const trackNCBAppPromise = actionADB({ action: 'trackNCBApp', device_id: data.device_id });

  console.log('3. Login...');  
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() });
  await delay(1000);
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 }); 
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 });  

  console.log('4. Scan QR');  
  await actionADB({ action: 'clickScanQRNCB', device_id: data.device_id });
  await delay(500);
  await actionADB({ action: 'scanQRNCB', device_id: data.device_id });
  await delay(4000); // trong lúc loading vào trong thì cho chờ thêm để giảm số file track

  // Đợi trackNCBApp hoàn thành (nếu app NCB bị thoát)
  // const trackResult = await trackNCBAppPromise;
  // if (!trackResult) {
  //   console.log('📢 Theo dõi NCB đã kết thúc.');
  // }

  // console.log('5. Delete all of imgs in device');
  // await actionADB({ action: 'delImg', device_id: data.device_id }); 

  setLoading(false);
};

export const ncbLogin = async (data, setLoading) => {  
  setLoading(true);    

  const text = await swalInputPass('Nhập mật khẩu', '', 'Nhập mật khẩu NCB cần truyền vào thiết bị');
  if (!text) return;

  console.log('1. Đang đóng các app đang mở...');
  await actionADB({ action: 'closeAll', device_id: data.device_id }); 
  await delay(1000);  

  console.log('2. Khởi động NCB...');
  await actionADB({ action: 'startNCB', device_id: data.device_id });
  await delay(6000);

  // Track NCB App while it is in process  
  // const trackNCBAppPromise = actionADB({ action: 'trackNCBApp', device_id: data.device_id });

  console.log('3. Login...');  
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() });
  await delay(1000);
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 }); 
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 });  

  setLoading(false);
};

// ============== NAB ============== //

export const nabScanQR = async (data, setLoading) => {  
  const deviceCoordinates = await actionADB({ action: 'checkDeviceNAB', device_id: data.device_id }); 

  if (deviceCoordinates.status === 500) {
    return swalNotification("error", "Thiết bị chưa hỗ trợ NAB", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
  }  

  setLoading(true);    

  const text = await swalInputPass('Nhập mật khẩu', '', 'Nhập mật khẩu NAB cần truyền vào thiết bị');
  if (!text) return;

  console.log('1. Đang đóng các app đang mở...');
  await actionADB({ action: 'closeAll', device_id: data.device_id }); 
  await delay(1000);

  console.log('2. Khởi động app NAB...');
  await actionADB({ action: 'startNAB', device_id: data.device_id });

  await delay(6000);
  
  console.log('3. Login');   
  await actionADB({ action: 'clickLoginNAB', device_id: data.device_id });  
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });  
  await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 });  
  await delay(5000); // trong lúc loading vào trong thì cho chờ thêm để giảm số file track

  // Track NAB app while it is in process  
  console.log('4. Đang theo dõi NAB...');
  const trackNABPromise = actionADB({ action: 'trackNAB', device_id: data.device_id });

  console.log('5. Scan QR');  
  await actionADB({ action: 'scanQRNAB', device_id: data.device_id });
  await delay(3000); 

  // Đợi trackNAB hoàn thành (nếu app NAB bị thoát)
  const trackResult = await trackNABPromise;
  if (!trackResult) {
    console.log('📢 Theo dõi NAB đã kết thúc.');
  }

  // console.log('6. Delete all of imgs in device');
  // await actionADB({ action: 'delImg', device_id: data.device_id }); 

  setLoading(false);
};

// ============== TPB ============== //

export const tpbScanQR = async (data, setLoading) => {  
  const deviceCoordinates = await actionADB({ action: 'checkDeviceTPB', device_id: data.device_id }); 

  if (deviceCoordinates.status === 500) {
    return swalNotification("error", "Thiết bị chưa hỗ trợ TPB", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
  }  

  setLoading(true);    

  const text = await swalInputPass('Nhập mật khẩu', '', 'Nhập mật khẩu TPB cần truyền vào thiết bị');  
  if (!text) return;

  console.log('1. Đang đóng các app đang mở...');
  await actionADB({ action: 'closeAll', device_id: data.device_id }); 
  await delay(1000);

  console.log('2. Khởi động app TPB...');
  await actionADB({ action: 'startTPB', device_id: data.device_id });
  await delay(5000);  

  console.log('3. Scan QR');  
  await actionADB({ action: 'scanQRTPB', device_id: data.device_id });
  await delay(1500);

  console.log('4. Login');  
  await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() }); 
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 }); 
  await delay(4000); // trong lúc loading vào trong thì cho chờ thêm để giảm số file track

  // Track TPB while it is in process  
  console.log('5. Đang theo dõi TPB...'); 
  const trackTPBPromise = actionADB({ action: 'trackTPB', device_id: data.device_id });
  
  // Đợi trackTPB hoàn thành (nếu app TPB bị thoát)
  const trackResult = await trackTPBPromise;
  if (!trackResult) {
    console.log('📢 Theo dõi TPB đã kết thúc.');
  }

  // console.log('6. Delete all of imgs in /sdcard');
  // await actionADB({ action: 'delImg', device_id: data.device_id }); 

  setLoading(false);
};

// ============== VPB ============== //

export const vpbScanQR = async (data, setLoading) => {  
  const deviceCoordinates = await actionADB({ action: 'checkDeviceVPB', device_id: data.device_id }); 

  if (deviceCoordinates.status === 500) {
    return swalNotification("error", "Thiết bị chưa hỗ trợ VPB", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
  }  

  setLoading(true);    

  //const text = await swalInputPass('Nhập mã PIN', '', 'Nhập mã PIN VPB cần truyền cho thiết bị');  
  const text = await swalInputPass('Nhập mã PIN hoặc mật khẩu', '', 'Nhập mã PIN hoặc mật khẩu VPB cần truyền cho thiết bị');  
  if (!text) return;

  console.log('1. Đang đóng các app đang mở...');
  await actionADB({ action: 'closeAll', device_id: data.device_id }); 
  await delay(1000);

  console.log('2. Khởi động app VPB...');
  await actionADB({ action: 'startVPB', device_id: data.device_id });
  await delay(6000);    
  
  // Kiểm tra nếu `text` là số thì dùng inputPINVPB, nếu không thì dùng input
  if (!isNaN(text) && !text.includes(' ')) {
    console.log('3. Scan QR');  
    await actionADB({ action: 'scanQRVPB', device_id: data.device_id });
    await delay(500);
    console.log('4. Login');
    await actionADB({ action: 'inputPINVPB', device_id: data.device_id, text: text.trim() });   
  } else {
    console.log('3. Scan QR');  
    await actionADB({ action: 'scanQRVPB2', device_id: data.device_id });
    console.log('4. Login');
    // Nhập mật khẩu xong 66, 61, 66
    await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() }); 
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 }); 
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 }); 
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 }); 
  }
  await delay(4000); // trong lúc loading vào trong thì cho chờ thêm để giảm số file track  

  // Track VPB while it is in process  
  console.log('5. Đang theo dõi VPB...');
  const trackVPBPromise = actionADB({ action: 'trackVPB', device_id: data.device_id });

  console.log('6. Đang bắt đầu chọn ảnh sau khi nhập xong PIN / mật khẩu đăng nhập...');  
  await actionADB({ action: 'scanQRVPB', device_id: data.device_id });

  // Đợi trackVPB hoàn thành (nếu app VPB bị thoát)
  const trackResult = await trackVPBPromise;
  if (!trackResult) {
    console.log('📢 Theo dõi VPB đã kết thúc.');
  }

  // console.log('6. Delete all of imgs in /sdcard');
  // await actionADB({ action: 'delImg', device_id: data.device_id }); 

  setLoading(false);
};

// ============== MB BANK ============== //

export const mbScanQR = async (data, setLoading) => {  
  const deviceCoordinates = await actionADB({ action: 'checkDeviceMB', device_id: data.device_id }); 

  if (deviceCoordinates.status === 500) {
    return swalNotification("error", "Thiết bị chưa hỗ trợ MB Bank", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
  }  

  setLoading(true);    

  const text = await swalInputPass('Nhập mật khẩu', '', 'Nhập mật khẩu MB Bank cần truyền vào thiết bị');
  if (!text) return;

  // console.log('1. Copy QR images'); 
  // await actionADB({ action: 'copyQRImages', device_id: data.device_id });

  console.log('1. Đang đóng các app đang mở...');
  await actionADB({ action: 'closeAll', device_id: data.device_id }); 
  await delay(1000); 

  console.log('2. Khởi động app MB Bank...');
  await actionADB({ action: 'startMB', device_id: data.device_id });

  await delay(10000);  

  console.log('3. Login');  
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() });
  await delay(1000);
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 }); 
  await delay(4000); // trong lúc loading vào trong thì cho chờ thêm để giảm số file track

  // Track MB App while it is in process  
  console.log('4. Đang theo dõi MB Bank...');
  const trackMBPromise = actionADB({ action: 'trackMB', device_id: data.device_id });

  console.log('5. Scan QR');
  await actionADB({ action: 'scanQRMB', device_id: data.device_id });  
  await delay(3000); 

  // Đợi trackMB hoàn thành (nếu app MB Bank bị thoát)
  const trackResult = await trackMBPromise;
  if (!trackResult) {
    console.log('📢 Theo dõi MB Bank đã kết thúc.');
  }

  // console.log('6. Delete all of imgs in /sdcard');
  // await actionADB({ action: 'delImg', device_id: data.device_id }); 

  setLoading(false);
};

// ============== MSB ============== //

export const msbScanQR = async (data, setLoading) => {  
  const deviceCoordinates = await actionADB({ action: 'checkDeviceMSB', device_id: data.device_id }); 

  if (deviceCoordinates.status === 500) {
    return swalNotification("error", "Thiết bị chưa hỗ trợ MSB", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
  }  

  setLoading(true);    

  const text = await swalInputPass('Nhập mã PIN', '', 'Nhập mật khẩu MSB cần truyền vào thiết bị');
  if (!text) return;

  console.log('1. Đang đóng các app đang mở...');
  await actionADB({ action: 'closeAll', device_id: data.device_id }); 
  await delay(1000);  

  console.log('2. Khởi động app MSB...');
  await actionADB({ action: 'startMSB', device_id: data.device_id });
  await delay(10000);

  // Track MSB App while it is in process  
  console.log('3. Đang theo dõi MSB...');
  console.log('Nhưng MSB không cho dump màn hình.');  

  console.log('4. Scan QR');
  await actionADB({ action: 'clickScanQRMSB', device_id: data.device_id }); 
  await delay(300); 

  console.log('5. Login');    
  await actionADB({ action: 'inputPINMSB', device_id: data.device_id, text: text.trim() });   
  await delay(4000); // trong lúc loading vào trong thì cho chờ thêm để giảm số file track

  const trackMSBPromise = actionADB({ action: 'trackMSB', device_id: data.device_id });

  console.log('6. Scan QR');
  await actionADB({ action: 'clickSelectImageMSB', device_id: data.device_id });
  await delay(3000);
   
  // Đợi trackMSB hoàn thành (nếu app MSB bị thoát)
  const trackResult = await trackMSBPromise;
  if (!trackResult) {
    console.log('📢 Theo dõi MSB đã kết thúc.');
  }

  // console.log('7. Delete all of imgs in device');
  // await actionADB({ action: 'delImg', device_id: data.device_id }); 

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
    console.log('1. Đang đóng các app đang mở...');
    await actionADB({ action: 'closeAll', device_id: data.device_id }); 
    await delay(1000);

    console.log('2. Đang khởi động BIDV...');
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
    await delay(1200);

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

    // Nhập mật khẩu đăng nhập và mã PIN để xác nhận giao dịch
    const text = await swalInputPass('Nhập mật khẩu', '', 'Nhập mật khẩu cần truyền vào thiết bị');
    if (!text) return;
    const text2 = await swalInputPass('Nhập mã PIN', '', 'Nhập mã PIN cần truyền vào thiết bị');
    if (!text2) return;
    setLoading(true);
    await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() });

    // Start app
    console.log('1. Đang đóng các app đang mở...');
    await actionADB({ action: 'closeAll', device_id: data.device_id }); 
    await delay(1000);

    console.log('2. Khởi động app VTB...');
    await actionADB({ action: 'startVTB', device_id: data.device_id });
    await delay(6000);
    
    // Tab vào ô Scan QR và chọn ảnh .. chọn mã QR thủ công ... xóa luôn ảnh trong thư viện
    console.log('3. scanQR');
    await actionADB({ action: 'scanQRVTB', device_id: data.device_id }); // Chọn ảnh từ trong máy         
    await delay(2000);

    console.log('4. Login');  
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 });    
    await actionADB({ action: 'inputVTB', device_id: data.device_id, text: text.trim() });
    await delay(1000);
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 20 });
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 }); 
    await delay(5000);

    console.log('5. Click Next / Confirm');  
    await actionADB({ action: 'clickConfirmVTB', device_id: data.device_id });
    await delay(12000); // chờ quét mặt hoặc video loading...
    await actionADB({ action: 'inputPINVTB', device_id: data.device_id, text: text2.trim() });
    await delay(4000);
    await actionADB({ action: 'clickConfirmVTB', device_id: data.device_id });

    setLoading(false);
  } catch (error) {
    swalToast({ title: `Đã xảy ra lỗi: ${error.message}`, icon: 'error' });
    console.error(error);
  } finally {
    setLoading(false);
  }
};

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
    await delay(4000);
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

// ============== SHB SAHA ============== //

export const shbsahaScanQR = async (data, setLoading) => {
  const deviceCoordinates = await actionADB({ action: 'checkDeviceSHBSAHA', device_id: data.device_id }); 

  if (deviceCoordinates.status === 500) {
    return swalNotification("error", "Thiết bị chưa hỗ trợ SHB SAHA", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
  }  

  setLoading(true);    

  const text = await swalInputPass('Nhập mật khẩu', '', 'Nhập mật khẩu SHB SAHA cần truyền vào thiết bị');
  if (!text) return;

  console.log('1. Đang đóng các app đang mở...');
  await actionADB({ action: 'closeAll', device_id: data.device_id }); 
  await delay(1000); 

  console.log('2. Khởi động app SHB SAHA...');
  await actionADB({ action: 'startSHBSAHA', device_id: data.device_id });
  await delay(5000);

  console.log('3. Login');
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });    
  await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() });
  await delay(500);
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 });
  await delay(4000); // trong lúc loading vào trong thì cho chờ thêm để giảm số file track

  // Track SHB SAHA while it is in process  
  console.log('4. Đang theo dõi SHB SAHA...');
  const trackSHBSAHAPromise = actionADB({ action: 'trackSHBSAHA', device_id: data.device_id });                

  console.log('5. Scan QR');
  await actionADB({ action: 'scanQRSHBSAHA', device_id: data.device_id });

  // Đợi trackSHBSAHA hoàn thành (nếu app SHB SAHA bị thoát)
  const trackResult = await trackSHBSAHAPromise;
  if (!trackResult) {
    console.log('📢 Theo dõi SHB SAHA đã kết thúc.');
  }
};

export const shbsahaLogin = async (data, setLoading) => {
  const text = await swalInputPass('Nhập mật khẩu', '', 'Nhập mật khẩu cần truyền vào thiết bị');
  if (!text) return;
  setLoading(true);

  try {
    console.log('1. Đang đóng các app đang mở...');
    await actionADB({ action: 'closeAll', device_id: data.device_id }); 
    await delay(1000); 

    console.log('2. Khởi động app SHB SAHA...');
    await actionADB({ action: 'startSHBSAHA', device_id: data.device_id });
    await delay(5000);

    console.log('3. Login');  
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
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
export const babScanQR = async (data, setLoading) => {  
  const deviceCoordinates = await actionADB({ action: 'checkDeviceBAB', device_id: data.device_id }); 

  if (deviceCoordinates.status === 500) {
    return swalNotification("error", "Thiết bị chưa hỗ trợ BAB", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
  }  

  setLoading(true);    

  const text = await swalInputPass('Nhập mật khẩu', '', 'Nhập mật khẩu BAB cần truyền vào thiết bị');  
  if (!text) return;

  console.log('1. Đang đóng các app đang mở...');
  await actionADB({ action: 'closeAll', device_id: data.device_id }); 
  await delay(1000); 

  console.log('2. Khởi động app BAB...');
  await actionADB({ action: 'startBAB', device_id: data.device_id });
  await delay(6000);

  // // Track BAB while it is in process  
  // const trackBABAppPromise = actionADB({ action: 'trackBABApp', device_id: data.device_id });

  console.log('3. Scan QR');  
  await actionADB({ action: 'scanQRBAB', device_id: data.device_id });
  await delay(500);

  // console.log('4. Login');  
  // await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() }); 
  // await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 }); 
  
  // // Đợi trackBABApp hoàn thành (nếu app BAB bị thoát)
  // const trackResult = await trackBABAppPromise;
  // if (!trackResult) {
  //   console.log('📢 Theo dõi BAB đã kết thúc.');
  // }

  setLoading(false);
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