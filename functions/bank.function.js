require('dotenv').config();
const adb = require('adbkit');
const fs = require('fs');
const path = require('path');
const { delay } = require('../helpers/functionHelper');
const adbPath = path.join(__dirname, '../platform-tools', 'adb.exe');
const client = adb.createClient({ bin: adbPath });
const { Logger } = require("../config/require.config");
const coordinatesLoginABB = require('../config/coordinatesLoginABB.json');
const adbHelper = require('../helpers/adbHelper');
const deviceHelper = require('../helpers/deviceHelper');
const { isACBRunning, isEIBRunning, isOCBRunning, isNABRunning, isTPBRunning, isVPBRunning, isMBRunning, isMSBRunning } = require('../functions/bankStatus.function');
const notifier = require('../events/notifier');

async function clearTempFile( { device_id } ) {
  try {                
    await client.shell(device_id, `rm /sdcard/temp_dump.xml`);
    await delay(1000);    
  } catch (error) {
    Logger.log(2, `Cannot delete file temp_dump.xml: ${error.message}`, __filename);
  }
}

async function waitForXmlReady(device_id, remotePath = '/sdcard/temp_dump.xml', timeout = 3000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      const output = await client.shell(device_id, `ls ${remotePath}`)
        .then(adb.util.readAll)
        .then(buf => buf.toString().trim());

      if (output === remotePath) return true;
    } catch (_) {
      // file chưa tồn tại, tiếp tục vòng lặp
    }
    await delay(200); // không nên để thấp hơn 200ms để tránh spam shell
  }
  return false;
}

async function dumpXmlToLocal(device_id, localPath) {
  try {
    const remotePath = `/sdcard/temp_dump.xml`;
    await client.shell(device_id, `uiautomator dump ${remotePath}`);

    const ready = await waitForXmlReady(device_id, remotePath);
    if (!ready) throw new Error('XML file not ready after dump');

    const transfer = await client.pull(device_id, remotePath);
    await new Promise((resolve, reject) => {
      const fileStream = fs.createWriteStream(localPath);
      transfer.pipe(fileStream);
      fileStream.on('finish', resolve);
      fileStream.on('error', reject);
    });
  } catch (error) {
    console.error(`dumpXmlToLocal error: ${error.message}`);
  }
}

const allCoordinates = {
  tpb: require('../config/coordinatesScanQRTPB.json'),
  eib: require('../config/coordinatesScanQREIB.json'),  
  shb: require('../config/coordinatesScanQRSHBSAHA.json'),  
  ocb: require('../config/coordinatesScanQROCB.json'),
  nab: require('../config/coordinatesScanQRNAB.json'),  
  mb: require('../config/coordinatesScanQRMB.json'),
  acb: require('../config/coordinatesScanQRACB.json'),
  vpb: require('../config/coordinatesScanQRVPB.json') 
};

async function loadCoordinates(bankCode, device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);
    const coordinates = allCoordinates[bankCode.toLowerCase()]?.[deviceModel];

    if (!coordinates) throw new Error(`Không tìm thấy tọa độ cho thiết bị: ${deviceModel}`);

    return coordinates;
  } catch (error) {
    console.error(`Error loading coordinates for ${bankCode}: ${error.message}`);
    throw error;
  }
}

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

const waitStartApp = {
  tpb: 4000,
  eib: 4000,
  shb: 4000,
  ocb: 4000,
  nab: 5000,
  mb: 6000,  
  acb: 10000,
  vpb: 5000,
  abb: 6000,
  stb: 4000
};

const waitLoginApp = {
  tpb: 3500,
  eib: 3000,
  shb: 4000,
  ocb: 4000,
  nab: 5000,
  mb: 6000,   
  acb: 5000,
  vpb: 5000,
  abb: 6000,
  stb: 4000
};

const stopABB = async ({ device_id }) => {    
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop vn.abbank.retail');
  Logger.log(2, `Đã dừng ABB`, __filename);
  await delay(200);
  return { status: 200, message: 'Success' };
};

const stopEIB = async ({ device_id }) => {    
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop com.vnpay.EximBankOmni');
  Logger.log(2, `Đã dừng EIB`, __filename);
  await delay(200);
  return { status: 200, message: 'Success' };
};

