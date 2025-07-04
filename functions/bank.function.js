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
const { escapeAdbText } = require('../helpers/adbHelper');
const transferTaskManager = require('../helpers/transferTaskManager');
const { del } = require('request');

async function clearTempFile({ device_id }) {
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

const allCoordinates = {
  stb: require('../config/coordinatesScanQRSTB.json'),
  bab: require('../config/coordinatesScanQRBAB.json'),
  hdb: require('../config/coordinatesScanQRHDB.json'),
  tpb: require('../config/coordinatesScanQRTPB.json'),
  eib: require('../config/coordinatesScanQREIB.json'),
  shb: require('../config/coordinatesScanQRSHB.json'),
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

    if (!coordinates) throw new Error(`Không tìm thấy tọa độ cho thiết bị: ${deviceModel} để mà scan QR`);

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
  bab: 4000,
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
  bab: 3500,
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

const stopBAB = async ({ device_id }) => {
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop com.bab.retailUAT');
  Logger.log(2, `Đã dừng BAB`, __filename);
  await delay(500);
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

const stopSHB = async ({ device_id }) => {
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

const startSHB = async ({ device_id }) => {
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
  bab: stopBAB,
  eib: stopEIB,
  hdb: stopHDB,
  icb: stopICB,
  ocb: stopOCB,
  nab: stopNAB,
  tpb: stopTPB,
  vpb: stopVPB,
  mb: stopMB,
  shb: stopSHB,
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
  shb: startSHB,
  stb: startSTB
};

const bankPackages = {
  abb: 'vn.abbank.retail',
  acb: 'mobile.acb.com.vn',
  bab: 'com.bab.retailUAT',
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
    await client.shell(device_id, `killall ${packageName}`).catch(() => { });
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
    // Phát thông báo realtime
    notifier.emit('multiple-banks-detected', {
      device_id,
      message: `Không tìm thấy dòng phù hợp với bank=${normalizedAppId}, device_id=${normalizedDeviceId}`
    });

    Logger.log(2, `[ERROR] Không tìm thấy dòng phù hợp với bank=${normalizedAppId}, device_id=${normalizedDeviceId}`, __filename);

    return;
    // throw new Error("Không tìm thấy mật khẩu từ Google Sheets");    
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
  const escapedPassword = escapeAdbText(password);

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
  const escapedPassword = escapeAdbText(password);

  await client.shell(device_id, 'input tap 918 305');
  await delay(1000);
  await client.shell(device_id, 'input tap 118 820');  
  await client.shell(device_id, 'input tap 118 820');
  await delay(600);
  await client.shell(device_id, `input text ${escapedPassword}`);
  await delay(1100);
  await client.shell(device_id, 'input tap 540 1020');
};

const loginTPB = async ({ device_id, bank }) => {
  Logger.log(0, `3. Login TPB...`, __filename);

  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);

  bank = info?.data?.bank;
  const password = getBankPass(bank, device_id);
  const escapedPassword = escapeAdbText(password);

  await client.shell(device_id, 'input tap 326 1333');
  await delay(500);
  await client.shell(device_id, `input text ${escapedPassword}`);
  // Đợi đến khi đủ ký tự dạng ● rồi mới tap "Đăng nhập"  
  await submitLoginTPB({ device_id, bank }, password.length, 0);
};

const loginBAB = async ({ device_id, bank }) => {
  Logger.log(0, `3. Login BAB...`, __filename);

  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);

  bank = info?.data?.bank;
  const password = getBankPass(bank, device_id);
  const escapedPassword = escapeAdbText(password);

  await client.shell(device_id, 'input tap 540 870');
  await delay(200);
  await client.shell(device_id, 'input tap 540 870');
  await client.shell(device_id, `input text ${escapedPassword}`);
  // Đợi đến khi đủ ký tự dạng ● rồi mới tap "Đăng nhập"  
  await submitLoginBAB({ device_id, bank }, password.length, 0);
};

const loginNAB = async ({ device_id, bank }) => {
  Logger.log(0, `3. Login NAB...`, __filename);

  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);

  bank = info?.data?.bank;
  const password = getBankPass(bank, device_id);
  const escapedPassword = escapeAdbText(password);

  await client.shell(device_id, 'input tap 540 655');
  await delay(800);
  await client.shell(device_id, 'input tap 540 866');
  await delay(300);
  await client.shell(device_id, 'input tap 540 866');
  await delay(600);
  await client.shell(device_id, `input text ${escapedPassword}`);
  // await delay(1100);
  // await client.shell(device_id, 'input tap 540 1186');
  // Đợi đến khi đủ ký tự dạng ● rồi mới tap "Đăng nhập"  
  await submitLoginNAB({ device_id, bank }, password.length, 0);
};

const loginHDB = async ({ device_id, bank }) => {
  Logger.log(0, `3. Login HDB...`, __filename);

  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);

  bank = info?.data?.bank;
  const password = getBankPass(bank, device_id);
  const escapedPassword = escapeAdbText(password);

  await client.shell(device_id, 'input tap 540 800'); // click Login HDB
  await delay(200);
  await client.shell(device_id, 'input tap 540 800');
  await delay(300);
  await client.shell(device_id, `input text ${escapedPassword}`);
  // await delay(1000);
  // await client.shell(device_id, 'input keyevent 66');
  // await client.shell(device_id, 'input keyevent 66');
  
  // Đợi đến khi không có thông báo lỗi nhập sai mật khẩu thì mới submit login    
  await submitLoginHDB({ device_id, bank }, password.length, 0);  
};

