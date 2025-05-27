import { swalInputPass, swalNotification, swalToast } from '../utils/swal';
import { actionADB } from './adb.service';
import { actionBank } from './bank.service';

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

export const copyQRImages = async (data) => {
  await actionADB({ action: 'copyQRImages', device_id: data.device_id });
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
};

export const connectTcpIp = async (data) => {
  return await actionADB({ action: 'connectTcpIp', device_id: data.device_id, type: data.type || 'wlan0' });
};

export const disconnectTcpIp = async (data) => {
  return await actionADB({ action: 'disconnectTcpIp', device_id: data.device_id });
};

// ============== CHUYỂN TIỀN ============== //

export const bankTransfer = async (data, setLoading) => {  
  const deviceCoordinates = await actionADB({ action: 'checkDevice', device_id: data.device_id }); 

  if (deviceCoordinates.status === 500) {
    return swalNotification("error", "Thiết bị chưa hỗ trợ xuất bán tự động", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
  }  

  setLoading(true);    
  
  // console.log('1. Đang đóng các app đang mở...');
  // await actionADB({ action: 'closeAll', device_id: data.device_id }); 
  // await delay(300); 

  console.log('2. Khởi động app bank tương ứng send.bank...');
  await actionBank({ action: 'bankTransfer', device_id: data.device_id });

  // await delay(10000);  

  // console.log('3. Login');  
  // await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  // await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  // await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() });
  // await delay(1000);
  // await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 }); 
  // await delay(4000); // trong lúc loading vào trong thì cho chờ thêm để giảm số file track

  // // Track MB App while it is in process  
  // console.log('4. Đang theo dõi MB Bank...');
  // const trackMBPromise = actionADB({ action: 'trackMB', device_id: data.device_id });

  // console.log('5. Scan QR');
  // await actionADB({ action: 'scanQRMB', device_id: data.device_id });  
  // await delay(3000); 

  // // Đợi trackMB hoàn thành (nếu app MB Bank bị thoát)
  // const trackResult = await trackMBPromise;
  // if (!trackResult) {
  //   console.log('Theo dõi MB Bank đã kết thúc.');
  // }

  // // console.log('6. Delete all of imgs in /sdcard');
  // // await actionADB({ action: 'delImg', device_id: data.device_id }); 

  setLoading(false);
};

// ============== BIDV ============== //

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
  await delay(3000);  

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

// ============== ICB ============== //

export const icbScanQR = async (data, setLoading) => {  
  try {       
    const deviceCoordinates = await actionADB({ action: 'checkDeviceICB', device_id: data.device_id });    
    const checkDeviceFHDOrNot = await actionADB({ action: 'checkDeviceFHD', device_id: data.device_id });    
            
    if (deviceCoordinates.status === 500) {
      return swalNotification("error", "Thiết bị chưa hỗ trợ ICB", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
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

    console.log('2. Khởi động app ICB...');
    await actionADB({ action: 'startICB', device_id: data.device_id });
    await delay(6000);
    
    // Tab vào ô Scan QR và chọn ảnh .. chọn mã QR thủ công ... xóa luôn ảnh trong thư viện
    console.log('3. scanQR');
    await actionADB({ action: 'scanQRICB', device_id: data.device_id }); // Chọn ảnh từ trong máy         
    await delay(2000);

    console.log('4. Login');  
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 });    
    await actionADB({ action: 'inputICB', device_id: data.device_id, text: text.trim() });
    await delay(1000);
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 20 });
    await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 }); 
    await delay(5000);

    console.log('5. Click Next / Confirm');  
    await actionADB({ action: 'clickConfirmICB', device_id: data.device_id });
    await delay(12000); // chờ quét mặt hoặc video loading...
    await actionADB({ action: 'inputPINICB', device_id: data.device_id, text: text2.trim() });
    await delay(4000);
    await actionADB({ action: 'clickConfirmICB', device_id: data.device_id });

    setLoading(false);
  } catch (error) {
    swalToast({ title: `Đã xảy ra lỗi: ${error.message}`, icon: 'error' });
    console.error(error);
  } finally {
    setLoading(false);
  }
};