const stopHDB = async ({ device_id }) => {    
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop com.vnpay.hdbank');
  Logger.log(2, `Đã dừng HDB`, __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
};

const stopICB = async ({ device_id }) => {    
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop com.vietinbank.ipay');
  Logger.log(2, `Đã dừng ICB`, __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
};

const stopOCB = async ({ device_id }) => {    
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop vn.com.ocb.awe');
  Logger.log(2, `Đã dừng OCB`, __filename);
  await delay(200);
  return { status: 200, message: 'Success' };
};

const stopNAB = async ({ device_id }) => {    
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop ops.namabank.com.vn');
  Logger.log(2, `Đã dừng NAB`, __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
};

const stopTPB = async ({ device_id }) => {    
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop com.tpb.mb.gprsandroid');
  Logger.log(2, `Đã dừng TPB`, __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
};

const stopVPB = async ({ device_id }) => {    
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop com.vnpay.vpbankonline');
  Logger.log(2, `Đã dừng VPB`, __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
};   

const stopMB = async ({ device_id }) => {    
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop com.mbmobile');
  Logger.log(2, `Đã dừng MB`, __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
};

const stopSHBSAHA = async ({ device_id }) => {    
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop vn.shb.saha.mbanking');
  Logger.log(2, `Đã dừng SHB SAHA`, __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
};

const stopSTB = async ({ device_id }) => {    
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop com.sacombank.ewallet');
  Logger.log(2, `Đã dừng Sacombank`, __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
};

const startABB = async ({ device_id }) => {    
  Logger.log(0, `Đang khởi động ABB...`, __filename);
  await client.shell(device_id, 'monkey -p vn.abbank.retail -c android.intent.category.LAUNCHER 1');  
  await delay(200);
  return { status: 200, message: 'Success' };
};

const startACB = async ({ device_id }) => {    
  Logger.log(0, `Đang khởi động ACB...`, __filename);
  await client.shell(device_id, 'monkey -p mobile.acb.com.vn -c android.intent.category.LAUNCHER 1');  
  await delay(200);
  return { status: 200, message: 'Success' };
};

const startBAB = async ({ device_id }) => {    
  Logger.log(0, `Đang khởi động BẮC Á BANK...`, __filename);
  await client.shell(device_id, 'monkey -p com.bab.retailUAT -c android.intent.category.LAUNCHER 1');  
  await delay(200);
  return { status: 200, message: 'Success' };
};

const startEIB = async ({ device_id }) => {      
  Logger.log(0, `Đang khởi động EIB...`, __filename);
  await client.shell(device_id, 'monkey -p com.vnpay.EximBankOmni -c android.intent.category.LAUNCHER 1');  
  await delay(200);
  return { status: 200, message: 'Success' };
};

const startHDB = async ({ device_id }) => {      
  Logger.log(0, `Đang khởi động HDB...`, __filename);
  await client.shell(device_id, 'monkey -p com.vnpay.hdbank -c android.intent.category.LAUNCHER 1');  
  await delay(200);
  return { status: 200, message: 'Success' };
};

const startOCB = async ({ device_id }) => {    
  Logger.log(0, `Đang khởi động OCB...`, __filename);
  await client.shell(device_id, 'monkey -p vn.com.ocb.awe -c android.intent.category.LAUNCHER 1');  
  await delay(200);
  return { status: 200, message: 'Success' };
};

const startNAB = async ({ device_id }) => {  
  Logger.log(0, `Đang khởi động NAB...`, __filename);
  await client.shell(device_id, 'monkey -p ops.namabank.com.vn -c android.intent.category.LAUNCHER 1');    
  await delay(500);
  return { status: 200, message: 'Success' };
};

const startTPB = async ({ device_id }) => {  
  Logger.log(0, `Đang khởi động TPB...`, __filename);
  await client.shell(device_id, 'monkey -p com.tpb.mb.gprsandroid -c android.intent.category.LAUNCHER 1');  
  await delay(500);
  return { status: 200, message: 'Success' };
};

const startVPB = async ({ device_id }) => {
  Logger.log(0, `Đang khởi động VPB...`, __filename);
  await client.shell(device_id, 'monkey -p com.vnpay.vpbankonline -c android.intent.category.LAUNCHER 1');
  await delay(500);
  return { status: 200, message: 'Success' };
};

const startMB = async ({ device_id }) => {
  Logger.log(0, `Đang khởi động MB...`, __filename);
  await client.shell(device_id, 'monkey -p com.mbmobile -c android.intent.category.LAUNCHER 1');
  await delay(500);
  return { status: 200, message: 'Success' };
};

const startNCB = async ({ device_id }) => {
  Logger.log(0, `Đang khởi động NCB...`, __filename);
  await client.shell(device_id, 'monkey -p com.ncb.bank -c android.intent.category.LAUNCHER 1');
  await delay(500);
  return { status: 200, message: 'Success' };
};

const startVIETBANK = async ({ device_id }) => {
  Logger.log(0, `Đang khởi động VIETBANK...`, __filename);
  await client.shell(device_id, 'monkey -p com.vnpay.vietbank -c android.intent.category.LAUNCHER 1');
  await delay(500);
  return { status: 200, message: 'Success' };
};

const startSHBSAHA = async ({ device_id }) => {
  Logger.log(0, `Đang khởi động SHB SAHA...`, __filename);
  await client.shell(device_id, 'monkey -p vn.shb.saha.mbanking -c android.intent.category.LAUNCHER 1');
  await delay(500);
  return { status: 200, message: 'Success' };
};

const startSTB = async ({ device_id }) => {
  Logger.log(0, `Đang khởi động Sacom...`, __filename);
  await client.shell(device_id, 'monkey -p com.sacombank.ewallet -c android.intent.category.LAUNCHER 1');
  await delay(500);
  return { status: 200, message: 'Success' };
};

const mapStopBank = {
  abb: stopABB,
  eib: stopEIB,
  hdb: stopHDB,
  icb: stopICB,
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
  bab: startBAB,
  eib: startEIB,
  hdb: startHDB,
  ocb: startOCB,
  nab: startNAB,
  tpb: startTPB,
  vpb: startVPB,     
  mb: startMB,
  ncb: startNCB,
  shb: startSHBSAHA,
  stb: startSTB
};

const bankPackages = {
  abb: 'vn.abbank.retail',
  acb: 'mobile.acb.com.vn',
  eib: 'com.vnpay.EximBankOmni',
  hdb: 'com.vnpay.hdbank',
  icb: 'com.vietinbank.ipay',
  ocb: 'vn.com.ocb.awe',
  nab: 'ops.namabank.com.vn',
  ncb: 'com.ncb.bank',
  tpb: 'com.tpb.mb.gprsandroid',
  vpb: 'com.vnpay.vpbankonline',
  mb: 'com.mbmobile',
  shb: 'vn.shb.saha.mbanking',
  stb: 'com.sacombank.ewallet'
};

async function forceKillApp({ device_id, packageName }) {
  try {    
    await client.shell(device_id, `am force-stop ${packageName}`);
    await delay(1000);
    await client.shell(device_id, `killall ${packageName}`).catch(() => {});    
  } catch (err) {
    console.error(`Không thể force-kill ${packageName}:`, err.message);
  }
}

// check running bank
async function isBankAppRunning({ bank, device_id }) {
  const packageName = bankPackages[bank.toLowerCase()];
  if (!packageName) return false;  

  try {
    const output = await client.shell(device_id, `dumpsys activity activities | grep -i ${packageName}`)
      .then(adb.util.readAll)
      .then(buffer => buffer.toString().trim());
    
    return output.includes(packageName);
  } catch (error) {
    Logger.log(2, `Lỗi khi kiểm tra app đang chạy: ${error.message}`, __filename);
    return false;
  }
}

function getBankPass(bank, device_id) {
  const filePath = path.join(__dirname, '../database/local-banks.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const list = JSON.parse(raw);

  const normalizedAppId = bank?.toUpperCase().trim();
  const normalizedDeviceId = device_id?.trim();

  const matched = list.find(e => {
    const bankName = e["NGÂN HÀNG"]?.toUpperCase().trim();
    const deviceField = e["THIẾT BỊ"]?.trim() || "";
    return bankName === normalizedAppId && deviceField.includes(normalizedDeviceId);
  });

  if (!matched || !matched["MẬT KHẨU"]) {    
    Logger.log(2, `[ERROR] Không tìm thấy dòng phù hợp với bank=${normalizedAppId}, device_id=${normalizedDeviceId}`, __filename);
    // Phát thông báo realtime
    notifier.emit('multiple-banks-detected', {
      device_id,
      message: `[ERROR] Không tìm thấy dòng phù hợp với bank=${normalizedAppId}, device_id=${normalizedDeviceId}`
    });

    throw new Error("Không tìm thấy mật khẩu từ Google Sheets");
  }

  return matched["MẬT KHẨU"].toString().trim();
}

const loginABB = async ({ device_id }) => {      
  Logger.log(0, `3. Login ABB...`, __filename);
  const coordinatesLoginABB = await loadCoordinatesLoginABB(device_id);
  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);

  const bank = info?.data?.bank?.toUpperCase(); // googlesheet viết hoa bank
  const password = getBankPass(bank, device_id);
        
  // nó có cái nhập mật khẩu bằng mã PIN hoặc chuỗi chưa làm.
  for (const char of password) {
    await adbHelper.tapXY(device_id, ...coordinatesLoginABB[char]);                    
    await delay(50); 
  }    
                      
  return { status: 200, message: 'Success' };
};

const loginEIB = async ({ device_id, bank }) => {    
  Logger.log(0, `3. Login EIB...`, __filename);

  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);

  // bank = info?.data?.bank;
  bank = info?.data?.bank_temp || info?.data?.bank;
  const password = getBankPass(bank, device_id);        
  await client.shell(device_id, 'input tap 918 305');
  await delay(1000);
  await client.shell(device_id, 'input tap 118 820');
  await delay(400);
  await client.shell(device_id, 'input tap 118 820');
  await delay(400);
  await client.shell(device_id, `input text ${password}`);
  await delay(1200);  
  await client.shell(device_id, 'input tap 540 1020');
};

const loginTPB = async ({ device_id, bank }) => {    
  Logger.log(0, `3. Login TPB...`, __filename);

  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);

  bank = info?.data?.bank;
  const password = getBankPass(bank, device_id);        
  await client.shell(device_id, 'input tap 326 1333');
  await delay(500);
  await client.shell(device_id, `input text ${password}`);
  await delay(1100);  
  await client.shell(device_id, 'input tap 760 997');
};

const loginNAB = async ({ device_id, bank }) => {    
  Logger.log(0, `3. Login NAB...`, __filename);

  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);

  bank = info?.data?.bank;
  const password = getBankPass(bank, device_id);        
  await client.shell(device_id, 'input tap 540 655');
  await delay(800);
  await client.shell(device_id, 'input tap 540 866');
  await delay(300);
  await client.shell(device_id, 'input tap 540 866');
  await delay(600);
  await client.shell(device_id, `input text ${password}`);
  await delay(1100);  
  await client.shell(device_id, 'input tap 540 1186');
};

const loginMB = async ({ device_id }) => {
  Logger.log(0, `3. Login MB...`, __filename);

  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);

  const bank = info?.data?.bank;
  const password = getBankPass(bank, device_id);
  
  await client.shell(device_id, 'input keyevent 61');
  await client.shell(device_id, 'input keyevent 61');
  await delay(500);
  await client.shell(device_id, `input text ${password}`);
  await delay(1000);
  await client.shell(device_id, 'input keyevent 66');
  await client.shell(device_id, 'input keyevent 66');
};

const loginOCB = async ({ device_id }) => {      
  Logger.log(0, `3. Login OCB OMNI 4.0...`, __filename);

  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);

  const bank = info?.data?.bank;
  const password = getBankPass(bank, device_id);   
  await client.shell(device_id, 'input tap 540 1955');
  await delay(1500);
  console.log('log password in loginOCB:', password);   
  await client.shell(device_id, `input text ${password}`);
};

const loginSHBSAHA = async ({ device_id }) => {    
  const deviceModel = await deviceHelper.getDeviceModel(device_id); 
  Logger.log(0, `3. Login SHB SAHA...`, __filename);

  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);

  const bank = info?.data?.bank;
  const password = getBankPass(bank, device_id);   
  if (deviceModel === 'SM-N960') {
    await client.shell(device_id, 'input tap 118 1040');
    await delay(500);
  }  
  else if (deviceModel === "SM-A155") {
    await client.shell(device_id, 'input tap 118 1147');
    await delay(500);
  }        
  await client.shell(device_id, `input text ${password}`);
  await delay(1100);
  await client.shell(device_id, 'input tap 540 1220');
};

const loginSTB = async ({ device_id }) => {    
  Logger.log(0, `3. Login Sacom...`, __filename);

  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);

  const bank = info?.data?.bank;
  const password = getBankPass(bank, device_id);        
  await client.shell(device_id, 'input tap 970 220');
  await delay(300);   
  await client.shell(device_id, 'input tap 540 1666');
  await delay(1000);
  await client.shell(device_id, `input text ${password}`);
  await delay(1100);
  await client.shell(device_id, 'input tap 540 911');
};

// const loginVAB = async ({ device_id, bank }) => {    
//   Logger.log(0, `3. Login VAB...`, __filename);

//   const infoPath = path.join(__dirname, '../database/info-qr.json');
//   const raw = fs.readFileSync(infoPath, 'utf-8');
//   const info = JSON.parse(raw);

//   // bank = info?.data?.bank;
//   bank = info?.data?.bank_temp || info?.data?.bank;
//   const password = getBankPass(bank, device_id);        
//   await client.shell(device_id, 'input tap 918 305');
//   await delay(1000);
//   await client.shell(device_id, 'input tap 118 820');
//   await delay(400);
//   await client.shell(device_id, 'input tap 118 820');
//   await delay(400);
//   await client.shell(device_id, `input text ${password}`);
//   await delay(1200);  
//   await client.shell(device_id, 'input tap 540 1020');
// };

const mapLoginBank = {
  tpb: loginTPB,
  eib: loginEIB,
  shb: loginSHBSAHA,
  ocb: loginOCB,
  abb: loginABB,  
  nab: loginNAB,
  mb: loginMB,  
  stb: loginSTB,  
};

const reset = async (timer, device_id, bank) => {
  timer++;
  const count = 30;

  if (isNaN(timer)) {
    Logger.log(2, `Reset vì timer không hợp lệ: ${timer}`, __filename);
    await runBankTransfer({ device_id, bank });
    return 0;
  }

  if (timer >= count) {
    Logger.log(1, `Đã đạt giới hạn retry (${timer}/${count}), reset lại...`, __filename);
    await runBankTransfer({ device_id, bank });
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

const scanQRTPB = async ({ device_id, transId }) => {  
  const coordinates = await loadCoordinates('tpb', device_id);
  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);
  transId = info?.data?.trans_id;

  await adbHelper.tapXY(device_id, ...coordinates['ScanQR']);
  await delay(800);
  await adbHelper.tapXY(device_id, ...coordinates['Image']);
  await delay(800);
  await adbHelper.tapXY(device_id, ...coordinates['Target-Image-1']);

  return { status: 200, message: 'QR đã được chọn' };
};

const scanQREIB = async ({ device_id, transId }) => {  
  const coordinates = await loadCoordinates('eib', device_id);
  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);
  transId = info?.data?.trans_id;

  await adbHelper.tapXY(device_id, ...coordinates['ScanQR']);
  await delay(800);
  await adbHelper.tapXY(device_id, ...coordinates['Image']);
  await delay(1000);
  await adbHelper.tapXY(device_id, ...coordinates['Target-Img']);

  return { status: 200, message: 'QR đã được chọn' };
};

const scanQRSHBSAHA = async ({ device_id }) => {    
  const coordinates = await loadCoordinates('shb', device_id);
    
  await adbHelper.tapXY(device_id, ...coordinates['ScanQR']);
  await delay(600);                  
  await adbHelper.tapXY(device_id, ...coordinates['Image']);
  await delay(900);   
  await adbHelper.tapXY(device_id, ...coordinates['Target-Img']);        

  return { status: 200, message: 'Success' };
};

const scanQROCB = async ({ device_id }) => {    
    const coordinates = await loadCoordinates('ocb', device_id);
    await adbHelper.tapXY(device_id, ...coordinates['ScanQR']);
    await delay(600);                  
    await adbHelper.tapXY(device_id, ...coordinates['Image']);
    // Cài trước bằng cấp full quyền cho app OCB rồi click chọn ảnh từ các tệp đã ẩn để app nó lưu đường dẫn
    // thì sẽ không cần các bước như đã hidden bên dưới nữa
    // await delay(1000);   
    // await adbHelper.tapXY(device_id, ...coordinatesScanQROCB['Hamburger-Menu']);
    // await delay(800);   
    // await adbHelper.tapXY(device_id, ...coordinatesScanQROCB['Galaxy-Note9']);
    // await delay(600);                 
    // await client.shell(device_id, `input swipe 500 1800 500 300`);          
    await delay(900);
    await adbHelper.tapXY(device_id, ...coordinates['Target-Img']); 
    // await delay(600);
    // await adbHelper.tapXY(device_id, ...coordinatesScanQROCB['Finish']);       

    return { status: 200, message: 'Success' };
};

const scanQRNAB = async ({ device_id, transId }) => { 
  const logDir = path.join('C:\\att_mobile_client\\logs\\'); 
  const coordinates = await loadCoordinates('nab', device_id);
  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);
  transId = info?.data?.trans_id;  

  await adbHelper.tapXY(device_id, ...coordinates['ScanQR']);
  await delay(800);
  await adbHelper.tapXY(device_id, ...coordinates['Image']);
  await delay(800);
  // await adbHelper.tapXY(device_id, ...coordinates['Hamburger-Menu']);
  // await delay(800);

  let useReportBug = false;

  await delay(2500);

  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);      

  const latestFile = path.join(logDir, files[0].name);
  const content = fs.readFileSync(latestFile, 'utf-8');  

  if (content.includes("Báo cáo lỗi")) {
    Logger.log(0, `Đang ở màn hình có "Báo cáo lỗi", "Bộ sưu tập", "Dấu vết hệ thống", "File của bạn"`, __filename);
    useReportBug = true;
    Logger.log(0, `NAB XML dump cho thấy đang ở TH1 (có tồn tại "Báo cáo lỗi")`, __filename);
  } else {
    Logger.log(0, `NAB XML dump cho thấy đang ở TH2 (không có tồn tại "Báo cáo lỗi")`, __filename);
  }

  const galleryCoord = useReportBug ? coordinates['Gallery2'] : coordinates['Gallery1'];  

  await adbHelper.tapXY(device_id, ...galleryCoord);
  await delay(800);
  await adbHelper.tapXY(device_id, ...coordinates['Target-Img']);

  return { status: 200, message: 'QR đã được chọn' };
};