const loginMB = async ({ device_id }) => {
  Logger.log(0, `3. Login MB...`, __filename);

  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);

  const bank = info?.data?.bank;
  const password = getBankPass(bank, device_id);
  const escapedPassword = escapeAdbText(password);

  console.log('log password:',password);
  console.log('log escapedPassword:',escapedPassword);

  await client.shell(device_id, 'input tap 540 1280');
  await client.shell(device_id, 'input tap 540 1280');
  await delay(500);
  await client.shell(device_id, `input text ${escapedPassword}`);
  // await client.shell(device_id, `input text NHka789%`);

  // await delay(1000);
  // await client.shell(device_id, 'input keyevent 66');
  // await client.shell(device_id, 'input keyevent 66');
  // Đợi đến khi đủ ký tự dạng ● rồi mới tap "Đăng nhập"  
  await submitLoginMB({ device_id, bank }, password.length, 0);
};

const loginOCB = async ({ device_id }) => {
  Logger.log(0, `3. Login OCB OMNI 4.0...`, __filename);

  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);
  const bank = info?.data?.bank;
  const password = getBankPass(bank, device_id);  

  await client.shell(device_id, 'input tap 540 1955');  
  await submitLoginOCB({ device_id, bank, password }, 0);
};

const loginSHB = async ({ device_id }) => {
  const deviceModel = await deviceHelper.getDeviceModel(device_id);
  Logger.log(0, `3. Login SHB SAHA...`, __filename);

  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);

  const bank = info?.data?.bank;
  const password = getBankPass(bank, device_id);
  const escapedPassword = escapeAdbText(password);

  if (deviceModel === 'SM-N960') {
    await client.shell(device_id, 'input tap 118 1040');
    await delay(500);
  }
  else if (deviceModel === "SM-A155") {
    await client.shell(device_id, 'input tap 118 1147');
    await delay(500);
  }
  await client.shell(device_id, `input text ${escapedPassword}`);
  // await delay(1100);
  // await client.shell(device_id, 'input tap 540 1220');

  // Đợi đến khi đủ ký tự dạng ● rồi mới tap "Đăng nhập"
  console.log('log password.length:',password.length);
  await submitLoginSHB ({ device_id, bank }, password.length, 0);  
};

const loginSTB = async ({ device_id }) => {
  Logger.log(0, `3. Login Sacom...`, __filename);

  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);

  const bank = info?.data?.bank;
  const password = getBankPass(bank, device_id);  

  // await client.shell(device_id, 'input tap 970 220');
  // await delay(300);
  // await client.shell(device_id, 'input tap 540 1666');
  // await delay(1000);
  // await client.shell(device_id, `input text ${escapedPassword}`);
  // await delay(1100);
  // await client.shell(device_id, 'input tap 540 911');

  await submitLoginSTB1({ device_id, bank }, password.length, 0);
  await submitLoginSTB2({ device_id, bank }, password.length, 0);
  await submitLoginSTB3({ device_id, bank }, password.length, 0);
  await submitLoginSTB4({ device_id, bank }, password.length, 0);
};

// const loginVAB = async ({ device_id, bank }) => {    
//   Logger.log(0, `3. Login VAB...`, __filename);

//   const infoPath = path.join(__dirname, '../database/info-qr.json');
//   const raw = fs.readFileSync(infoPath, 'utf-8');
//   const info = JSON.parse(raw);

//   // bank = info?.data?.bank;
//   bank = info?.data?.bank_temp || info?.data?.bank;
//   const password = getBankPass(bank, device_id);    
//   const escapedPassword = escapeAdbText(password);     

//   await client.shell(device_id, 'input tap 918 305');
//   await delay(1000);
//   await client.shell(device_id, 'input tap 118 820');
//   await delay(400);
//   await client.shell(device_id, 'input tap 118 820');
//   await delay(400);
//   await client.shell(device_id, `input text ${escapedPassword}`);
//   await delay(1200);  
//   await client.shell(device_id, 'input tap 540 1020');
// };

const mapLoginBank = {
  bab: loginBAB,
  hdb: loginHDB,
  tpb: loginTPB,
  eib: loginEIB,
  shb: loginSHB,
  ocb: loginOCB,
  abb: loginABB,
  nab: loginNAB,
  mb: loginMB,
  stb: loginSTB,
};

const reset = async (timer, device_id, bank, controller) => {
  timer++;
  const count = 30;

  if (isNaN(timer)) {
    Logger.log(2, `Reset vì timer không hợp lệ: ${timer}`, __filename);
    await runBankTransfer({ device_id, bank, controller });
    return 0;
  }

  if (timer >= count) {
    Logger.log(1, `Đã đạt giới hạn retry (${timer}/${count}), reset lại...`, __filename);
    await runBankTransfer({ device_id, bank, controller });
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
    console.error("checkTransactions got an error:", err);
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
  // Đoạn này tí chỉnh thành click vào Album thì hay hơn
  await adbHelper.tapXY(device_id, ...coordinates['Image']);
  await delay(800);
  await adbHelper.tapXY(device_id, ...coordinates['Target-Image-1']);

  return { status: 200, message: 'QR đã được chọn' };
};

const scanQRBAB = async ({ device_id }) => {
  const logDir = path.join('C:\\att_mobile_client\\logs\\');
  const coordinates = await loadCoordinates('bab', device_id);
  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);
  transId = info?.data?.trans_id;

  await adbHelper.tapXY(device_id, ...coordinates['ScanQR']);
  await delay(600);
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
    Logger.log(0, `Đang ở màn hình có "Báo cáo lỗi", "Bộ sưu tập", "File của bạn"`, __filename);
    useReportBug = true;
    Logger.log(0, `BAB XML dump cho thấy đang ở TH1 (có tồn tại "Báo cáo lỗi")`, __filename);
  } else {
    Logger.log(0, `BAB XML dump cho thấy đang ở TH2 (không có tồn tại "Báo cáo lỗi")`, __filename);
  }
  const galleryCoord = useReportBug ? coordinates['Gallery2'] : coordinates['Gallery1'];

  await adbHelper.tapXY(device_id, ...galleryCoord);
  await delay(800);
  await adbHelper.tapXY(device_id, ...coordinates['Target-Img']);

  return { status: 200, message: 'QR đã được chọn' };
};

