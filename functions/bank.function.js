require('dotenv').config();
const adb = require('adbkit');
const fs = require('fs');
const path = require('path');
const { delay } = require('../helpers/functionHelper');
const adbPath = path.join(__dirname, '../platform-tools', 'adb.exe');
const client = adb.createClient({ bin: adbPath });
const { Logger } = require("../config/require.config");
const coordinatesLoginABB = require('../config/coordinatesLoginABB.json');
const coordinatesScanQREIB = require('../config/coordinatesScanQREIB.json');
const coordinatesScanQREIB2 = require('../config/coordinatesScanQREIB2.json');
const adbHelper = require('../helpers/adbHelper');
const deviceHelper = require('../helpers/deviceHelper');
const { isACBRunning, isEIBRunning, isOCBRunning, isNABRunning, 
  isTPBRunning, isVPBRunning, isMBRunning, isMSBRunning
} = require('../functions/bankStatus.function');

async function clearTempFile( { device_id } ) {
  try {                
    await client.shell(device_id, `rm /sdcard/temp_dump.xml`);
    await delay(1000);    
  } catch (error) {
    console.error("Cannot delete file temp_dump.xml:", error.message);
  }
}

async function dumpXmlToLocal(device_id, localPath) {
  try {
    const tempPath = `/sdcard/temp_dump.xml`;
    await client.shell(device_id, `uiautomator dump ${tempPath}`);
    const transfer = await client.pull(device_id, tempPath);

    await new Promise((resolve, reject) => {
      const fileStream = fs.createWriteStream(localPath);
      transfer.pipe(fileStream);
      fileStream.on('finish', resolve);
      fileStream.on('error', reject);
    });

    await delay(500);
  } catch (error) {
    console.error(`dumpXmlToLocal error: ${error.message}`);
  }
}

async function readXmlWithRetry(filePath, retries = 3, delayMs = 1500) {
  for (let i = 0; i < retries; i++) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8').trim();
      if (content.length > 0) return content;
    }
    await delay(delayMs);
  }
  return '';
};

async function loadCoordinatesLoginABB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    
  
    const deviceCoordinates = coordinatesLoginABB[deviceModel];
  
    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesLoginABB for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesScanQREIB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesScanQREIB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQREIB for device: ${error.message}`);
    throw error;
  }
}

async function loadCoordinatesScanQREIB2(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesScanQREIB2[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQREIB for device: ${error.message}`);
    throw error;
  }
}

const delayMap = {
  abb: 6000,
  acb: 10000,
  eib: 4000,
  tpb: 3000,
  ocb: 5000,
  nab: 5000,
  vpb: 5000,
  mb: 5000,
  shb: 3500,
  stb: 4000
};

const stopABB = async ({ device_id }) => {    
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop vn.abbank.retail');
  console.log('Đã dừng app ABBBank');
  await delay(200);
  return { status: 200, message: 'Success' };
};

const stopEIB = async ({ device_id }) => {    
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop com.vnpay.EximBankOmni');
  console.log('Đã dừng app EximBank EDigi');
  await delay(200);
  return { status: 200, message: 'Success' };
};

const stopOCB = async ({ device_id }) => {    
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop vn.com.ocb.awe');
  console.log('Đã dừng app OCB');
  await delay(200);
  return { status: 200, message: 'Success' };
};

const stopNAB = async ({ device_id }) => {    
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop ops.namabank.com.vn');
  console.log('Đã dừng app NAB');
  await delay(500);
  return { status: 200, message: 'Success' };
};

const stopTPB = async ({ device_id }) => {    
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop com.tpb.mb.gprsandroid');
  console.log('Đã dừng app TPB');
  await delay(500);
  return { status: 200, message: 'Success' };
};

const stopVPB = async ({ device_id }) => {    
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop com.vnpay.vpbankonline');
  console.log('Đã dừng app VPB');
  await delay(500);
  return { status: 200, message: 'Success' };
};   