const scanQRMB = async ({ device_id, transId }) => { 
  const logDir = path.join('C:\\att_mobile_client\\logs\\'); 
  const coordinates = await loadCoordinates('mb', device_id);
  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);
  transId = info?.data?.trans_id;  

  await adbHelper.tapXY(device_id, ...coordinates['ScanQR']);
  await delay(800);
  await adbHelper.tapXY(device_id, ...coordinates['Image']);
  await delay(800);

  let useReportBug = false;

  await delay(2500);

  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);      

  const latestFile = path.join(logDir, files[0].name);
  const content = fs.readFileSync(latestFile, 'utf-8');  

  if (content.includes("Báo cáo lỗi")) {
    Logger.log(0, `Đang ở màn hình có "Báo cáo lỗi", "Bộ sưu tập", "Dấu vết hệ thống", "File của bạn"`, __filename);
    useReportBug = true;
    Logger.log(0, `MB XML dump cho thấy đang ở TH1 (có tồn tại "Báo cáo lỗi")`, __filename);
  } else {
    Logger.log(0, `MB XML dump cho thấy đang ở TH2 (không có tồn tại "Báo cáo lỗi")`, __filename);
  }

  const galleryCoord = useReportBug ? coordinates['Gallery2'] : coordinates['Gallery1'];

  await adbHelper.tapXY(device_id, ...galleryCoord);
  await delay(800);
  await adbHelper.tapXY(device_id, ...coordinates['Target-Img']);

  return { status: 200, message: 'QR đã được chọn' };
};