const scanQRHDB = async ({ device_id, transId }) => {
  const coordinates = await loadCoordinates('hdb', device_id);
  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);
  transId = info?.data?.trans_id;

  await adbHelper.tapXY(device_id, ...coordinates['ScanQR']);
  await delay(800);
  await adbHelper.tapXY(device_id, ...coordinates['Image']);
  await delay(800);
  await adbHelper.tapXY(device_id, ...coordinates['Target-Image-1']);
  await delay(800);

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

const scanQRSHB = async ({ device_id, bank }) => {
  const coordinates = await loadCoordinates('shb', device_id);

  await adbHelper.tapXY(device_id, ...coordinates['ScanQR']);
  await delay(600);
  // await adbHelper.tapXY(device_id, ...coordinates['Image']);
  // await delay(900);
  // await adbHelper.tapXY(device_id, ...coordinates['Target-Img']);  
  await submitUploadQRSHB1({ device_id, bank }, 0);
  await submitUploadQRSHB2({ device_id, bank }, 0);
  await submitUploadQRSHB3({ device_id, bank }, 0);

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
  const coordinatesScanQRABB = await loadCoordinatesScanQRABB(device_id);

  await adbHelper.tapXY(device_id, ...coordinatesScanQRABB['ScanQR']);
  await delay(600);
  await adbHelper.tapXY(device_id, ...coordinatesScanQRABB['Image']);
  await delay(1000);
  await adbHelper.tapXY(device_id, ...coordinatesScanQRABB['Target-Img']);

  return { status: 200, message: 'Success' };
};

const scanQRSTB = async ({ device_id }) => {
  const logDir = path.join('C:\\att_mobile_client\\logs\\');
  const coordinates = await loadCoordinates('stb', device_id);
  const coordinates2 = await loadCoordinates('nab', device_id);
  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);
  transId = info?.data?.trans_id;

  await adbHelper.tapXY(device_id, ...coordinates['ScanQR']);
  await delay(600);
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
    Logger.log(0, `Đang ở màn hình có "Báo cáo lỗi", "Bộ sưu tập", "File của bạn"`, __filename);
    useReportBug = true;
    Logger.log(0, `STB XML dump cho thấy đang ở TH1 (có tồn tại "Báo cáo lỗi")`, __filename);
  } else {
    Logger.log(0, `STB XML dump cho thấy đang ở TH2 (không có tồn tại "Báo cáo lỗi")`, __filename);
  }
  const galleryCoord = useReportBug ? coordinates2['Gallery2'] : coordinates2['Gallery1'];

  await adbHelper.tapXY(device_id, ...galleryCoord);
  await delay(800);
  await adbHelper.tapXY(device_id, ...coordinates2['Target-Img']);

  return { status: 200, message: 'QR đã được chọn' };
};

const scanQRMap = {
  bab: scanQRBAB,
  hdb: scanQRHDB,
  tpb: scanQRTPB,
  eib: scanQREIB,
  shb: scanQRSHB,
  ocb: scanQROCB,
  abb: scanQRABB,
  nab: scanQRNAB,
  mb: scanQRMB,
  stb: scanQRSTB,
};

const bankStartSuccessKeywords = {
  stb: ["Xin chào", "Truy cập nhanh"],
  bab: ["Quên mật khẩu", "Đăng nhập"],
  hdb: ["com.vnpay.hdbank:id/forget_pass"],
  tpb: ["Smart OTP", "Quét QR", "Mật khẩu"], // TPB 10.12.15 không cho dump xml nữa, dump phát là văng app luôn.
  eib: [""], // Màn hình đăng nhập (sau khi khởi động app) là rỗng
  shb: ["Nhập mật khẩu"],
  ocb: ["Tìm ATM và chi nhánh", "Tra cứu lãi suất", "Liên hệ hỗ trợ", "Đăng nhập"],
  nab: ["Tap &amp; Pay", "Soft OTP", "Happy Cashback", "Quét QR"],
  mb: ["Xin chào,", "Tài khoản khác", "Quên mật khẩu?", "Đăng nhập", "Xác thực D-OTP"],
  acb: ["aaaaaaaaaaaaaaaaaaaaa"], // chưa làm                
  vpb: ["Mật khẩu", "Đăng nhập", "Quên mật khẩu?"] // chưa ok
};

const bankLoginSuccessKeywords = {  
  stb: ["Xin chào", "Truy cập nhanh"],
  bab: ["Tài khoản thanh toán", "Số dư: ************ VND", "Trang chủ"],
  shb: ["Tài khoản trực tuyến", "Tài khoản", "Tiết kiệm", "Chuyển tiền", "Thanh toán"],
  ocb: ["Tài khoản của tôi", "Chuyển tiền", "Xem tất cả", "Thanh toán hóa đơn"],
  nab: ["ops.namabank.com.vn:id/title_trang_chu", "ops.namabank.com.vn:id/title_dich_vu", "ops.namabank.com.vn:id/titleQRCode", "ops.namabank.com.vn:id/title_thanh_vien", "ops.namabank.com.vn:id/title_tien_ich", "Quét QR", "Thẻ"],
  mb: ["Trang chủ", "Thẻ", "Chuyển tiền", "Tổng số dư VND&#10;*** *** VND"], // Chú ý đoạn này sau update app
  acb: ["Số dư khả dụng", "Dịch vụ ngân hàng", "Trang chủ", "Tài khoản"],
  hdb: ["com.vnpay.hdbank:id/tvTitle", "com.vnpay.hdbank:id/tvLoanAmount", "com.vnpay.hdbank:id/transfer_in", "com.vnpay.hdbank:id/transfer"],  
  eib: [""], // Màn hình sau login là rỗng                
  tpb: ["Trang Chủ", "Chợ tiện ích", "Quét mọi QR", "Dịch vụ NH", "Cá Nhân"], // TPB 10.12.15 không cho dump xml nữa, dump phát là văng app luôn.
  vpb: ["Tài khoản", "QR Code", "Chuyển tiền"] // chưa ok
};