const stopMB = async ({ device_id }) => {    
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop com.mbmobile');
  console.log('Đã dừng app MB');
  await delay(500);
  return { status: 200, message: 'Success' };
};

const stopSHBSAHA = async ({ device_id }) => {    
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop vn.shb.saha.mbanking');
  console.log('Đã dừng app SHB SAHA');
  await delay(500);
  return { status: 200, message: 'Success' };
};

const stopSTB = async ({ device_id }) => {    
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop com.sacombank.ewallet');
  console.log('Đã dừng app Sacombank');
  await delay(500);
  return { status: 200, message: 'Success' };
};

const startABB = async ({ device_id }) => {    
  await client.shell(device_id, 'monkey -p vn.abbank.retail -c android.intent.category.LAUNCHER 1');
  console.log('Đang khởi động app ABB');
  await delay(200);
  return { status: 200, message: 'Success' };
};

const startACB = async ({ device_id }) => {    
  await client.shell(device_id, 'monkey -p mobile.acb.com.vn -c android.intent.category.LAUNCHER 1');
  console.log('Đang khởi động app ACB');
  await delay(200);
  return { status: 200, message: 'Success' };
};

const startEIB = async ({ device_id }) => {    
  // await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'monkey -p com.vnpay.EximBankOmni -c android.intent.category.LAUNCHER 1');
  console.log('Đang khởi động app Eximbank EDigi');
  await delay(200);
  return { status: 200, message: 'Success' };
};

const startOCB = async ({ device_id }) => {    
  await client.shell(device_id, 'monkey -p vn.com.ocb.awe -c android.intent.category.LAUNCHER 1');
  console.log('Đang khởi động app OCB');
  await delay(200);
  return { status: 200, message: 'Success' };
};

const startNAB = async ({ device_id }) => {
  console.log('Đang khởi động app NAB...');
  await client.shell(device_id, 'monkey -p ops.namabank.com.vn -c android.intent.category.LAUNCHER 1');
  await delay(500);
  return { status: 200, message: 'Success' };
};

const startTPB = async ({ device_id }) => {
  console.log('Đang khởi động app TPB...');
  await client.shell(device_id, 'monkey -p com.tpb.mb.gprsandroid -c android.intent.category.LAUNCHER 1');
  await delay(500);
  return { status: 200, message: 'Success' };
};

const startVPB = async ({ device_id }) => {
  console.log('Đang khởi động app VPB...');
  await client.shell(device_id, 'monkey -p com.vnpay.vpbankonline -c android.intent.category.LAUNCHER 1');
  await delay(500);
  return { status: 200, message: 'Success' };
};

const startMB = async ({ device_id }) => {
  console.log('Đang khởi động app MB...');
  await client.shell(device_id, 'monkey -p com.mbmobile -c android.intent.category.LAUNCHER 1');
  await delay(500);
  return { status: 200, message: 'Success' };
};

const startSHBSAHA = async ({ device_id }) => {
  console.log('Đang khởi động app SHB SAHA...');
  await client.shell(device_id, 'monkey -p vn.shb.saha.mbanking -c android.intent.category.LAUNCHER 1');
  await delay(500);
  return { status: 200, message: 'Success' };
};

const startSTB = async ({ device_id }) => {
  console.log('Đang khởi động app Sacom...');
  await client.shell(device_id, 'monkey -p com.sacombank.ewallet -c android.intent.category.LAUNCHER 1');
  await delay(500);
  return { status: 200, message: 'Success' };
};

const mapStopBank = {
  abb: stopABB,
  eib: stopEIB,
  ocb: stopOCB,
  nab: stopNAB,
  tpb: stopTPB,
  vpb: stopVPB,     
  mb: stopMB,
  shb: stopSHBSAHA,
  stb: stopSTB
};

const mapStartBank = {
  abb: startABB,
  acb: startACB,
  eib: startEIB,
  ocb: startOCB,
  nab: startNAB,
  tpb: startTPB,
  vpb: startVPB,     
  mb: startMB,
  shb: startSHBSAHA,
  stb: startSTB
};