export const icbLogin = async (data, setLoading) => {  
  const text = await swalInputPass('Nhập mật khẩu', '', 'Nhập mật khẩu cần truyền vào thiết bị');
  if (!text) return;
  
  setLoading(true);

  try {       
    const deviceCoordinates = await actionADB({ action: 'checkDeviceICB', device_id: data.device_id });    
    const checkDeviceFHDOrNot = await actionADB({ action: 'checkDeviceFHD', device_id: data.device_id });    
            
    if (deviceCoordinates.status === 500) {
      return swalNotification("error", "Thiết bị chưa hỗ trợ ICB", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
    }    

    if (checkDeviceFHDOrNot.status === 500) {
      return swalNotification("error", "Vui lòng cài đặt kích thước màn hình về FHD+");      
    } 
    
    // Start app
    await actionADB({ action: 'stopICB', device_id: data.device_id });
    await actionADB({ action: 'startICB', device_id: data.device_id });
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
    await actionADB({ action: 'inputICB', device_id: data.device_id, text: text.trim() });
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

export const icbConfirmAfterFace = async (data, setLoading) => {  
  try {       
    const deviceCoordinates = await actionADB({ action: 'checkDeviceICB', device_id: data.device_id });    
    const checkDeviceFHDOrNot = await actionADB({ action: 'checkDeviceFHD', device_id: data.device_id });    
            
    if (deviceCoordinates.status === 500) {
      return swalNotification("error", "Thiết bị chưa hỗ trợ ICB", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
    }    

    if (checkDeviceFHDOrNot.status === 500) {
      return swalNotification("error", "Vui lòng cài đặt kích thước màn hình về FHD+");      
    }    

    const text = await swalInputPass('Nhập mã PIN', '', 'Nhập mã PIN cần truyền vào thiết bị');
    if (!text) return;
    
    setLoading(true);

    // Click Tiếp tục (= Xác nhận)
    await actionADB({ action: 'clickConfirmICB', device_id: data.device_id });
    await delay(10000); // chờ quét mặt hoặc video loading...
    
    // Nhập mã PIN và xác nhận ... xóa luôn ảnh trong thư viện    
    await actionADB({ action: 'inputPINICB', device_id: data.device_id, text: text.trim() });    
    await actionADB({ action: 'delImg', device_id: data.device_id });    
    await delay(1000);

    // Click xác nhận
    await actionADB({ action: 'clickConfirmICB', device_id: data.device_id });

    setLoading(false);
  } catch (error) {
    swalToast({ title: `Đã xảy ra lỗi: ${error.message}`, icon: 'error' });
    console.error(error);
  } finally {
    setLoading(false);
  }
};

// ============== NCB ============== //

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

  console.log('3. Login...');  
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() });
  await delay(1000);
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 }); 
  await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 });  

  setLoading(false);
};

// ============== SHB SAHA ============== //

export const shbsahaScanQR = async (data, setLoading) => {
  const deviceCoordinates = await actionADB({ action: 'checkDeviceSHBSAHA', device_id: data.device_id }); 

  if (deviceCoordinates.status === 500) {
    return swalNotification("error", "Thiết bị chưa hỗ trợ SHB SAHA", "Vui lòng chuyển ngân hàng sang điện thoại khác");      
  }  

  // setLoading(true);    

  // const text = await swalInputPass('Nhập mật khẩu', '', 'Nhập mật khẩu SHB SAHA cần truyền vào thiết bị');
  // if (!text) return;

  // console.log('1. Đang đóng các app đang mở...');
  // await actionADB({ action: 'closeAll', device_id: data.device_id }); 
  // await delay(1000); 

  // console.log('2. Khởi động app SHB SAHA...');
  // await actionADB({ action: 'startSHBSAHA', device_id: data.device_id });
  // await delay(5000);

  // console.log('3. Login');
  // await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  // await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });
  // await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 61 });    
  // await actionADB({ action: 'input', device_id: data.device_id, text: text.trim() });
  // await delay(500);
  // await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 });
  // await actionADB({ action: 'keyEvent', device_id: data.device_id, key_event: 66 });
  // await delay(4000); // trong lúc loading vào trong thì cho chờ thêm để giảm số file track

  // // Track SHB SAHA while it is in process  
  // console.log('4. Đang theo dõi SHB SAHA...');
  // const trackSHBSAHAPromise = actionADB({ action: 'trackSHBSAHA', device_id: data.device_id });                

  // console.log('5. Scan QR');
  // await actionADB({ action: 'scanQRSHBSAHA', device_id: data.device_id });

  // // Đợi trackSHBSAHA hoàn thành (nếu app SHB SAHA bị thoát)
  // const trackResult = await trackSHBSAHAPromise;
  // if (!trackResult) {
  //   console.log('📢 Theo dõi SHB SAHA đã kết thúc.');
  // }

  return swalNotification("error", "Chức năng đang được bảo trì!", "Vui lòng quay lại sau.");
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