const scanQRSuccessKeywords = {
  stb: ["Số tài khoản", "Tên người nhận", "Số tiền cần chuyển"],
  bab: ["Thông tin chuyển tiền", "Quý khách vui lòng nhập không dấu.Các ký tự đặc biệt được sử dụng là '.', ',', '-', '_' và '/'"],
  hdb: [''], // chua lam
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

    attempt++;
  }

  Logger.log(2, `${bank.toUpperCase()} khởi động app thất bại hoặc không xác định qua XML sau ${maxAttempts} lần thử`, __filename);
  return false;
}

async function checkHome({ device_id, bank }) {
  const logDir = path.join('C:\\att_mobile_client\\logs\\');
  const requiredKeywordsMap = {  
    stb: [
      'Tài khoản thanh toán',
      'Số dư: ************ VND',
      'Trang chủ'
    ],
    bab: [
      'Tài khoản thanh toán',
      'Số dư: ************ VND',
      'Trang chủ'
    ],  
    shb: [
      'Tài khoản trực tuyến',
      'Tài khoản',
      'Tiết kiệm',
      'Chuyển tiền',
      'Thanh toán'
    ],    
    ocb: [
      'Tài khoản của tôi',
      'Chuyển tiền',
      'Xem tất cả',
      'Thanh toán hóa đơn'
    ],
    nab: [
      'ops.namabank.com.vn:id/title_trang_chu',
      'ops.namabank.com.vn:id/title_dich_vu',
      'ops.namabank.com.vn:id/titleQRCode',
      'ops.namabank.com.vn:id/title_thanh_vien',
      'ops.namabank.com.vn:id/title_tien_ich',
      'Quét QR',
      'Thẻ'
    ],
    mb: [
      'Tổng số dư VND&#10;*** *** VND',
      'Chuyển tiền',      
      'Trang chủ',
      'Thẻ'
    ],
    acb: [
      'Số dư khả dụng',
      'Dịch vụ ngân hàng',      
      'Trang chủ',      
      'Tài khoản'      
    ],    
    eib: [
      ''
    ],
    hdb: [
      'com.vnpay.hdbank:id/tvTitle',
      'com.vnpay.hdbank:id/tvLoanAmount',
      'com.vnpay.hdbank:id/transfer_in',
      'com.vnpay.hdbank:id/transfer'
    ],
    // TPB 01/07/2025 không còn cho dump nữa
    tpb: [
      'Trang Chủ',
      'Chợ tiện ích',
      'Quét mọi QR',
      'Dịch vụ NH',
      'Cá Nhân',            
    ]
  };

  const keywords = requiredKeywordsMap[bank.toLowerCase()];
  if (!keywords) return false;

  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    Logger.log(2, `Không tìm thấy XML file cho ${bank.toUpperCase()}`, __filename);
    return false;
  }

  const latestFile = path.join(logDir, files[0].name);
  const content = fs.readFileSync(latestFile, 'utf-8');

  const allMatched = keywords.every(keyword => content.includes(keyword));  

  if (allMatched) {    
    Logger.log(0, `${bank.toUpperCase()} xác nhận đang ở màn hình HOME`, __filename);
    return true;
  } else {
    Logger.log(1, `${bank.toUpperCase()} chưa ở màn hình HOME`, __filename);
    return false;
  }
}

const submitLoginTPB = async ({ device_id, bank }, expectedLength, timer) => {
  const logDir = path.join('C:\\att_mobile_client\\logs\\');

  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await reset(timer, device_id, bank);
    return setTimeout(() => submitLoginTPB({ device_id, bank }, expectedLength, t), 500);
  }

  const latestFile = path.join(logDir, files[0].name);
  const content = fs.readFileSync(latestFile, 'utf-8');

  // Regex kiểm tra dãy dấu chấm (• hoặc ●) ứng với mật khẩu
  const regex = /text="([•●]{4,})" resource-id="com\.tpb\.mb\.gprsandroid:id\/etPassword"/;
  const match = content.match(regex);

  console.log('🟡 match:', match);

  const isCompleted = match?.[1]?.length === expectedLength;

  if (match && match[1]) {
    console.log(`🟡 match[1].length: ${match[1].length}`);
    const unicodeChars = match[1].split('').map(c => c.charCodeAt(0).toString(16));
    console.log('🟡 Unicode các ký tự:', unicodeChars); // Debug xem là U+2022 hay U+25CF
  }

  console.log('log isCompleted:', isCompleted);

  // Nếu đủ ký tự → tap "Đăng nhập"
  if (isCompleted) {
    console.log('Đã nhập đủ mật khẩu, tiến hành tap Đăng nhập...');
    // await client.shell(device_id, 'input tap 750 1010');
    await client.shell(device_id, 'input tap 750 999');
  } else {
    const t = await reset(timer, device_id, bank);
    setTimeout(() => submitLoginTPB({ device_id, bank }, expectedLength, t), 500);
  }
};