const scanQRACB = async ({ device_id }) => {    
  const coordinatesScanQRACB = await loadCoordinatesScanQRACB(device_id);
    
  // await adbHelper.tapXY(device_id, ...coordinatesScanQRACB['Hide-Popup']);
  // await adbHelper.tapXY(device_id, ...coordinatesScanQRACB['Hide-Popup']);
  // await delay(500);                  
  await adbHelper.tapXY(device_id, ...coordinatesScanQRACB['ScanQR']);
  await delay(600);                  
  await adbHelper.tapXY(device_id, ...coordinatesScanQRACB['Select-Image']);           
  await delay(600); 
  await adbHelper.tapXY(device_id, ...coordinatesScanQRACB['Select-Target-Img']);     

  return { status: 200, message: 'Success' };
};

const scanQRVPB = async ({ device_id, transId }) => {    
    const coordinatesScanQRVPB = await loadCoordinatesScanQRVPB(device_id);
    const deviceModel = await deviceHelper.getDeviceModel(device_id);        
    
    await adbHelper.tapXY(device_id, ...coordinatesScanQRVPB['Upload-Image']); 
    await delay(1000);                  
    await adbHelper.tapXY(device_id, ...coordinatesScanQRVPB['Select-Image']); 
    await delay(2000);     
    await adbHelper.tapXY(device_id, ...coordinatesScanQRVPB['Target-Image']); 

    if (deviceModel === 'ONEPLUS A5000') {  // Nếu là ONEPLUS A5000 thì click thêm Target-Image-2
      await delay(500);     
      await adbHelper.tapXY(device_id, ...coordinatesScanQRVPB['Target-Image-2']); 
    }

    return { status: 200, message: 'Success' };
};