const bankPackages = {
  abb: 'vn.abbank.retail',
  acb: 'mobile.acb.com.vn',
  eib: 'com.vnpay.EximBankOmni',
  ocb: 'vn.com.ocb.awe',
  nab: 'ops.namabank.com.vn',
  tpb: 'com.tpb.mb.gprsandroid',
  vpb: 'com.vnpay.vpbankonline',
  mb: 'com.mbmobile',
  shb: 'vn.shb.saha.mbanking',
  stb: 'com.sacombank.ewallet'
};

async function isBankAppRunning({ appId, device_id }) {
  const packageName = bankPackages[appId.toLowerCase()];
  if (!packageName) return false;

  try {
    const output = await client.shell(device_id, `pidof ${packageName}`)
      .then(adb.util.readAll)
      .then(buffer => buffer.toString().trim());
    return output !== '';
  } catch (error) {
    console.error(`[ERROR] Kiểm tra app ${appId} không chạy được:`, error.message);
    return false;
  }
}

function getPasswordFromLocalBanks(appId, device_id) {
  const filePath = path.join(__dirname, '../database/local-banks.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const list = JSON.parse(raw);

  const normalizedAppId = appId?.toUpperCase().trim();
  const normalizedDeviceId = device_id?.trim();

  const matched = list.find(e => {
    const bankName = e["NGÂN HÀNG"]?.toUpperCase().trim();
    const deviceField = e["THIẾT BỊ"]?.trim() || "";
    return bankName === normalizedAppId && deviceField.includes(normalizedDeviceId);
  });

  if (!matched || !matched["MẬT KHẨU"]) {
    console.log(`[ERROR] Không tìm thấy dòng phù hợp với appId=${normalizedAppId}, device_id=${normalizedDeviceId}`);
    throw new Error("Không tìm thấy mật khẩu từ Google Sheets");
  }

  return matched["MẬT KHẨU"].toString().trim();
}

const loginABB = async ({ device_id }) => {    
  console.log('Login ABB...');
  const coordinatesLoginABB = await loadCoordinatesLoginABB(device_id);
  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);

  const appId = info?.data?.appId?.toUpperCase(); // googlesheet viết hoa appId
  const password = getPasswordFromLocalBanks(appId, device_id);
        
  // nó có cái nhập mật khẩu bằng mã PIN hoặc chuỗi chưa làm.
  for (const char of password) {
    await adbHelper.tapXY(device_id, ...coordinatesLoginABB[char]);                    
    await delay(50); 
  }    
                      
  return { status: 200, message: 'Success' };
};

const loginEIB = async ({ device_id, appId }) => {    
  console.log('Login EIB...');

  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);

  appId = info?.data?.appId;
  const password = getPasswordFromLocalBanks(appId, device_id);        
  await client.shell(device_id, 'input tap 918 305');
  await delay(1000);
  await client.shell(device_id, 'input tap 118 820');
  await delay(500);
  // await client.shell(device_id, 'input tap 118 820');
  await client.shell(device_id, `input text ${password}`);
  await delay(500);  
  await client.shell(device_id, 'input tap 540 1020');
};

// chưa xong
const loginMB = async ({ device_id }) => {
  console.log('Login MB...');

  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);

  const appId = info?.appId;
  const password = getPasswordFromLocalBanks(appId, device_id);

  await client.shell(device_id, 'input keyevent 61');
  await client.shell(device_id, 'input keyevent 61');
  await client.shell(device_id, `input text ${password}`);
};

const loginSHBSAHA = async ({ device_id }) => {    
  console.log('Login SHB SAHA...');

  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);

  const appId = info?.appId;
  const password = getPasswordFromLocalBanks(appId, device_id);        
  await client.shell(device_id, 'input tap 118 1035');
  // await delay(500);   
  await client.shell(device_id, `input text ${password}`);
  await delay(500);
  await client.shell(device_id, 'input keyevent 66');
  await client.shell(device_id, 'input keyevent 66');
};