const submitLoginBAB = async ({ device_id, bank }, expectedLength, timer) => {
  const logDir = path.join('C:\\att_mobile_client\\logs\\');

  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await reset(timer, device_id, bank);
    return setTimeout(() => submitLoginBAB({ device_id, bank }, expectedLength, t), 500);
  }

  const latestFile = path.join(logDir, files[0].name);
  const content = fs.readFileSync(latestFile, 'utf-8');

  // Regex chính xác như yêu cầu: text="****" resource-id="" class="android.widget.EditText"
  const regex = /text="(\*+)"\s+resource-id=""\s+class="android\.widget\.EditText"/;
  const match = content.match(regex);

  console.log('🟡 match:', match);

  const isCompleted = match?.[1]?.length === expectedLength;

  if (match && match[1]) {
    console.log(`🟡 match[1].length: ${match[1].length}`);
  }

  console.log('log isCompleted:', isCompleted);

  if (isCompleted) {
    console.log('Mật khẩu đủ, tiến hành tap "Đăng nhập"...');
    await client.shell(device_id, 'input tap 326 1055');
  } else {
    const t = await reset(timer, device_id, bank);
    setTimeout(() => submitLoginBAB({ device_id, bank }, expectedLength, t), 500);
  }
};

const submitLoginHDB = async ({ device_id, bank }, expectedLength, timer) => {
  const logDir = path.join('C:\\att_mobile_client\\logs\\');

  // Đợi hệ thống render thông báo lỗi (nếu có)
  await delay(200);

  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await reset(timer, device_id, bank);
    return setTimeout(() => submitLoginHDB({ device_id, bank }, expectedLength, t), 500);
  }

  const latestFile = path.join(logDir, files[0].name);
  const content = fs.readFileSync(latestFile, 'utf-8');

  const msg1 = 'Quý khách đã nhập sai thông tin đăng nhập 1 lần';
  const msg2 = 'Quý khách đã nhập sai thông tin đăng nhập 2 lần';

  const hasError1 = content.includes(msg1);
  const hasError2 = content.includes(msg2);

  console.log('🟥 hasError1:', hasError1);
  console.log('🟥 hasError2:', hasError2);

  if (!hasError1 && !hasError2) {
    await delay(1000);
    console.log('✅ Không phát hiện lỗi đăng nhập HDB → submit login');
    await client.shell(device_id, 'input keyevent 66');
    await client.shell(device_id, 'input keyevent 66');
  } else {
    console.log('⚠️ Phát hiện cảnh báo sai mật khẩu HDB → không submit.');
    const t = await reset(timer, device_id, bank);
    setTimeout(() => submitLoginHDB({ device_id, bank }, expectedLength, t), 500);
  }
};

const submitLoginSHB = async ({ device_id, bank }, expectedLength, timer) => {
  const logDir = path.join('C:\\att_mobile_client\\logs\\');

  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await reset(timer, device_id, bank);
    return setTimeout(() => submitLoginSHB({ device_id, bank }, expectedLength, t), 500);
  }

  const latestFile = path.join(logDir, files[0].name);
  const content = fs.readFileSync(latestFile, 'utf-8');

  // Regex kiểm tra dãy dấu chấm (• hoặc ●) ứng với mật khẩu
  const regex = /text="([•●]{4,})" resource-id="vn\.shb\.saha\.mbanking:id\/edtPwd"/;
  const match = content.match(regex);

  console.log('🟡 match:', match);

  const isCompleted = match?.[1]?.length === expectedLength;

  if (match && match[1]) {
    console.log(`🟡 match[1].length: ${match[1].length}`);
    const unicodeChars = match[1].split('').map(c => c.charCodeAt(0).toString(16));
    console.log('🟡 Unicode các ký tự:', unicodeChars); // Debug xem là U+2022 hay U+25CF
  }

  console.log('log isCompleted:', isCompleted);

  // Nếu đủ ký tự → tap "Đăng nhập"
  if (isCompleted) {
    console.log('Đã nhập đủ mật khẩu, tiến hành tap Đăng nhập...');    
    await client.shell(device_id, 'input tap 540 1220');
  } else {
    const t = await reset(timer, device_id, bank);
    setTimeout(() => submitLoginSHB({ device_id, bank }, expectedLength, t), 500);
  }
};

const submitLoginOCB = async ({ device_id, bank, password }, timer) => {
  const logDir = path.join('C:\\att_mobile_client\\logs\\');
  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);

  bank = info?.data?.bank;
  password = getBankPass(bank, device_id);  

  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await reset(timer, device_id, bank);
    return setTimeout(() => submitLoginOCB({ device_id, bank, password }, t), 500);
  }

  const latestFile = path.join(logDir, files[0].name);
  const content = fs.readFileSync(latestFile, 'utf-8');

  const hasUnlockPrompt = content.includes('Nhập mã mở khóa');

  console.log('Check màn hình "Nhập mã mở khóa"?', hasUnlockPrompt);

  if (hasUnlockPrompt) {
    console.log('Đã tới màn hình nhập mã PIN OCB → nhập mã PIN...');
    await client.shell(device_id, `input text ${password}`);
  } else {
    const t = await reset(timer, device_id, bank);
    setTimeout(() => submitLoginOCB({ device_id, bank, password }, t), 500);
  }
};

const submitLoginNAB = async ({ device_id, bank }, expectedLength, timer) => {
  const logDir = path.join('C:\\att_mobile_client\\logs\\');

  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await reset(timer, device_id, bank);
    return setTimeout(() => submitLoginNAB({ device_id, bank }, expectedLength, t), 500);
  }

  const latestFile = path.join(logDir, files[0].name);
  const content = fs.readFileSync(latestFile, 'utf-8');

  // Regex kiểm tra dãy dấu chấm (• hoặc ●) ứng với mật khẩu
  const regex = /text="([•●]{4,})" resource-id="ops\.namabank\.com\.vn:id\/etPassword"/;
  const match = content.match(regex);

  console.log('🟡 match:', match);

  const isCompleted = match?.[1]?.length === expectedLength;

  if (match && match[1]) {
    console.log(`🟡 match[1].length: ${match[1].length}`);
    const unicodeChars = match[1].split('').map(c => c.charCodeAt(0).toString(16));
    console.log('🟡 Unicode các ký tự:', unicodeChars); // Debug xem là U+2022 hay U+25CF
  }

  console.log('log isCompleted:', isCompleted);

  // Nếu đủ ký tự → tap "Đăng nhập"
  if (isCompleted) {
    console.log('Đã nhập đủ mật khẩu, tiến hành tap Đăng nhập...');    
    await client.shell(device_id, 'input tap 540 1186');
  } else {
    const t = await reset(timer, device_id, bank);
    setTimeout(() => submitLoginNAB({ device_id, bank }, expectedLength, t), 500);
  }
};