const scanQRABB = async ({ device_id }) => {    
  const coordinatesScanQRSHBSAHA = await loadCoordinatesScanQRABB(device_id);
    
  await adbHelper.tapXY(device_id, ...coordinatesScanQRSHBSAHA['ScanQR']);
  await delay(600);                  
  await adbHelper.tapXY(device_id, ...coordinatesScanQRSHBSAHA['Image']);
  await delay(1000);   
  await adbHelper.tapXY(device_id, ...coordinatesScanQRSHBSAHA['Target-Img']);        

  return { status: 200, message: 'Success' };
};

const scanQRSTB = async ({ device_id }) => {    
  const coordinatesScanQRSHBSAHA = await loadCoordinatesScanQRSTB(device_id);
    
  await adbHelper.tapXY(device_id, ...coordinatesScanQRSHBSAHA['ScanQR']);
  await delay(600);                  
  await adbHelper.tapXY(device_id, ...coordinatesScanQRSHBSAHA['Image']);
  await delay(1000);   
  await adbHelper.tapXY(device_id, ...coordinatesScanQRSHBSAHA['Target-Img']);        

  return { status: 200, message: 'Success' };
};

const scanQRMap = {
  tpb: scanQRTPB,
  eib: scanQREIB,
  shb: scanQRSHBSAHA,
  ocb: scanQROCB,
  abb: scanQRABB,  
  nab: scanQRNAB,
  mb: scanQRMB,  
  stb: scanQRSTB,  
};