const loginSTB = async ({ device_id }) => {    
  console.log('Login Sacom...');

  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);

  const appId = info?.appId;
  const password = getPasswordFromLocalBanks(appId, device_id);        
  await client.shell(device_id, 'input tap 970 220');
  await delay(300);   
  await client.shell(device_id, 'input tap 540 1666');
  await delay(1000);
  await client.shell(device_id, `input text ${password}`);
  await delay(300);
  await client.shell(device_id, 'input tap 540 911');
};

const mapLoginBank = {
  abb: loginABB,
  eib: loginEIB,
  mb: loginMB,
  shb: loginSHBSAHA,
  stb: loginSTB
};

const reset = async (timer, device_id, appId) => {
  timer++;
  const count = 30;

  if (isNaN(timer)) {
    Logger.log(2, `Reset vì timer không hợp lệ: ${timer}`, __filename);
    await runBankTransfer({ device_id, appId });
    return 0;
  }

  if (timer >= count) {
    Logger.log(1, `Đã đạt giới hạn retry (${timer}/${count}), reset lại...`, __filename);
    await runBankTransfer({ device_id, appId });
    return 0;
  }

  Logger.log(1, `Retry lần ${timer}/${count}`, __filename);
  return timer;
};

const checkTransactions = async ({ device_id }) => {
  const infoPath = path.join(__dirname, '../database/info-qr.json');
  if (!fs.existsSync(infoPath)) return null;

  try {
    const raw = fs.readFileSync(infoPath, 'utf-8');
    const json = JSON.parse(raw);
    const deviceInFile = json?.data?.device_id;
    const transStatus = json?.data?.trans_status;
    const transId = json?.data?.trans_id;

    if (deviceInFile === device_id && transId) {
      return transStatus;
    }
  } catch (err) {
    console.error("checkTransactions error:", err);
  }

  return null;
};

const scanQREIB = async ({ device_id }) => {
  const coordinates = await loadCoordinatesScanQREIB(device_id);
  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);
  const transId = info?.data?.trans_id;

  await adbHelper.tapXY(device_id, ...coordinates['ScanQR']);
  await delay(600);
  await adbHelper.tapXY(device_id, ...coordinates['Image']);
  await delay(1000);
  await adbHelper.tapXY(device_id, 216, 555);

  // const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  // await clearTempFile({ device_id });

  // const containsText = (content, texts) => {
  //   return texts.every(text => content.includes(text));
  // };

  // let running = await isEIBRunning({ device_id });
  // while (running) {
  //   const timestamp = Math.floor(Date.now() / 1000).toString();
  //   const localDumpPath = path.join(targetDir, `${timestamp}.xml`);
  //   await dumpXmlToLocal(device_id, localDumpPath);
  //   await delay(500);
  //   const xmlContent = fs.readFileSync(localDumpPath, 'utf-8').trim();

  //   if (containsText(xmlContent, ['Camera', 'HÌNH ẢNH TRÊN GALAXY NOTE9', `${transId}.jpg`])) {
  //     await adbHelper.tapXY(device_id, 99, 480);
  //     break;
  //   } else if (containsText(xmlContent, ['Camera', 'HÌNH ẢNH TRÊN GALAXY NOTE9'])) {
  //     await adbHelper.tapXY(device_id, 955, 305);
  //     await delay(1000);

  //     const retryTimestamp = Math.floor(Date.now() / 1000).toString();
  //     const retryPath = path.join(targetDir, `${retryTimestamp}_retry.xml`);
  //     await dumpXmlToLocal(device_id, retryPath);
  //     await delay(500);
  //     const retryContent = fs.readFileSync(retryPath, 'utf-8').trim();

  //     if (containsText(retryContent, ['Camera', 'HÌNH ẢNH TRÊN GALAXY NOTE9', `${transId}.jpg`])) {
  //       await adbHelper.tapXY(device_id, 99, 480);
  //     } else {
  //       console.log('Không tìm thấy ảnh sau khi chuyển chế độ lưới.');
  //     }
  //     break;
  //   }
  // }

  return { status: 200, message: 'QR đã được chọn' };
};