const submitLoginMB = async ({ device_id, bank }, expectedLength, timer) => {
  const logDir = path.join('C:\\att_mobile_client\\logs\\');

  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await reset(timer, device_id, bank);
    return setTimeout(() => submitLoginMB({ device_id, bank }, expectedLength, t), 500);
  }

  const latestFile = path.join(logDir, files[0].name);
  const content = fs.readFileSync(latestFile, 'utf-8');

  // Regex mới: tìm node có text chứa 4+ ký tự ● hoặc • và class EditText
  const regex = /<node[^>]*text="([•●]{4,})"[^>]*class="android\.widget\.EditText"[^>]*>/;
  const match = content.match(regex);

  console.log('🟡 match:', match);

  const isCompleted = match?.[1]?.length === expectedLength;  

  if (match && match[1]) {
    console.log(`🟡 match[1].length: ${match[1].length}`);
    const unicodeChars = match[1].split('').map(c => c.charCodeAt(0).toString(16));
    console.log('🟡 Unicode các ký tự:', unicodeChars); // Debug xem là U+2022 hay U+25CF
  }

  console.log('log isCompleted:', isCompleted);

  // Nếu đủ ký tự → tap "Đăng nhập"
  if (isCompleted) {
    console.log('Đã nhập đủ mật khẩu, tiến hành tap Đăng nhập...');    
    await client.shell(device_id, 'input keyevent 66');
    await client.shell(device_id, 'input keyevent 66');
  } else {
    const t = await reset(timer, device_id, bank);
    setTimeout(() => submitLoginMB({ device_id, bank }, expectedLength, t), 500);
  }
};

const submitLoginSTB1 = async ({ device_id, bank }, password, timer) => {
  const logDir = path.join('C:\\att_mobile_client\\logs\\');

  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await reset(timer, device_id, bank);
    return setTimeout(() => submitLoginSTB1({ device_id, bank }, password, t), 500);
  }

  const latestFile = path.join(logDir, files[0].name);
  const content = fs.readFileSync(latestFile, 'utf-8');

  const hasTransfer = content.includes('text="Chuyển tiền"');
  const hasQuickAccess = content.includes('text="Truy cập nhanh"');

  console.log(`🟡 hasTransfer: ${hasTransfer}, hasQuickAccess: ${hasQuickAccess}`);

  if (hasTransfer && hasQuickAccess) {
    console.log('Đã thấy Chuyển tiền và Truy cập nhanh → nhập mật khẩu');
    await client.shell(device_id, 'input tap 970 150');
  } else {
    const t = await reset(timer, device_id, bank);
    setTimeout(() => submitLoginSTB1({ device_id, bank }, password, t), 500);
  }
};

const submitLoginSTB2 = async ({ device_id, bank }, password, timer) => {
  const logDir = path.join('C:\\att_mobile_client\\logs\\');

  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await reset(timer, device_id, bank);
    return setTimeout(() => submitLoginSTB2({ device_id, bank }, password, t), 500);
  }

  const latestFile = path.join(logDir, files[0].name);
  const content = fs.readFileSync(latestFile, 'utf-8');

  const hasManageAcc = content.includes('text="Quản lý tài khoản"');
  const hasLanguage = content.includes('text="Ngôn ngữ"');
  const hasLogin = content.includes('text="Đăng nhập"');

  console.log(`🟡 hasManageAcc: ${hasManageAcc}, hasLanguage: ${hasLanguage}, hasLogin: ${hasLogin}`);

  if (hasManageAcc && hasLanguage && hasLogin) {
    console.log('Đã thấy khu vực đăng nhập → Click Đăng nhập');
    await client.shell(device_id, 'input tap 540 1815');
  } else {
    const t = await reset(timer, device_id, bank);
    setTimeout(() => submitLoginSTB2({ device_id, bank }, password, t), 500);
  }
};

const submitLoginSTB3 = async ({ device_id, bank }, password, timer) => {
  const logDir = path.join('C:\\att_mobile_client\\logs\\');
  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);

  // bank = info?.data?.bank;
  bank = info?.data?.bank_temp || info?.data?.bank;
  password = getBankPass(bank, device_id);
  const escapedPassword = escapeAdbText(password);

  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await reset(timer, device_id, bank);
    return setTimeout(() => submitLoginSTB3({ device_id, bank }, password, t), 500);
  }

  const latestFile = path.join(logDir, files[0].name);
  const content = fs.readFileSync(latestFile, 'utf-8');
  
  const forgetPass = content.includes('resource-id="com.sacombank.ewallet:id/btn_forget_password"');

  console.log(`🟡 forgetPass: ${forgetPass}`);

  if (forgetPass) {
    console.log('Đã thấy khu vực nhập mật khẩu → Nhập mật khẩu');
    await client.shell(device_id, `input text ${escapedPassword}`);
  } else {
    const t = await reset(timer, device_id, bank);
    setTimeout(() => submitLoginSTB3({ device_id, bank }, password, t), 500);
  }
};