const bankStartSuccessKeywords = {
  tpb: ["Chúc bạn một ngày tốt lành &#128079;", "Mật khẩu"],
  eib: [""], // Màn hình đăng nhập (sau khi khởi động app) là rỗng
  shb: ["Nhập mật khẩu"],
  ocb: ["Tìm ATM và chi nhánh", "Tra cứu lãi suất", "Liên hệ hỗ trợ", "Đăng nhập"],  
  nab: ["Tap &amp; Pay", "Soft OTP", "Happy Cashback", "Quét QR"],
  mb: ["Xin chào,", "Tài khoản khác", "Quên mật khẩu?", "Đăng nhập", "Xác thực D-OTP"],
  acb: ["aaaaaaaaaaaaaaaaaaaaa"], // chưa làm                
  vpb: ["Mật khẩu", "Đăng nhập", "Quên mật khẩu?"] // chưa ok
};

const bankLoginSuccessKeywords = {
  tpb: ["Xin chào &#128075;&#127996;", "Trang Chủ", "Chợ tiện ích", "Quét mọi QR", "Dịch vụ NH", "Cá Nhân"],
  eib: [""], // Màn hình sau login là rỗng
  shb: ["Chuyển tiền", "Thanh toán", "Tài khoản", "Tiết kiệm", "Thẻ"],  
  ocb: ["Tài khoản của tôi", "Chuyển tiền", "Xem tất cả", "Thanh toán hóa đơn"],
  nab: ["Trang chủ", "Tiện ích", "Đăng nhập VTM", "Giới thiệu", "Cài đặt", "Quét QR", "Xin chào,"],
  mb: ["Trang chủ", "Thẻ", "Ưu đãi", "Chuyển tiền", "Tổng số dư VND&#10;*** *** VND"], // Chú ý đoạn này sau update app
  acb: ["Tài khoản", "Chuyển khoản", "Hóa đơn"], // chưa làm    
  vpb: ["Tài khoản", "QR Code", "Chuyển tiền"] // chưa ok
};