const scanQRMB = async ({ device_id, localPath }) => {
  const coordinatesDevice = await loadCoordinatesScanQRMB(device_id);    
  const coordinatesScanQRMB2 = await loadCoordinatesScanQRMB2(device_id);    
  const coordinatesScanQRMB3 = await loadCoordinatesScanQRMB3(device_id);    
  
  await adbHelper.tapXY(device_id, ...coordinatesDevice['ScanQR']);             
  await delay(800);   
  await adbHelper.tapXY(device_id, ...coordinatesDevice['Image']);
  await delay(800);       
  await adbHelper.tapXY(device_id, ...coordinatesDevice['Hamburger-Menu']);
  await delay(800);
  
  let running = await isMBRunning({ device_id });
  if (!running) return;     
    
  await clearTempFile({ device_id });
  
  let selectedCoords = coordinatesDevice;
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
      
  const keywordMap = {
    recent: ["Recent", "Gần đây"],
    images: ["Images", "Hình ảnh"],
    downloads: ["Downloads", "Tệp tải xuống"],
    bugReports: ["Bug reports", "Báo cáo lỗi"],
    gallery: ["Gallery", "Bộ sưu tập"],
    galaxyNote9: ["Galaxy Note9"]
  };
  
  while (running) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const localDumpPath = path.join(targetDir, `${timestamp}.xml`);
  
    await dumpXmlToLocal(device_id, localDumpPath);
    const xmlContent = fs.readFileSync(localDumpPath, "utf-8").trim();
  
    // Helper function: kiểm tra xem nội dung XML có chứa tất cả keyword (dù là tiếng Anh hay tiếng Việt)
    const containsAllKeywords = (keys) => {
      return keys.every(key =>
        keywordMap[key].some(kw => xmlContent.includes(kw))
      );
    };
  
    if (containsAllKeywords(['recent', 'images', 'downloads', 'galaxyNote9', 'bugReports', 'gallery'])) {
      console.log("🔄 Sử dụng coordinatesScanQRMB3 (Galaxy Note9 detected)");
      selectedCoords = coordinatesScanQRMB3;
      break;
    }
  
    if (containsAllKeywords(['recent', 'images', 'downloads', 'bugReports', 'gallery'])) {
      console.log("🔄 Sử dụng coordinatesScanQRMB2 (màn hình chứa Bộ sưu tập)");
      selectedCoords = coordinatesScanQRMB2;
      break;
    }
  }
  
  await adbHelper.tapXY(device_id, ...selectedCoords['Gallery']);
  await delay(800);                                               
  await adbHelper.tapXY(device_id, ...selectedCoords['Target-Img']);    
  
  return { status: 200, message: 'Success' };
};

const scanQRSHBSAHA = async ({ device_id }) => {    
  const coordinatesScanQRSHBSAHA = await loadCoordinatesScanQRSHBSAHA(device_id);
    
  await adbHelper.tapXY(device_id, ...coordinatesScanQRSHBSAHA['ScanQR']);
  await delay(600);                  
  await adbHelper.tapXY(device_id, ...coordinatesScanQRSHBSAHA['Image']);
  await delay(1000);   
  await adbHelper.tapXY(device_id, ...coordinatesScanQRSHBSAHA['Target-Img']);        

  return { status: 200, message: 'Success' };
};

const scanQRABB = async ({ device_id }) => {    
  const coordinatesScanQRSHBSAHA = await loadCoordinatesScanQRSHBSAHA(device_id);
    
  await adbHelper.tapXY(device_id, ...coordinatesScanQRSHBSAHA['ScanQR']);
  await delay(600);                  
  await adbHelper.tapXY(device_id, ...coordinatesScanQRSHBSAHA['Image']);
  await delay(1000);   
  await adbHelper.tapXY(device_id, ...coordinatesScanQRSHBSAHA['Target-Img']);        

  return { status: 200, message: 'Success' };
};