const submitLoginSTB4 = async ({ device_id, bank }, expectedLength, timer) => {
  const logDir = path.join('C:\\att_mobile_client\\logs\\');

  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await reset(timer, device_id, bank);
    return setTimeout(() => submitLoginSTB4({ device_id, bank }, expectedLength, t), 500);
  }

  const latestFile = path.join(logDir, files[0].name);
  const content = fs.readFileSync(latestFile, 'utf-8');

  // Regex bắt chính xác đoạn text + resource-id
  const regex = /text="([^"]+)"\s+resource-id="com\.sacombank\.ewallet:id\/pinview_bottom_mpass"/;
  const match = content.match(regex);

  console.log('🟡 match:', match);

  const isCompleted = match?.[1]?.length === expectedLength;

  if (match && match[1]) {
    console.log(`🟢 Mật khẩu hiện tại: "${match[1]}" | Độ dài: ${match[1].length} | Mong đợi: ${expectedLength}`);
  }

  if (isCompleted) {
    console.log('Đủ mật khẩu → Tap Đăng nhập');
    await client.shell(device_id, 'input tap 540 910');
  } else {
    const t = await reset(timer, device_id, bank);
    setTimeout(() => submitLoginSTB4({ device_id, bank }, expectedLength, t), 500);
  }
};

const submitUploadQRSHB1 = async ({ device_id, bank }, timer) => {
  const logDir = path.join('C:\\att_mobile_client\\logs\\');

  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await reset(timer, device_id, bank);
    return setTimeout(() => submitUploadQRSHB1({ device_id, bank }, t), 500);
  }

  const latestFile = path.join(logDir, files[0].name);
  const content = fs.readFileSync(latestFile, 'utf-8');

  const moveCamera = content.includes('text="Di chuyển Camera vào mã QR"');
  const uploadQR = content.includes('text="Tải QR lên"');

  console.log(`🟡 moveCamera: ${moveCamera}, uploadQR: ${uploadQR}`);

  if (moveCamera && uploadQR) {
    console.log('Đã thấy màn hình Tải QR lên → Tải QR lên');
    await client.shell(device_id, 'input tap 540 1666');
    // "SM-N960": {
    //    "ScanQR": [540, 995],
    //     "Image": [540, 1666],    
    //     "Target-Img": [177, 730]        
    // }
  } else {
    const t = await reset(timer, device_id, bank);
    setTimeout(() => submitUploadQRSHB1({ device_id, bank }, t), 500);
  }
};

const submitUploadQRSHB2 = async ({ device_id, bank }, timer) => {
  const logDir = path.join('C:\\att_mobile_client\\logs\\');

  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await reset(timer, device_id, bank);
    return setTimeout(() => submitUploadQRSHB2({ device_id, bank }, t), 500);
  }

  const latestFile = path.join(logDir, files[0].name);
  const content = fs.readFileSync(latestFile, 'utf-8');

  const lastest = content.includes("Mới mẻ");
  const belowBounds = content.includes('bounds="[0,1175][1080,1322]"');
  const aboveBounds = content.includes('bounds="[0,400][1080,547]"');

  console.log(`🟡 lastest: ${lastest} có bounds: ${belowBounds}`);

  if (lastest && belowBounds) {
    console.log('Đã thấy màn hình latest phía dưới → Click Album (phía dưới)');
    await client.shell(device_id, 'input tap 655 1100');
    // "SM-N960": {
    //    "ScanQR": [540, 995],
    //     "Image": [540, 1666],    
    //     "Target-Img": [177, 730]        
    // }
  } else if (lastest && aboveBounds) {
    console.log('Đã thấy màn hình có bound latest phía trên → Click Album (phía trên)');
    await client.shell(device_id, 'input tap 655 326');
  }
  else {
    const t = await reset(timer, device_id, bank);
    setTimeout(() => submitUploadQRSHB2({ device_id, bank }, t), 500);
  }
};

const submitUploadQRSHB3 = async ({ device_id, bank }, timer) => {
  const logDir = path.join('C:\\att_mobile_client\\logs\\');

  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await reset(timer, device_id, bank);
    return setTimeout(() => submitUploadQRSHB3({ device_id, bank }, t), 500);
  }

  const latestFile = path.join(logDir, files[0].name);
  const content = fs.readFileSync(latestFile, 'utf-8');

  const album = content.includes("Album");
  const cam = content.includes("Máy ảnh"); //
  const belowBounds = content.includes('bounds="[42,1715][152,1768]"');
  const aboveBounds = content.includes('bounds="[42,940][152,993]"');

  console.log(`🟡 album: ${album}, cam: ${cam}, belowBounds: ${belowBounds}, aboveBounds: ${aboveBounds}`);

  if (album && cam && belowBounds) {
    console.log('Đã thấy màn hình có bounds cam phía dưới → Click Máy ảnh (phía dưới)');
    await client.shell(device_id, 'input tap 177 1400');
    await delay(300);
    await client.shell(device_id, 'input tap 177 1400');
  } else if (album && cam && aboveBounds) {
    console.log('Đã thấy màn hình có bounds cam phía dưới → Click Máy ảnh (phía trên)');
    await client.shell(device_id, 'input tap 177 633');
    await delay(300);
    await client.shell(device_id, 'input tap 177 633');
  } else {
    const t = await reset(timer, device_id, bank);
    setTimeout(() => submitUploadQRSHB3({ device_id, bank }, t), 500);
  }
};

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