const scanQRSuccessKeywords = {
  eib: ['com.vnpay.EximBankOmni:id/layThuong'],
  shb: ['Chuyển tiền đến', 'Ngân hàng nhận', 'Số tài khoản', 'Tên người nhận', 'Số tiền', 'Lời nhắn', 'Tài khoản nguồn'],
  mb: ['Gallery', 'Gần đây'], // chưa làm
  abb: ['ABBANK', 'Chọn ảnh'], // chưa làm
  stb: ['Sacombank', 'Hình ảnh'], // chưa làm
  vpb: ['QR Code', 'Chọn ảnh'], // chưa làm
  ocb: ['Thư viện', 'Gallery'], // chưa làm
  tpb: ['Chuyển tiền tới', 'Tiếp tục'],
  nab: ['Money transfer', 'Transfer to', 'Account', 'Card', 'QR', 'Source account', 'Beneficary Bank', 'Account number', 
        'Chuyển tiền đến tài khoản', 'Chuyển đến', 'Tài khoản', 'Thẻ', 'QR', 'Tài khoản nguồn', 'Ngân hàng nhận', 'Tài khoản nhận tiền'],
  acb: ['Chọn ảnh', 'Gallery'] // chưa làm
};

async function checkStartApp({ device_id, bank }) {
  const logDir = path.join('C:\\att_mobile_client\\logs\\');
  const keywords = bankStartSuccessKeywords[bank.toLowerCase()] || [];

  let attempt = 0;
  const maxAttempts = 5;
  const retryDelay = 2000;

  while (attempt < maxAttempts) {
    try {
      await delay(retryDelay);

      const files = fs.readdirSync(logDir)
        .filter(f => f.endsWith('.xml'))
        .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
        .sort((a, b) => b.time - a.time);

      if (files.length === 0) {
        Logger.log(2, `${bank.toUpperCase()} khởi động app thất bại: không tìm thấy file XML`, __filename);
        attempt++;
        continue;
      }

      const latestFile = path.join(logDir, files[0].name);
      const content = fs.readFileSync(latestFile, 'utf-8');      

      if (keywords.some(k => content.includes(k))) {
        Logger.log(0, `${bank.toUpperCase()} đã khởi động app thành công - Timestamp: ${new Date().toISOString()}`, __filename);
        return true;
      }
    } catch (err) {
      Logger.log(2, `${bank.toUpperCase()} khởi động app thất bại: lỗi đọc XML - ${err.message}`, __filename);
    }

    attempt++;
  }

  Logger.log(2, `${bank.toUpperCase()} khởi động app thất bại hoặc không xác định qua XML sau ${maxAttempts} lần thử`, __filename);
  return false;
}

async function checkLogin({ device_id, bank }) {
  const logDir = path.join('C:\\att_mobile_client\\logs\\');
  const keywords = bankLoginSuccessKeywords[bank.toLowerCase()] || [];

  let attempt = 0;
  const maxAttempts = 5;
  const retryDelay = 2000;

  while (attempt < maxAttempts) {
    try {
      await delay(retryDelay);

      const files = fs.readdirSync(logDir)
        .filter(f => f.endsWith('.xml'))
        .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
        .sort((a, b) => b.time - a.time);

      if (files.length === 0) {
        Logger.log(2, `${bank.toUpperCase()} login thất bại: không tìm thấy file XML`, __filename);
        attempt++;
        continue;
      }

      const latestFile = path.join(logDir, files[0].name);
      const content = fs.readFileSync(latestFile, 'utf-8');      

      if (keywords.some(k => content.includes(k))) {
        Logger.log(0, `${bank.toUpperCase()} đã login thành công - Timestamp: ${new Date().toISOString()}`, __filename);
        return true;
      }
    } catch (err) {
      Logger.log(2, `${bank.toUpperCase()} login thất bại: lỗi đọc XML - ${err.message}`, __filename);
    }

    attempt++;
  }

  Logger.log(2, `${bank.toUpperCase()} login thất bại hoặc không xác định qua XML sau ${maxAttempts} lần thử`, __filename);
  return false;
}

async function checkScanQR({ device_id, bank, transId }) {
  const logDir = path.join('C:\\att_mobile_client\\logs\\');
  const keywords = scanQRSuccessKeywords[bank.toLowerCase()] || [];
  const maxAttempts = 5;
  const retryDelay = 2000;
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      await delay(retryDelay);

      const files = fs.readdirSync(logDir)
        .filter(f => f.endsWith('.xml'))
        .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
        .sort((a, b) => b.time - a.time);

      if (files.length === 0) {
        Logger.log(2, `${bank.toUpperCase()} ScanQR thất bại: không tìm thấy file XML`, __filename);
        attempt++;
        continue;
      }

      const latestFile = path.join(logDir, files[0].name);
      const content = fs.readFileSync(latestFile, 'utf-8');

      if (keywords.some(k => content.includes(k))) {
        Logger.log(0, `${bank.toUpperCase()} ScanQR thành công`, __filename);
        return true;
      }
    } catch (err) {
      Logger.log(2, `${bank.toUpperCase()} ScanQR thất bại: lỗi đọc XML - ${err.message}`, __filename);
    }

    attempt++;
  }

  Logger.log(2, `${bank.toUpperCase()} ScanQR thất bại hoặc không xác định qua XML sau ${maxAttempts} lần thử`, __filename);
  return false;
}