const scanQRSTB = async ({ device_id }) => {    
  const coordinatesScanQRSHBSAHA = await loadCoordinatesScanQRSHBSAHA(device_id);
    
  await adbHelper.tapXY(device_id, ...coordinatesScanQRSHBSAHA['ScanQR']);
  await delay(600);                  
  await adbHelper.tapXY(device_id, ...coordinatesScanQRSHBSAHA['Image']);
  await delay(1000);   
  await adbHelper.tapXY(device_id, ...coordinatesScanQRSHBSAHA['Target-Img']);        

  return { status: 200, message: 'Success' };
};

const scanQRMap = {
  abb: scanQRABB,
  eib: scanQREIB,
  mb: scanQRMB,
  shb: scanQRSHBSAHA,
  stb: scanQRSTB
};

const runBankTransfer = async ({ device_id, appId }) => {
  const stopApp = mapStopBank[appId.toLowerCase()];
  const startApp = mapStartBank[appId.toLowerCase()];
  const loginApp = mapLoginBank[appId.toLowerCase()];

  if (!startApp || !loginApp) {
    return { status: 400, valid: false, message: 'Không hỗ trợ ngân hàng này' };
  }

  Logger.log(0, `1. Stop ${appId.toUpperCase()}`, __filename);
  await stopApp({ device_id });
  await delay(500);

  Logger.log(0, `2. Start ${appId.toUpperCase()}`, __filename);
  await startApp({ device_id });
  await delay(delayMap[appId.toLowerCase()] || 5000);

  Logger.log(0, `3. Login ${appId.toUpperCase()}`, __filename);
  await loginApp({ device_id });
  await delay(3000);

  return { status: 200, valid: true, message: 'Đăng nhập thành công' };
};

const bankTransfer = async ({ device_id, appId }) => {
  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const json = JSON.parse(raw);
  const type = json?.type;  
  appId = json?.data?.appId;  

  if (type !== 'org' || !device_id || !appId) {
    return { status: 400, valid: false, message: 'Thiếu thông tin hoặc sai kiểu kết nối' };
  }

  const scanQRApp = scanQRMap[appId.toLowerCase()];
  if (!scanQRApp) {
    return { status: 400, valid: false, message: 'Ngân hàng chưa hỗ trợ scanQR' };
  }

  let retries = 0;

  while (retries < 30) {
    const transStatus = await checkTransactions({ device_id });
    const started = await isBankAppRunning({ appId, device_id });

    if (transStatus === 'in_process' && started) {
      Logger.log(0, `TH1 - Đã login app + có đơn: ScanQR`, __filename);
      await scanQRApp({ device_id });
      return { status: 200, valid: true, message: 'TH1: ScanQR thành công' };
    }

    if (transStatus !== 'in_process' && started) {
      Logger.log(0, `TH2 - Đã login app + chưa có đơn`, __filename);
    }

    if (transStatus === 'in_process' && !started) {
      Logger.log(0, `TH3 - Có đơn + chưa login app → chạy lại`, __filename);
      await runBankTransfer({ device_id, appId });
      await scanQRApp({ device_id });
      return { status: 200, valid: true, message: 'TH3: ScanQR thành công sau login' };
    }

    if (transStatus !== 'in_process' && !started) {
      Logger.log(0, `TH4 - Chưa login app + chưa có đơn → chạy login trước`, __filename);
      await runBankTransfer({ device_id, appId });
    }

    await delay(1000);
    retries = await reset(retries, device_id, appId);
  }

  return { status: 200, valid: true, message: 'Hết retry, đã reset lại app và chờ đơn mới' };
};

module.exports = {
  bankTransfer
};