const runBankTransfer = async ({ device_id, bank, controller }) => {  
  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const json = JSON.parse(raw);
  const type = json?.type;
  bank = json?.data?.bank;
  transId = json?.data?.trans_id; 
  const stopApp = mapStopBank[bank.toLowerCase()];
  const startApp = mapStartBank[bank.toLowerCase()];
  const loginApp = mapLoginBank[bank.toLowerCase()];
  const logDir = path.join('C:\\att_mobile_client\\logs\\');

  // Dọn sạch logs cũ
  fs.readdirSync(logDir)
    .filter(file => file.endsWith('.xml'))
    .forEach(file => fs.unlinkSync(path.join(logDir, file)));
  
  if (!startApp || !loginApp) {
    return { status: 400, valid: false, message: 'Không hỗ trợ ngân hàng này' };
  }

  Logger.log(0, `1. Stop ${bank.toUpperCase()}`, __filename);
  await stopApp({ device_id });
  await forceKillApp({ device_id, packageName: bank });

  console.log('log controller?.cancelled:', controller?.cancelled);
  if (controller?.cancelled) {
    Logger.log(1, `Dừng sau stopApp`, __filename);
    throw new Error('Dừng sau stopApp');
  }

  Logger.log(0, `2. Start ${bank.toUpperCase()}`, __filename);
  await startApp({ device_id });
  await delay(waitStartApp[bank.toLowerCase()]);

  if (controller?.cancelled) {
    Logger.log(1, `Dừng sau startApp`, __filename);
    throw new Error('Dừng sau startApp');
  }

  let startAppDetected = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (controller?.cancelled) {
      Logger.log(1, `Dừng khi đang kiểm tra startApp (lần ${attempt + 1})`, __filename);
      throw new Error('Dừng khi đang kiểm tra startApp');
    }

    startAppDetected = await checkStartApp({ device_id, bank });
    if (startAppDetected) break;

    Logger.log(1, `Retry xác định màn hình startApp lần ${attempt + 1}`, __filename);
    await delay(5000);
  }

  if (!startAppDetected) {
    return { status: 400, valid: false, message: 'Không xác định được màn hình khi khởi động thành công' };
  }

  Logger.log(0, `3. Login ${bank.toUpperCase()}`, __filename);
  await loginApp({ device_id });

  if (controller?.cancelled) {
    Logger.log(1, `Dừng sau loginApp`, __filename);
    throw new Error('Dừng sau loginApp');
  }

  await delay(waitLoginApp[bank.toLowerCase()]);

  let loginDetected = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (controller?.cancelled) {
      Logger.log(1, `Dừng khi đang kiểm tra login (lần ${attempt + 1})`, __filename);
      throw new Error('Dừng khi đang kiểm tra login');
    }

    loginDetected = await checkLogin({ device_id, bank });
    if (loginDetected) break;

    Logger.log(1, `Retry xác định màn hình loginApp lần ${attempt + 1}`, __filename);
    await delay(5000);
  }

  if (!loginDetected) {
    return { status: 400, valid: false, message: 'Không xác định được màn hình login thành công' };
  }

  return { status: 200, valid: true, message: 'Đăng nhập thành công' };
};

const bankTransfer = async ({ device_id, bank, controller }) => {
  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const json = JSON.parse(raw);
  const type = json?.type;
  bank = json?.data?.bank;
  transId = json?.data?.trans_id;  
  
  if (type !== 'att' || !device_id || !bank) {    
    notifier.emit('multiple-banks-detected', {
      device_id,
      message: `Thiếu thông tin hoặc sai kiểu kết nối`
    });
    return;
  }  

  const scanQRApp = scanQRMap[bank.toLowerCase()];

  console.log('log scanQRApp:', scanQRApp);
  if (!scanQRApp) return;

  let retries = 0;  

  while (retries < 30) {
    if (controller.cancelled) throw new Error('Dừng theo yêu cầu người dùng');

    const transStatus = await checkTransactions({ device_id });
    if (controller.cancelled) throw new Error('Dừng sau checkTransactions');

    const started = await isBankAppRunning({ bank, device_id });
    if (controller.cancelled) throw new Error('Dừng sau isBankAppRunning');

    if (transStatus === 'in_process' && started && await checkHome({ device_id, bank })) {
      Logger.log(0, `TH1 - Đã login app + có đơn -> ScanQR`, __filename);
      await scanQRApp({ device_id });
      return;
    }

    if (transStatus !== 'in_process' && started && await checkHome({ device_id, bank })) {
      Logger.log(0, `TH2 - Đã login app + chưa có đơn -> retry...`, __filename);
    }

    if (transStatus === 'in_process' && !started) {
      Logger.log(0, `TH3 - Có đơn + chưa login app → reset`, __filename);
      
      await runBankTransfer({ device_id, bank, controller });
      await delay(waitStartApp[bank.toLowerCase()]);
      if (controller.cancelled) throw new Error('Dừng sau login');

      await scanQRApp({ device_id, transId });
      const scanned = await checkScanQR({ device_id, bank, transId });
      if (scanned) return;
    }

    if (transStatus !== 'in_process' && !started) {
      Logger.log(0, `TH4 - Chưa login app + chưa có đơn → reset`, __filename);
      await runBankTransfer({ device_id, bank, controller });
      await delay(waitStartApp[bank.toLowerCase()]);
    }

    await delay(1000);
    retries = await reset(retries, device_id, bank);
  }

  return { status: 200, valid: true, message: 'Hết retry, đã reset lại app và chờ đơn mới' };
};

const startTransfer = async ({ device_id }) => {
  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const json = JSON.parse(raw);
  const type = json?.type;
  const bank = json?.data?.bank;

  console.log('[TRANSFER] Gọi bankTransfer với:', { device_id, bank });

  if (type !== 'att' || !device_id || !bank) {
    return { status: 400, valid: false, message: 'Thiếu device_id hoặc bank' };
  }

  transferTaskManager.start(device_id, async (controller) => {
    await bankTransfer({ device_id, bank, controller });    
  });  

  return { status: 200, valid: true, message: 'Đã bắt đầu bankTransfer' };
};

const stopTransfer = async ({ device_id }) => {
  if (!device_id) {
    return { valid: false, message: 'Thiếu device_id' };
  }

  transferTaskManager.stop(device_id);
  return { valid: true, message: 'Đã yêu cầu dừng bankTransfer' };
};

module.exports = {
  bankTransfer,
  runBankTransfer,
  startNCB,
  startHDB,
  startVIETBANK,
  startEIB,
  startTransfer,
  stopTransfer,
  checkHome
};