const runBankTransfer = async ({ device_id, bank }) => {
  const stopApp = mapStopBank[bank.toLowerCase()];
  // Dọn sạch logs cũ
  const logDir = path.join('C:\\att_mobile_client\\logs\\');
  fs.readdirSync(logDir)
  .filter(file => file.endsWith('.xml'))
  .forEach(file => fs.unlinkSync(path.join(logDir, file)));
  
  const startApp = mapStartBank[bank.toLowerCase()];  
  const loginApp = mapLoginBank[bank.toLowerCase()];

  if (!startApp || !loginApp) {
    return { status: 400, valid: false, message: 'Không hỗ trợ ngân hàng này' };
  }

  Logger.log(0, `1. Stop ${bank.toUpperCase()}`, __filename);
  await stopApp({ device_id });  
  await forceKillApp({ device_id, packageName: bank });

  Logger.log(0, `2. Start ${bank.toUpperCase()}`, __filename);
  await startApp({ device_id });  
  await delay(waitStartApp[bank.toLowerCase()]);  

  let startAppDetected = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    startAppDetected = await checkStartApp({ device_id, bank });
    if (startAppDetected) break;
    Logger.log(1, `Retry xác định màn hình startApp lần ${attempt + 1}`, __filename);
    await delay(5000); // delay 5s giữa các lần thử
  }

  if (!startAppDetected) {
    return { status: 400, valid: false, message: 'Không xác định được màn hình khi khởi động thành công' };
  }

  Logger.log(0, `3. Login ${bank.toUpperCase()}`, __filename);
  await loginApp({ device_id }); 
  await delay(waitLoginApp[bank.toLowerCase()]);  

  // const loginDetected = await checkLogin({ device_id, bank });
  // if (!loginDetected) {
  //   return { status: 400, valid: false, message: 'Không xác định được màn hình login thành công' };
  // }

  let loginDetected = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    loginDetected = await checkLogin({ device_id, bank });
    if (loginDetected) break;
    Logger.log(1, `Retry xác định màn hình startApp lần ${attempt + 1}`, __filename);
    await delay(5000); // delay 5s giữa các lần thử
  }

  if (!loginDetected) {
    return { status: 400, valid: false, message: 'Không xác định được màn hình login thành công' };
  }

  return { status: 200, valid: true, message: 'Đăng nhập thành công' };
};

const bankTransfer = async ({ device_id, bank }) => {
  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const json = JSON.parse(raw);
  const type = json?.type;  
  bank = json?.data?.bank;  
  transId = json?.data?.transId;  

  if (type !== 'att' || !device_id || !bank) {
    return { status: 400, valid: false, message: 'Thiếu thông tin hoặc sai kiểu kết nối' };
  }

  const scanQRApp = scanQRMap[bank.toLowerCase()];
  if (!scanQRApp) {
    return { status: 400, valid: false, message: 'Ngân hàng chưa hỗ trợ scanQR' };
  }

  let retries = 0;

  while (retries < 30) {
    const transStatus = await checkTransactions({ device_id });
    const started = await isBankAppRunning({ bank, device_id });      

    if (transStatus === 'in_process' && started) {
      Logger.log(0, `TH1 - Đã login app + có đơn -> ScanQR`, __filename);
      await scanQRApp({ device_id });
      return { status: 200, valid: true, message: 'TH1: ScanQR thành công' };
    }

    if (transStatus !== 'in_process' && started) {
      Logger.log(0, `TH2 - Đã login app + chưa có đơn -> retry...max 30 -> reset`, __filename);
    }

    if (transStatus === 'in_process' && !started) {
      Logger.log(0, `TH3 - Có đơn + chưa login app → chạy lại`, __filename);
      await runBankTransfer({ device_id, bank });
      await delay(waitStartApp[bank.toLowerCase()]);  
      await scanQRApp({ device_id, transId });
      const scanned = await checkScanQR({ device_id, bank, transId });
      if (scanned) return { status: 200, valid: true, message: 'TH3: ScanQR thành công sau login' };      
    }

    if (transStatus !== 'in_process' && !started) {
      Logger.log(0, `TH4 - Chưa login app + chưa có đơn → chạy login trước`, __filename);
      await runBankTransfer({ device_id, bank });
      await delay(waitStartApp[bank.toLowerCase()]);  
    }

    await delay(1000);
    retries = await reset(retries, device_id, bank);
  }

  return { status: 200, valid: true, message: 'Hết retry, đã reset lại app và chờ đơn mới' };
};

module.exports = {
  bankTransfer,
  runBankTransfer,  
  startNCB,  
  startHDB,
  startVIETBANK,
  startEIB
};