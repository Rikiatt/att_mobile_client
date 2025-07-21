require('dotenv').config();
const adb = require('adbkit');
const xml2js = require('xml2js');
const fs = require('fs');
const path = require('path');
const { delay } = require('../helpers/functionHelper');
const adbPath = path.join(__dirname, '../platform-tools', 'adb.exe');
const client = adb.createClient({ bin: adbPath });
const { Logger } = require("../config/require.config");
const coordinatesLoginABB = require('../config/coordinatesLoginABB.json');
const adbHelper = require('../helpers/adbHelper');
const deviceHelper = require('../helpers/deviceHelper');
const notifier = require('../events/notifier');
const { escapeAdbText } = require('../helpers/adbHelper');
const transferTaskManager = require('../helpers/transferTaskManager');
const { isBankAppRunning } = require('../functions/bankStatus.function');
const coordinatesScanQRBIDV = require('../config/coordinatesScanQRBIDV.json');
const coordinatesLoginSHBVN = require('../config/coordinatesLoginSHBVN.json');
const coordinatesLoginICB = require('../config/coordinatesLoginICB.json');
const coordinatesScanQRICB = require('../config/coordinatesScanQRICB.json');
const logDir = path.join('C:\\att_mobile_client\\logs\\');
// const { trackSHBVNUI } = require('../functions/bankStatus.function');
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

async function clearTempFile({ device_id }) {
  try {
    await client.shell(device_id, `rm /sdcard/temp_dump.xml`);
    await delay(1000);
  } catch (error) {
    console.error("Cannot delete file temp_dump.xml:", error.message);
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
    } catch (_) { // ignore spam log
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

async function isSHBVNRunning({ device_id }) {
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const packageName = 'com.shinhan.global.vn.bank';

    // 1. Kiểm tra foreground (mResumedActivity)
    const isForeground = output.includes('mResumedActivity') && output.includes(packageName);
    if (isForeground) return true;

    // 2. Kiểm tra background (TaskRecord hoặc ActivityRecord)
    const escapedPackage = packageName.replace(/\./g, '\\.');
    const isInTaskList =
      new RegExp(`ActivityRecord\\{.*${escapedPackage}`).test(output) ||
      new RegExp(`TaskRecord\\{.*${escapedPackage}`).test(output);
    if (isInTaskList) return true;

    // 3. Không chạy
    return false;

  } catch (error) {
    console.error("Error checking SHBVN app status via activity stack:", error.message);
    return false;
  }
}

// Chỉ dùng cho loginSHBVN trên giao diện khi mà check "site" trong C:\att_mobile_client\database\localdata.json mà != "shbet" hoặc != "new88" hoặc != "jun88k36" hoặc != "jun88cmd" hoặc trong info-qr.json chỉ có {} 
async function trackSHBVNUI({ device_id }) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  Logger.log(0, 'Đang dump SHBVN để sử dụng login SHBVN...', __filename);

  let running = await isSHBVNRunning({ device_id });

  await clearTempFile({ device_id });
  
  while (running) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const localPath = path.join(targetDir, `${timestamp}.xml`);

    await dumpXmlToLocal(device_id, localPath);    
  }
}

const allCoordinates = {
  stb: require('../config/coordinatesScanQRSTB.json'),
  bab: require('../config/coordinatesScanQRBAB.json'),
  hdb: require('../config/coordinatesScanQRHDB.json'),
  tpb: require('../config/coordinatesScanQRTPB.json'),
  eib: require('../config/coordinatesScanQREIB.json'),
  // shb: require('../config/coordinatesScanQRSHB.json'),
  ocb: require('../config/coordinatesScanQROCB.json'),
  nab: require('../config/coordinatesScanQRNAB.json'),
  mb: require('../config/coordinatesScanQRMB.json'),
  acb: require('../config/coordinatesScanQRACB.json'),
  vpb: require('../config/coordinatesScanQRVPB.json')
};

const isSpecialChar = (char) => {
  return ['@', '#', '$', '%', '&', '*', '-', '+', '(', ')',
    '~', '^', '<', '>', '|', '\\', '{', '}', '[', ']',
    '=', '!', '"', "'", ':', ';', '/', '?'].includes(char);
};

const isUpperCase = (char) => {
  return char === char.toUpperCase() && char !== char.toLowerCase();
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
};

async function loadCoordinatesLoginABB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);

    const deviceCoordinates = coordinatesLoginABB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Got an error: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesLoginICB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);

    const deviceCoordinates = coordinatesLoginICB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesLoginICB for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesScanQRBIDV(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);

    const deviceCoordinates = coordinatesScanQRBIDV[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRBIDV for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesScanQRICB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);

    const deviceCoordinates = coordinatesScanQRICB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRICB for device: ${error.message}`);
    throw error;
  }
};

const keyLoginMap = {
  btn_login: 'LOGIN'
};

const keyPasswordFieldMap = {
  tv_user_pw: 'FIELD_PASSWORD'
};

const keyMap = {
  nf_key_1: '1', nf_key_2: '2', nf_key_3: '3', nf_key_4: '4', nf_key_5: '5',
  nf_key_6: '6', nf_key_7: '7', nf_key_8: '8', nf_key_9: '9', nf_key_10: '0',

  nf_key_11: 'q', nf_key_12: 'w', nf_key_13: 'e', nf_key_14: 'r', nf_key_15: 't',
  nf_key_16: 'y', nf_key_17: 'u', nf_key_18: 'i', nf_key_19: 'o', nf_key_20: 'p',

  nf_key_21: 'a', nf_key_22: 's', nf_key_23: 'd', nf_key_24: 'f', nf_key_25: 'g',
  nf_key_26: 'h', nf_key_27: 'j', nf_key_28: 'k', nf_key_29: 'l',

  nf_key_30: 'z', nf_key_31: 'x', nf_key_32: 'c', nf_key_33: 'v',
  nf_key_34: 'b', nf_key_35: 'n', nf_key_36: 'm',

  nf_fun_key_shift: 'Shift',
  nf_fun_key_delete: 'BackSpace',
  nf_fun_bottom_key_done: 'Enter'
};

const specialCharMap = {
  '!': '1', '@': '2', '#': '3', '$': '4', '%': '5',
  '^': '6', '&': '7', '*': '8', '(': '9', ')': '0'
};

const upperCaseCharMap = {
  'A': 'a', 'B': 'b', 'C': 'c', 'D': 'd', 'E': 'e',
  'F': 'f', 'G': 'g', 'H': 'h', 'I': 'i', 'J': 'j',
  'K': 'k', 'L': 'l', 'M': 'm', 'N': 'n', 'O': 'o',
  'P': 'p', 'Q': 'q', 'R': 'r', 'S': 's', 'T': 't',
  'U': 'u', 'V': 'v', 'W': 'w', 'X': 'x', 'Y': 'y',
  'Z': 'z',
};

function getCenter(boundsStr) {
  const match = boundsStr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return null;
  const [_, x1, y1, x2, y2] = match.map(Number);
  const cx = Math.round((x1 + x2) / 2);
  const cy = Math.round((y1 + y2) / 2);
  return [cx, cy];
}

// Sau khi khởi động xong app Shinhanbank
async function loadCoordinatesBeforePasswordFieldSHBVN(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);
    const existingCoords = coordinatesLoginSHBVN[deviceModel] || {};

    const files = fs.readdirSync(logDir)
      .filter(f => f.endsWith('.xml'))
      .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    if (files.length === 0) {
      console.warn('⚠️ Không tìm thấy file XML nào trong thư mục logs.');
      return existingCoords;
    }

    const latestXMLPath = path.join(logDir, files[0].name);
    const xmlContent = fs.readFileSync(latestXMLPath, 'utf-8');

    if (!xmlContent.trim() || !xmlContent.includes('<hierarchy')) {
      console.warn(`⚠️ File XML ${latestXMLPath} bị rỗng hoặc không hợp lệ, bỏ qua.`);
      return existingCoords;
    }

    const result = await xml2js.parseStringPromise(xmlContent, { explicitArray: false });
    const hierarchy = result?.hierarchy;
    if (!hierarchy) {
      console.warn('⚠️ XML không chứa root <hierarchy>.');
      return existingCoords;
    }

    const flatNodes = [];
    function flatten(node) {
      if (!node || typeof node !== 'object') return;
      if (node['$'] && node['$']['resource-id']) flatNodes.push(node);
      if (node.node) {
        if (Array.isArray(node.node)) node.node.forEach(flatten);
        else flatten(node.node);
      }
    }

    flatten(hierarchy);

    const updatedCoordinates = {};
    for (const node of flatNodes) {
      const resId = node?.['$']?.['resource-id'];
      if (!resId) continue;
      const id = resId.split('/').pop();
      const key = keyLoginMap[id];
      if (key) {
        const bounds = node?.['$']?.bounds;
        const center = getCenter(bounds);
        if (center) updatedCoordinates[key] = center;
      }
    }

    const requiredKeys = Object.keys(existingCoords);
    const hasAllRequiredKeys = requiredKeys.every(k => updatedCoordinates[k] || existingCoords[k]);

    if (!hasAllRequiredKeys) {
      console.warn('⚠️ Không đủ key mặc định, không cập nhật gì.');
      return existingCoords;
    }

    let hasChange = false;
    const finalCoords = { ...existingCoords };

    for (const key of Object.keys(updatedCoordinates)) {
      const oldVal = existingCoords[key];
      const newVal = updatedCoordinates[key];
      if (!oldVal || oldVal[0] !== newVal[0] || oldVal[1] !== newVal[1]) {
        finalCoords[key] = newVal;
        hasChange = true;
      }
    }

    if (hasChange) {
      coordinatesLoginSHBVN[deviceModel] = finalCoords;
      fs.writeFileSync('C:\\att_mobile_client\\config\\coordinatesLoginSHBVN.json', JSON.stringify(coordinatesLoginSHBVN, null, 2));
      console.log(`✅ Đã cập nhật tọa độ LOGIN cho thiết bị ${deviceModel}`);
    } else {
      console.log('Không có sự thay đổi tọa độ LOGIN, giữ nguyên.');
    }

    return finalCoords;
  } catch (error) {
    console.error('❌ Got an error in loadCoordinatesBeforePasswordFieldSHBVN:', error);
    return coordinatesLoginSHBVN[device_id] || {};
  }
}

async function loadCoordinatesPasswordFieldSHBVN(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);
    const existingCoords = coordinatesLoginSHBVN[deviceModel] || {};

    const files = fs.readdirSync(logDir)
      .filter(f => f.endsWith('.xml'))
      .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    if (files.length === 0) {
      console.warn('⚠️ Không tìm thấy file XML nào trong thư mục logs.');
      return existingCoords;
    }

    const latestXMLPath = path.join(logDir, files[0].name);
    const xmlContent = fs.readFileSync(latestXMLPath, 'utf-8');

    if (!xmlContent.trim() || !xmlContent.includes('<hierarchy')) {
      console.warn(`⚠️ File XML ${latestXMLPath} bị rỗng hoặc không hợp lệ, bỏ qua.`);
      return existingCoords;
    }

    const result = await xml2js.parseStringPromise(xmlContent, { explicitArray: false });
    const hierarchy = result?.hierarchy;
    if (!hierarchy) {
      console.warn('⚠️ XML không chứa root <hierarchy>.');
      return existingCoords;
    }

    const flatNodes = [];
    function flatten(node) {
      if (!node || typeof node !== 'object') return;
      if (node['$'] && node['$']['resource-id']) flatNodes.push(node);
      if (node.node) {
        if (Array.isArray(node.node)) node.node.forEach(flatten);
        else flatten(node.node);
      }
    }

    flatten(hierarchy);

    const updatedCoordinates = {};
    for (const node of flatNodes) {
      const resId = node?.['$']?.['resource-id'];
      if (!resId) continue;
      const id = resId.split('/').pop();
      const key = keyPasswordFieldMap[id];
      if (key) {
        const bounds = node?.['$']?.bounds;
        const center = getCenter(bounds);
        if (center) updatedCoordinates[key] = center;
      }
    }

    const requiredKeys = Object.keys(existingCoords);
    const hasAllRequiredKeys = requiredKeys.every(k => updatedCoordinates[k] || existingCoords[k]);

    if (!hasAllRequiredKeys) {
      console.warn('⚠️ Không đủ key mặc định, không cập nhật gì.');
      return existingCoords;
    }

    let hasChange = false;
    const finalCoords = { ...existingCoords };

    for (const key of Object.keys(updatedCoordinates)) {
      const oldVal = existingCoords[key];
      const newVal = updatedCoordinates[key];
      if (!oldVal || oldVal[0] !== newVal[0] || oldVal[1] !== newVal[1]) {
        finalCoords[key] = newVal;
        hasChange = true;
      }
    }

    if (hasChange) {
      coordinatesLoginSHBVN[deviceModel] = finalCoords;
      fs.writeFileSync('C:\\att_mobile_client\\config\\coordinatesLoginSHBVN.json', JSON.stringify(coordinatesLoginSHBVN, null, 2));
      console.log(`✅ Đã cập nhật tọa độ FIELD_PASSWORD cho thiết bị ${deviceModel}`);
    } else {
      console.log('Không có sự thay đổi tọa độ FIELD_PASSWORD, giữ nguyên.');
    }

    return finalCoords;
  } catch (error) {
    console.error('❌ Got an error in loadCoordinatesPasswordFieldSHBVN:', error);
    return coordinatesLoginSHBVN[device_id] || {};
  }
}

async function loadCoordinatesLoginSHBVN({ device_id, text }) {
  try {
    if (!device_id) return;

    const deviceModel = await deviceHelper.getDeviceModel(device_id);
    const existingCoords = coordinatesLoginSHBVN[deviceModel] || {};

    const files = fs.readdirSync(logDir)
      .filter(f => f.endsWith('.xml'))
      .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    if (files.length === 0) {
      console.warn('⚠️ Không tìm thấy file XML nào trong thư mục logs.');
      return existingCoords;
    }

    const latestXMLPath = path.join(logDir, files[0].name);
    const xmlContent = fs.readFileSync(latestXMLPath, 'utf-8');

    // ✅ Bổ sung kiểm tra XML rỗng hoặc không chứa <hierarchy>
    if (!xmlContent.trim() || !xmlContent.includes('<hierarchy')) {
      console.warn(`⚠️ File XML ${latestXMLPath} bị rỗng hoặc không hợp lệ, bỏ qua.`);
      return existingCoords;
    }

    const result = await xml2js.parseStringPromise(xmlContent, { explicitArray: false });

    const allNodes = result?.hierarchy?.node;
    if (!allNodes) {
      console.warn('⚠️ XML không chứa node con trong <hierarchy>.');
      return existingCoords;
    }

    const flatNodes = [];
    function flatten(node) {
      if (!node) return;
      flatNodes.push(node);
      if (node.node) {
        if (Array.isArray(node.node)) node.node.forEach(flatten);
        else flatten(node.node);
      }
    }
    flatten(allNodes);

    const updatedCoordinates = {};
    const foundKeys = [];

    for (const node of flatNodes) {
      const resId = node?.['$']?.['resource-id'];
      if (!resId) continue;
      const id = resId.split('/').pop();
      const key = keyMap[id];
      if (key) {
        const bounds = node?.['$']?.bounds;
        const center = getCenter(bounds);
        if (center) {
          updatedCoordinates[key] = center;
          foundKeys.push(key);
        }
      }
    }

    // Bổ sung các ký tự in hoa và đặc biệt
    for (const [uc, lc] of Object.entries(upperCaseCharMap)) {
      if (updatedCoordinates[lc]) updatedCoordinates[uc] = updatedCoordinates[lc];
    }
    for (const [sc, base] of Object.entries(specialCharMap)) {
      if (updatedCoordinates[base]) updatedCoordinates[sc] = updatedCoordinates[base];
    }

    // So sánh để xác định thay đổi
    let hasChange = false;
    const finalCoords = { ...existingCoords };

    for (const key of Object.keys(updatedCoordinates)) {
      const oldVal = existingCoords[key];
      const newVal = updatedCoordinates[key];
      if (!oldVal || oldVal[0] !== newVal[0] || oldVal[1] !== newVal[1]) {
        finalCoords[key] = newVal;
        hasChange = true;
      }
    }

    const requiredKeys = Object.keys(existingCoords);
    const hasAllRequiredKeys = requiredKeys.every(k => finalCoords[k]);

    if (!hasAllRequiredKeys) {
      console.warn('⚠️ Không đủ key mặc định, không cập nhật gì.');
      return existingCoords;
    }

    if (hasChange) {
      coordinatesLoginSHBVN[deviceModel] = finalCoords;
      fs.writeFileSync('C:\\att_mobile_client\\config\\coordinatesLoginSHBVN.json', JSON.stringify(coordinatesLoginSHBVN, null, 2));
      console.log(`✅ Đã cập nhật tọa độ bàn phím cho thiết bị ${deviceModel}`);
    } else {
      console.log('Không có sự thay đổi tọa độ bàn phím, giữ nguyên.');
    }

    return finalCoords;
  } catch (error) {
    console.error('Got an error in loadCoordinatesLoginSHBVN:', error);
    return coordinatesLoginSHBVN[device_id] || {};
  }
}

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

const stopACB = async ({ device_id }) => {
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop mobile.acb.com.vn');
  Logger.log(2, `Đã dừng ACB`, __filename);
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

const stopBIDV = async ({ device_id }) => {
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop com.vnpay.bidv');
  Logger.log(2, `Đã dừng BIDV`, __filename);
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

const stopLPB = async ({ device_id }) => {
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop vn.com.lpb.lienviet24h');
  Logger.log(2, `Đã dừng LPB`, __filename);
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

const stopNCB = async ({ device_id }) => {
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop com.ncb.bank');
  Logger.log(2, `Đã dừng NCB`, __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
};

// TPB không dùng được này từ 1/7/2025. Chưa làm lại.
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

const stopMSB = async ({ device_id }) => {
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop vn.com.msb.smartBanking');
  Logger.log(2, `Đã dừng MSB`, __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
};

const stopPVCB = async ({ device_id }) => {
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop com.pvcombank.retail');
  Logger.log(2, `Đã dừng PVCB`, __filename);
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

const stopSEAB = async ({ device_id }) => {
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop vn.com.seabank.mb1');
  Logger.log(2, `Đã dừng SEAB`, __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
};

const stopSHBVN = async ({ device_id }) => {
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop com.shinhan.global.vn.bank');
  Logger.log(2, `Đã dừng SHBVN`, __filename);
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

const stopTCB = async ({ device_id }) => {
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop vn.com.techcombank.bb.app');
  Logger.log(2, `Đã dừng Sacombank`, __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
};

const stopVCB = async ({ device_id }) => {
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop com.VCB');
  Logger.log(2, `Đã dừng VCB`, __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
};

const stopVIB = async ({ device_id }) => {
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop com.vib.myvib2');
  Logger.log(2, `Đã dừng VIB`, __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
};

const stopVIETBANK = async ({ device_id }) => {
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop com.vnpay.vietbank');
  Logger.log(2, `Đã dừng VIB`, __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
};

const stopVIKKI = async ({ device_id }) => {
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop com.finx.vikki');
  Logger.log(2, `Đã dừng VIKKI`, __filename);
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

const startBIDV = async ({ device_id }) => {
  Logger.log(0, `Đang khởi động BIDV...`, __filename);
  await client.shell(device_id, 'monkey -p com.vnpay.bidv -c android.intent.category.LAUNCHER 1');
  await delay(500);
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

const startICB = async ({ device_id }) => {
  console.log('Đang khởi động app VietinBank iPay...');
  await client.shell(device_id, 'monkey -p com.vietinbank.ipay -c android.intent.category.LAUNCHER 1');
  await delay(500);
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

// TPB không dùng được này từ 1/7/2025. Chưa làm lại.
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

const startVIKKI = async ({ device_id }) => {
  Logger.log(0, `Đang khởi động VIKKI...`, __filename);
  await client.shell(device_id, 'monkey -p com.finx.vikki -c android.intent.category.LAUNCHER 1');
  await delay(500);
  return { status: 200, message: 'Success' };
};

const startSHB = async ({ device_id }) => {
  Logger.log(0, `Đang khởi động SHB SAHA...`, __filename);
  await client.shell(device_id, '');
  await delay(500);
  return { status: 200, message: 'Success' };
};

const startSHBVN = async ({ device_id }) => {
  Logger.log(0, `Đang khởi động Shinhanbank...`, __filename);
  await client.shell(device_id, 'monkey -p com.shinhan.global.vn.bank -c android.intent.category.LAUNCHER 1');
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
  abb: stopACB,
  bab: stopBAB,
  bidv: stopBIDV,
  eib: stopEIB,
  hdb: stopHDB,
  icb: stopICB,
  lpb: stopLPB,
  ocb: stopOCB,
  nab: stopNAB,
  ncb: stopNCB,
  tpb: stopTPB,
  vpb: stopVPB,
  mb: stopMB,
  msb: stopMSB,
  pvcb: stopPVCB,
  seab: stopSEAB,
  shb: stopSHB,
  shbvn: stopSHBVN,
  stb: stopSTB,
  tcb: stopTCB,
  vcb: stopVCB,
  vib: stopVIB,
  vietbank: stopVIETBANK,
  vikki: stopVIKKI
};

const mapStartBank = {
  abb: startABB,
  acb: startACB,
  bab: startBAB,
  bidv: startBIDV,
  eib: startEIB,
  hdb: startHDB,
  icb: startICB,
  ocb: startOCB,
  nab: startNAB,
  vpb: startVPB,
  mb: startMB,
  ncb: startNCB,
  shb: startSHB,
  shbvn: startSHBVN,
  stb: startSTB,
  tpb: startTPB,
  vikki: startVIKKI,
  vietbank: startVIETBANK
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

// chua lam
const loginABB = async ({ device_id }) => {
  Logger.log(0, `3. Login ABB...`, __filename);
  const coordinatesLoginABB = await loadCoordinatesLoginABB(device_id);
  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);

  const bank = info?.data?.bank?.toUpperCase(); // googlesheet viết hoa bank
  const password = getBankPass(bank, device_id);
  const escapedPassword = escapeAdbText(password);

  // nó có cái nhập mật khẩu bằng mã PIN hoặc chuỗi chua lam.
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

// TPB không dùng được này từ 1/7/2025. Chưa làm lại.
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
  await delay(300);
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

  await client.shell(device_id, 'input tap 540 655');
  await submitLoginNAB1({ device_id, bank }, 0);
  await submitLoginNAB2({ device_id, bank }, 0);
  // Đợi đến khi đủ ký tự dạng ● rồi mới tap "Đăng nhập"  
  await submitLoginNAB3({ device_id, bank }, password.length, 0);
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

  console.log('log password:', password);
  console.log('log escapedPassword:', escapedPassword);

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

  await client.shell(device_id, 'input tap 118 1040');
  await delay(500);
  await client.shell(device_id, `input text ${escapedPassword}`);

  // Đợi đến khi đủ ký tự dạng ● rồi mới tap "Đăng nhập"
  console.log('log password.length:', password.length);
  await submitLoginSHB({ device_id, bank }, password.length, 0);
};

const clickScanQRBIDV = async ({ device_id }) => {
  const coordinatesScanQRBIDV = await loadCoordinatesScanQRBIDV(device_id);
  await adbHelper.tapXY(device_id, ...coordinatesScanQRBIDV['ScanQR']);
  return { status: 200, message: 'Success' };
};

const copyQRImages = async ({ device_id }) => {
  try {
    // 1. Lấy danh sách ảnh .png trong thư mục Camera
    const lsOutput = await client.shell(device_id, `ls /sdcard/DCIM/Camera/`);
    const lsBuffer = await adb.util.readAll(lsOutput);
    const fileList = lsBuffer.toString().split('\n').map(f => f.trim()).filter(f => f.endsWith('.png'));

    if (!fileList.length) throw new Error('Không tìm thấy ảnh .png nào.');

    // 2. Lấy ảnh mới nhất theo tên (thường dạng timestamp)
    fileList.sort();
    const latestFile = fileList[fileList.length - 1];
    const sourcePath = `/sdcard/DCIM/Camera/${latestFile}`;
    const baseName = latestFile.replace(/\.png$/, '');
    const destinationDir = `/sdcard/DCIM/Camera/`;

    // 3. Tạo 2 bản copy
    for (let i = 1; i <= 2; i++) {
      const destinationPath = `${destinationDir}${baseName}_copy_${i}.png`;
      try {
        await client.shell(device_id, `cp "${sourcePath}" "${destinationPath}"`);
        console.log(`Copied to: ${destinationPath}`);

        // 4. Gửi broadcast để Gallery cập nhật ảnh
        await client.shell(
          device_id,
          `am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file://${destinationPath}`
        );
        console.log(`Broadcasted: ${destinationPath}`);
      } catch (err) {
        console.error(`Lỗi khi copy hoặc broadcast: ${destinationPath} - ${err.message}`);
      }
    }

    // 5. Gửi broadcast cho ảnh gốc (nếu cần)
    await client.shell(
      device_id,
      `am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file://${sourcePath}`
    );
    console.log(`Broadcasted gốc: ${sourcePath}`);

    return { status: 200, message: 'Copy + broadcast ảnh QR thành công' };

  } catch (error) {
    console.error("Got an error:", error.message);
    return { status: 500, message: 'Thất bại khi copy và broadcast ảnh QR' };
  }
};

const scanQRICB = async ({ device_id }) => {
  const coordinatesScanQRICB = await loadCoordinatesScanQRICB(device_id);
  const deviceModel = await deviceHelper.getDeviceModel(device_id);

  await adbHelper.tapXY(device_id, ...coordinatesScanQRICB['ScanQR']);
  await delay(600);
  await adbHelper.tapXY(device_id, ...coordinatesScanQRICB['Image']);
  await delay(800);
  if (deviceModel === 'SM-N960') {  // Nếu là S20 FE 5G thì chỉ cần Target-Img ở đây
    await adbHelper.tapXY(device_id, ...coordinatesScanQRICB['Target-Img']);
  }
  else if (deviceModel === 'ONEPLUS A5010' || deviceModel === 'ONEPLUS A5000') {
    await adbHelper.tapXY(device_id, ...coordinatesScanQRICB['Hamburger-Menu']);
    await delay(800);
    await adbHelper.tapXY(device_id, ...coordinatesScanQRICB['ONEPLUS A5010']); // = Galaxy Note9
    await delay(700);
    await client.shell(device_id, `input swipe 500 1800 500 300`);
    await delay(700);
    await adbHelper.tapXY(device_id, ...coordinatesScanQRICB['Target-Img']);
    await delay(700);
    await adbHelper.tapXY(device_id, ...coordinatesScanQRICB['Finish']);
  }
  else if (deviceModel === 'CPH2321') {
    await adbHelper.tapXY(device_id, ...coordinatesScanQRICB['Overflow-Menu']);
    await delay(700);
    await adbHelper.tapXY(device_id, ...coordinatesScanQRICB['Browse']);
    await delay(700);
    await adbHelper.tapXY(device_id, ...coordinatesScanQRICB['Hamburger-Menu']);
    await delay(700);
    await adbHelper.tapXY(device_id, ...coordinatesScanQRICB['OPPO-A55-5G']);
    await delay(700);
    await adbHelper.tapXY(device_id, ...coordinatesScanQRICB['DCIM']);
    await delay(700);
    await adbHelper.tapXY(device_id, ...coordinatesScanQRICB['Camera']);
    await delay(700);
    await adbHelper.tapXY(device_id, ...coordinatesScanQRICB['Target-Image']);
  }


  return { status: 200, message: 'Success' };
};

const clickSelectImageBIDV = async ({ device_id }) => {
  const coordinatesScanQRBIDV = await loadCoordinatesScanQRBIDV(device_id);
  await adbHelper.tapXY(device_id, ...coordinatesScanQRBIDV['Select-Image']);
  return { status: 200, message: 'Success' };
};

const clickLoginHDB = async ({ device_id }) => {
  const coordinatesLoginHDB = await loadCoordinatesLoginHDB(device_id);
  await adbHelper.tapXY(device_id, ...coordinatesLoginHDB['Click-Login']);
  return { status: 200, message: 'Success' };
};

const clickConfirmBIDV = async ({ device_id }) => {
  const coordinatesScanQRBIDV = await loadCoordinatesScanQRBIDV(device_id);
  await adbHelper.tapXY(device_id, ...coordinatesScanQRBIDV['Confirm']);
  return { status: 200, message: 'Success' };
};

const clickConfirmScanFaceBIDV = async ({ device_id }) => {
  const coordinatesScanQRBIDV = await loadCoordinatesScanQRBIDV(device_id);
  await adbHelper.tapXY(device_id, ...coordinatesScanQRBIDV['Confirm']);
  return { status: 200, message: 'Success' };
};

const clickConfirmICB = async ({ device_id }) => {
  const coordinatesScanQRICB = await loadCoordinatesScanQRICB(device_id);
  await adbHelper.tapXY(device_id, ...coordinatesScanQRICB['Confirm']);
  return { status: 200, message: 'Success' };
};

const clickConfirmOCB = async ({ device_id }) => {
  const coordinatesScanQROCB = await loadCoordinatesScanQROCB(device_id);
  await adbHelper.tapXY(device_id, ...coordinatesScanQROCB['Confirm']);
  return { status: 200, message: 'Success' };
};

const inputPINBIDV = async ({ device_id, text }) => {
  const coordinatesScanQRBIDV = await loadCoordinatesScanQRBIDV(device_id);

  for (const char of text) {
    await adbHelper.tapXY(device_id, ...coordinatesScanQRBIDV[char]);
    console.log('Log char of PIN:', char);
  }

  return { status: 200, message: 'Success' };
};

const inputPINICB = async ({ device_id, text }) => {
  const coordinatesScanQRICB = await loadCoordinatesScanQRICB(device_id);

  for (const char of text) {
    await adbHelper.tapXY(device_id, ...coordinatesScanQRICB[char]);
    console.log('Log char of PIN:', char);
  }

  return { status: 200, message: 'Success' };
};

const inputICB = async ({ device_id, text }) => {
  const coordinatesLoginICB = await loadCoordinatesLoginICB(device_id);

  for (const char of text) {
    console.log('log char in text:', char);
    if (isUpperCase(char)) {
      await adbHelper.tapXY(device_id, ...coordinatesLoginICB['CapsLock']);
      await delay(50);
      await adbHelper.tapXY(device_id, ...coordinatesLoginICB[char]);
      await delay(50);
    }
    else if (isSpecialChar(char)) {
      await adbHelper.tapXY(device_id, ...coordinatesLoginICB['!#1']);
      await delay(50);
      await adbHelper.tapXY(device_id, ...coordinatesLoginICB[char]);
      await delay(50);
      await adbHelper.tapXY(device_id, ...coordinatesLoginICB['ABC']);
    }
    else {
      await adbHelper.tapXY(device_id, ...coordinatesLoginICB[char.toLowerCase()]);
    }

    await delay(50);
  }
  return { status: 200, message: 'Success' };
};

const tapLoginButton = async (device_id) => {
  const coordinatesTap = await loadCoordinatesBeforePasswordFieldSHBVN(device_id);

  if (!coordinatesTap?.LOGIN) {
    return { status: 400, message: '❌ Không tìm thấy tọa độ LOGIN để tap' };
  }

  await adbHelper.tapXY(device_id, ...coordinatesTap.LOGIN);
  return { status: 200, message: '✅ Đã tap LOGIN thành công' };
};

const tapPasswordFiled = async (device_id) => {
  const coordsPassField = await loadCoordinatesPasswordFieldSHBVN(device_id);

  if (!coordsPassField?.LOGIN) {
    return { status: 400, message: '❌ Không tìm thấy tọa độ LOGIN để tap' };
  }

  await adbHelper.tapXY(device_id, ...coordsPassField.FIELD_PASSWORD);
  return { status: 200, message: '✅ Đã tap LOGIN thành công' };
};

const inputSHBVN = async ({ device_id, text }) => {
  const coordsKeyboard = await loadCoordinatesLoginSHBVN({ device_id });
  
  console.log('log text in inputSHBVN:', text);
  for (const char of text) {
    console.log('log char in text:', char);
    if (isUpperCase(char) || isSpecialChar(char)) {
      await adbHelper.tapXY(device_id, ...coordsKeyboard['Shift']);
      await delay(50);
      await adbHelper.tapXY(device_id, ...coordsKeyboard[char]);
      await delay(50);
    }
    else {
      await adbHelper.tapXY(device_id, ...coordsKeyboard[char.toLowerCase()]);
    }
    await delay(50);
  }
  await delay(50);
  await adbHelper.tapXY(device_id, ...coordsKeyboard['Enter']);
  return { status: 200, message: 'Success' };
};

const loginSHBVN = async ({ device_id, bank, text }) => {
  Logger.log(0, `3. Login Shinhanbank...`, __filename);   
  // Chạy trackSHBVNUI song song, không await để tránh bị chặn
  trackSHBVNUI({ device_id }).catch((err) => {
    Logger.log(2, `trackSHBVNUI error: ${err.message}`, __filename);
  });
  await submitLoginSHBVN1({ device_id, bank }, 0);
  await submitLoginSHBVN2({ device_id, bank }, 0);
  await submitLoginSHBVN3({ device_id, bank, text }, 0);
};

const loginSTB = async ({ device_id }) => {
  Logger.log(0, `3. Login Sacom...`, __filename);

  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);

  const bank = info?.data?.bank;
  const password = getBankPass(bank, device_id);

  await submitLoginSTB1({ device_id, bank }, password.length, 0);
  await submitLoginSTB2({ device_id, bank }, password.length, 0);
  await submitLoginSTB3({ device_id, bank }, password.length, 0);
  await submitLoginSTB4({ device_id, bank }, password.length, 0);
};

// chua lam
const loginVIKKI = async ({ device_id }) => {
  Logger.log(0, `3. Login VIKKI...`, __filename);

  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const info = JSON.parse(raw);

  const bank = info?.data?.bank;
  const password = getBankPass(bank, device_id);

  await submitLoginVIKKI1({ device_id, bank }, password.length, 0);
};

const mapLoginBank = {
  bab: loginBAB,
  hdb: loginHDB,
  tpb: loginTPB,
  eib: loginEIB,
  shb: loginSHB,
  shbvn: loginSHBVN,
  ocb: loginOCB,
  abb: loginABB,
  nab: loginNAB,
  mb: loginMB,
  stb: loginSTB,
  vikki: loginVIKKI,
};

const reset = async (timer, device_id, bank, controller, title) => {
  timer++;
  const count = 30;  
  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const json = JSON.parse(raw);
  const type = json?.type;
  bank = json?.data?.bank || 'shbvn';

  if (isNaN(timer)) {
    Logger.log(2, `Reset vì timer không hợp lệ: ${timer}`, __filename);
    await runBankTransfer({ device_id, bank, controller });
    return 0;
  }

  if (timer >= count) {
    Logger.log(1, `Đã đạt giới hạn retry (${timer}/${count}), reset lại...`, __filename);
    await runBankTransfer({ device_id, bank, controller });
    // if (bank === 'shbvn') {
    //   notifier.emit('multiple-banks-detected', {
    //     device_id,
    //     message: `Vui lòng mở thiết bị lên để có thể dump được màn hình`
    //   });
    // }
    return 0;
  }

  Logger.log(1, `Retry lần ${timer}/${count}`, __filename);
  return timer;
};

const resetSHBVN = async (timer, device_id, bank, text, title) => {
  timer++;
  const count = 30;  
  const infoPath = path.join(__dirname, '../database/info-qr.json');
  const raw = fs.readFileSync(infoPath, 'utf-8');
  const json = JSON.parse(raw);
  const type = json?.type;
  bank = json?.data?.bank || 'shbvn';

  if (isNaN(timer)) {
    Logger.log(2, `Reset vì timer không hợp lệ: ${timer}`, __filename);
    await loginSHBVN({ device_id, bank, text });
    return 0;
  }

  if (timer >= count) {
    Logger.log(1, `Đã đạt giới hạn retry (${timer}/${count}), reset lại...`, __filename);
    await loginSHBVN({ device_id, bank, text });
    // if (bank === 'shbvn') {
    //   notifier.emit('multiple-banks-detected', {
    //     device_id,
    //     message: `Vui lòng mở thiết bị lên để có thể dump được màn hình`
    //   });
    // }
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

// TPB không dùng được này từ 1/7/2025. Chưa làm lại.
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

const scanQRBAB = async ({ device_id, bank }) => {
  await client.shell(device_id, 'input tap 540 1920');
  await uploadQRSHB1({ device_id, bank }, 0);
  await uploadQRSHB2({ device_id, bank }, 0);
  await uploadQRSHB3({ device_id, bank }, 0);

  return { status: 200, message: 'Success' };
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
  await client.shell(device_id, 'input tap 540 999');
  await uploadQRSHB1({ device_id, bank }, 0);
  await uploadQRSHB2({ device_id, bank }, 0);
  await uploadQRSHB3({ device_id, bank }, 0);

  return { status: 200, message: 'Success' };
};

const scanQROCB = async ({ device_id, bank }) => {
  const coordinates = await loadCoordinates('ocb', device_id);
  await client.shell(device_id, 'input tap 540 2010');
  await uploadQROCB1({ device_id, bank }, 0);
  await uploadQROCB2({ device_id, bank }, 0);

  return { status: 200, message: 'Success' };
};

const scanQRNAB = async ({ device_id, bank }) => {
  // const coordinates = await loadCoordinates('shb', device_id);      
  // await adbHelper.tapXY(device_id, ...coordinates['ScanQR']);
  // await delay(600);
  // await adbHelper.tapXY(device_id, ...coordinates['Image']);
  // await delay(900);
  // await adbHelper.tapXY(device_id, ...coordinates['Target-Img']);      
  await client.shell(device_id, 'input tap 945 1465');
  await uploadQRNAB1({ device_id, bank }, 0);
  await uploadQRNAB2({ device_id, bank }, 0);
  await uploadQRNAB3({ device_id, bank }, 0);

  return { status: 200, message: 'Success' };
};

const scanQRMB = async ({ device_id, bank }) => {
  await client.shell(device_id, 'input tap 540 1936');
  await delay(500);
  await client.shell(device_id, 'input tap 805 1875');
  await uploadQRMB1({ device_id, bank }, 0);
  await uploadQRMB2({ device_id, bank }, 0);

  return { status: 200, message: 'Success' };
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

const scanQRVIKKI = async ({ device_id, bank }) => {
  // await client.shell(device_id, 'input tap 540 2010');  
  // await uploadQROCB1({ device_id, bank }, 0);
  // await uploadQROCB2({ device_id, bank }, 0);
  console.log('alooooooooooooooooooooooooo');

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
  vikki: scanQRVIKKI,
};

const bankStartSuccessKeywords = {
  shbvn: ["com.shinhan.global.vn.bank:id/text_welcome",
    "com.shinhan.global.vn.bank:id/btn_login",
    "com.shinhan.global.vn.bank:id/btn_sign_up"
  ],
  stb: ["Xin chào", "Truy cập nhanh"],
  bab: ["Quên mật khẩu", "Đăng nhập"],
  hdb: ["com.vnpay.hdbank:id/forget_pass"],
  tpb: ["Smart OTP", "Quét QR", "Mật khẩu"], // TPB không dùng được này từ 1/7/2025. Chưa làm lại.
  eib: [""], // Màn hình đăng nhập (sau khi khởi động app) là rỗng
  shb: ["Nhập mật khẩu"],
  ocb: ["Tìm ATM và chi nhánh", "Tra cứu lãi suất", "Liên hệ hỗ trợ", "Đăng nhập"],
  nab: ["Tap &amp; Pay", "Soft OTP", "Happy Cashback", "Quét QR"],
  mb: ["Xin chào,", "Tài khoản khác", "Quên mật khẩu?", "Đăng nhập", "Xác thực D-OTP"],
  acb: ["aaaaaaaaaaaaaaaaaaaaa"], // chua lam                
  vikki: ["Quên mã PIN?"],
  vpb: ["Mật khẩu", "Đăng nhập", "Quên mật khẩu?"] // chưa ok
};

const bankLoginSuccessKeywords = {
  stb: ["Xin chào", "Truy cập nhanh"],
  shbvn: ["com.shinhan.global.vn.bank:id/lbl_account_detail",
    "com.shinhan.global.vn.bank:id/tv_banking_services"
  ],
  bab: ["Tài khoản thanh toán", "Số dư: ************ VND", "Trang chủ"],
  shb: ["Tài khoản trực tuyến", "Tài khoản", "Tiết kiệm", "Chuyển tiền", "Thanh toán"],
  ocb: ["Tài khoản của tôi", "Chuyển tiền", "Xem tất cả", "Thanh toán hóa đơn"],
  nab: ["ops.namabank.com.vn:id/title_trang_chu", "ops.namabank.com.vn:id/title_dich_vu", "ops.namabank.com.vn:id/titleQRCode", "ops.namabank.com.vn:id/title_thanh_vien", "ops.namabank.com.vn:id/title_tien_ich", "Quét QR", "Thẻ"],
  mb: ["Trang chủ", "Thẻ", "Chuyển tiền", "Tổng số dư VND&#10;*** *** VND"], // Chú ý đoạn này sau update app
  acb: ["Số dư khả dụng", "Dịch vụ ngân hàng", "Trang chủ", "Tài khoản"],
  hdb: ["com.vnpay.hdbank:id/tvTitle", "com.vnpay.hdbank:id/tvLoanAmount", "com.vnpay.hdbank:id/transfer_in", "com.vnpay.hdbank:id/transfer"],
  eib: [""], // Màn hình sau login là rỗng                
  tpb: ["Trang Chủ", "Chợ tiện ích", "Quét mọi QR", "Dịch vụ NH", "Cá Nhân"], // TPB không dùng được này từ 1/7/2025. Chưa làm lại.
  vikki: ["******,  VND", "THẺ", "KHOẢN VAY", "TIẾT KIỆM"],
  vpb: ["Tài khoản", "QR Code", "Chuyển tiền"] // chưa ok
};

const scanQRSuccessKeywords = {
  stb: ["Số tài khoản", "Tên người nhận", "Số tiền cần chuyển"],
  shbvn: ["chưa làmmmmmmmmmmmmmmmmmmmmmmmmmmmm"],
  bab: ["Thông tin chuyển tiền", "Quý khách vui lòng nhập không dấu.Các ký tự đặc biệt được sử dụng là '.', ',', '-', '_' và '/'"],
  hdb: [''], // chua lam
  eib: ['com.vnpay.EximBankOmni:id/layThuong'],
  shb: ['Chuyển tiền đến', 'Ngân hàng nhận', 'Số tài khoản', 'Tên người nhận', 'Số tiền', 'Lời nhắn', 'Tài khoản nguồn'],
  mb: ['MInput_0a67f0a6-0cc5-483a-8e23-9300e20ab1ac'],
  abb: ['ABBANK', 'Chọn ảnh'], // chua lam
  stb: ['Sacombank', 'Hình ảnh'], // chua lam
  vpb: ['QR Code', 'Chọn ảnh'], // chua lam
  ocb: ['Thư viện', 'Gallery'], // chua lam
  tpb: ['Chuyển tiền tới', 'Tiếp tục'],
  nab: ['Tài khoản nguồn', 'Ngân hàng nhận', 'Tên người nhận'],
  acb: ['Chọn ảnh', 'Gallery'] // chua lam
};

async function checkStartApp({ device_id, bank }) {  
  const keywords = bankStartSuccessKeywords[bank.toLowerCase()] || [];

  let attempt = 0;
  const maxAttempts = 3;
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
  const requiredKeywordsMap = {
    stb: [
      'Tài khoản thanh toán',
      'Số dư: ************ VND',
      'Trang chủ'
    ],
    shbvn: ["com.shinhan.global.vn.bank:id/lbl_account_detail",
      "com.shinhan.global.vn.bank:id/tv_banking_services"
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
    // TPB không dùng được này từ 1/7/2025. Chưa làm lại.
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

// ============== submitLogin TPB ============== //
// TPB không dùng được này từ 1/7/2025. Chưa làm lại.
const submitLoginTPB = async ({ device_id, bank }, expectedLength, timer) => {
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

  console.log('match:', match);

  const isCompleted = match?.[1]?.length === expectedLength;

  if (match && match[1]) {
    console.log(`match[1].length: ${match[1].length}`);
    const unicodeChars = match[1].split('').map(c => c.charCodeAt(0).toString(16));
    console.log('Unicode các ký tự:', unicodeChars); // Debug xem là U+2022 hay U+25CF
  }

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

// ============== submitLogin BAB ============== //
const submitLoginBAB = async ({ device_id, bank }, expectedLength, timer) => {
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

  console.log('match:', match);

  const isCompleted = match?.[1]?.length === expectedLength;

  if (match && match[1]) {
    console.log(`match[1].length: ${match[1].length}`);
  }

  if (isCompleted) {
    console.log('Mật khẩu đủ, tiến hành tap "Đăng nhập"...');
    await client.shell(device_id, 'input tap 326 1055');
  } else {
    const t = await reset(timer, device_id, bank);
    setTimeout(() => submitLoginBAB({ device_id, bank }, expectedLength, t), 500);
  }
};

// ============== submitLogin HDB ============== //
const submitLoginHDB = async ({ device_id, bank }, expectedLength, timer) => {  
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

  console.log('hasError1:', hasError1);
  console.log('hasError2:', hasError2);

  if (!hasError1 && !hasError2) {
    await delay(1000);
    console.log('Không phát hiện lỗi đăng nhập HDB → submit login');
    await client.shell(device_id, 'input keyevent 66');
    await client.shell(device_id, 'input keyevent 66');
  } else {
    console.log('⚠️ Phát hiện cảnh báo sai mật khẩu HDB → không submit.');
    const t = await reset(timer, device_id, bank);
    setTimeout(() => submitLoginHDB({ device_id, bank }, expectedLength, t), 500);
  }
};

// ============== submitLogin SHB ============== //
const submitLoginSHB = async ({ device_id, bank }, expectedLength, timer) => {
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

  console.log('match:', match);

  const isCompleted = match?.[1]?.length === expectedLength;

  if (match && match[1]) {
    console.log(`match[1].length: ${match[1].length}`);
    const unicodeChars = match[1].split('').map(c => c.charCodeAt(0).toString(16));
    console.log('Unicode các ký tự:', unicodeChars); // Debug xem là U+2022 hay U+25CF
  }

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

// ============== submitLogin NAB ============== //
const submitLoginNAB1 = async ({ device_id, bank }, timer) => {
  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await reset(timer, device_id, bank);
    return setTimeout(() => submitLoginNAB1({ device_id, bank }, t), 500);
  }

  const latestFile = path.join(logDir, files[0].name);
  const content = fs.readFileSync(latestFile, 'utf-8');

  const btn_forgot = content.includes('ops.namabank.com.vn:id/btn_forgot');

  console.log(`🟡 btn_forgot: ${btn_forgot}`);

  if (btn_forgot) {
    console.log('Đã thấy màn hình Login → Click Mật khẩu');
    await client.shell(device_id, 'input tap 540 866');
    await delay(200);
    await client.shell(device_id, 'input tap 540 866');
  } else {
    const t = await reset(timer, device_id, bank);
    setTimeout(() => submitLoginNAB1({ device_id, bank }, t), 500);
  }
};

const submitLoginNAB2 = async ({ device_id, bank }, timer) => {
  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await reset(timer, device_id, bank);
    return setTimeout(() => submitLoginNAB2({ device_id, bank }, t), 500);
  }

  const latestFile = path.join(logDir, files[0].name);
  const content = fs.readFileSync(latestFile, 'utf-8');

  const hintPass = content.includes('ops.namabank.com.vn:id/tvHintPassword');

  console.log(`🟡 hintPass: ${hintPass}`);

  if (hintPass) {
    console.log('Bắt đầu nhập vào mật khẩu');
    const infoPath = path.join(__dirname, '../database/info-qr.json');
    const raw = fs.readFileSync(infoPath, 'utf-8');
    const info = JSON.parse(raw);

    bank = info?.data?.bank;
    const password = getBankPass(bank, device_id);
    const escapedPassword = escapeAdbText(password);
    await client.shell(device_id, `input text ${escapedPassword}`);
  } else {
    const t = await reset(timer, device_id, bank);
    setTimeout(() => submitLoginNAB2({ device_id, bank }, t), 500);
  }
};

const submitLoginNAB3 = async ({ device_id, bank }, expectedLength, timer) => {
  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await reset(timer, device_id, bank);
    return setTimeout(() => submitLoginNAB3({ device_id, bank }, expectedLength, t), 500);
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

  // Nếu đủ ký tự → tap "Đăng nhập"
  if (isCompleted) {
    console.log('Đã nhập đủ mật khẩu, tiến hành tap Đăng nhập...');
    await client.shell(device_id, 'input tap 540 1186');
  } else {
    const t = await reset(timer, device_id, bank);
    setTimeout(() => submitLoginNAB3({ device_id, bank }, expectedLength, t), 500);
  }
};

// ============== submitLogin MB ============== //
const submitLoginMB = async ({ device_id, bank }, expectedLength, timer) => {
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

  console.log('match:', match);

  const isCompleted = match?.[1]?.length === expectedLength;

  if (match && match[1]) {
    console.log(`match[1].length: ${match[1].length}`);
    const unicodeChars = match[1].split('').map(c => c.charCodeAt(0).toString(16));
    console.log('Unicode các ký tự:', unicodeChars); // Debug xem là U+2022 hay U+25CF
  }

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

// ============== submitLogin STB ============== //
const submitLoginSTB1 = async ({ device_id, bank }, password, timer) => {
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

  console.log(`hasTransfer: ${hasTransfer}, hasQuickAccess: ${hasQuickAccess}`);

  if (hasTransfer && hasQuickAccess) {
    console.log('Đã thấy Chuyển tiền và Truy cập nhanh → nhập mật khẩu');
    await client.shell(device_id, 'input tap 970 150');
  } else {
    const t = await reset(timer, device_id, bank);
    setTimeout(() => submitLoginSTB1({ device_id, bank }, password, t), 500);
  }
};

const submitLoginSTB2 = async ({ device_id, bank }, password, timer) => {  
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

  console.log(`forgetPass: ${forgetPass}`);

  if (forgetPass) {
    console.log('Đã thấy khu vực nhập mật khẩu → Nhập mật khẩu');
    await client.shell(device_id, `input text ${escapedPassword}`);
  } else {
    const t = await reset(timer, device_id, bank);
    setTimeout(() => submitLoginSTB3({ device_id, bank }, password, t), 500);
  }
};

const submitLoginSTB4 = async ({ device_id, bank }, expectedLength, timer) => {
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

  console.log('match:', match);

  const isCompleted = match?.[1]?.length === expectedLength;

  if (match && match[1]) {
    console.log(`Mật khẩu hiện tại: "${match[1]}" | Độ dài: ${match[1].length} | Mong đợi: ${expectedLength}`);
  }

  if (isCompleted) {
    console.log('Đủ mật khẩu → Tap Đăng nhập');
    await client.shell(device_id, 'input tap 540 910');
  } else {
    const t = await reset(timer, device_id, bank);
    setTimeout(() => submitLoginSTB4({ device_id, bank }, expectedLength, t), 500);
  }
};

// ============== submitLogin SHBVN ============== //
// click vào nút ĐĂNG NHẬP / LOG IN ở màn hình đăng nhập (sau khi start app)
const submitLoginSHBVN1 = async ({ device_id, bank }, timer) => {
  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await resetSHBVN(timer, device_id, bank);
    return setTimeout(() => submitLoginSHBVN1({ device_id, bank }, t), 500);
  }

  const latestXMLPath = path.join(logDir, files[0].name);
  console.log('log latestXMLPath:',latestXMLPath);
  const xmlContent = fs.readFileSync(latestXMLPath, 'utf-8');

  const hasLogin = xmlContent.includes('com.shinhan.global.vn.bank:id/btn_login');
  const hasRegis = xmlContent.includes('com.shinhan.global.vn.bank:id/btn_sign_up');

  console.log(`hasLogin: ${hasLogin}, hasRegis: ${hasRegis}`);

  if (hasLogin && hasRegis) {
    console.log('Đã thấy ...bắt đầu click nút ĐĂNG NHẬP');
    await tapLoginButton(device_id);
    // chua xong.
  } else {
    const t = await resetSHBVN(timer, device_id, bank);
    setTimeout(() => submitLoginSHBVN1({ device_id, bank }, t), 500);
  }
};

// click vào field Mật khẩu / Password (sau khi click nút ĐĂNG NHẬP)
const submitLoginSHBVN2 = async ({ device_id, bank }, timer) => {
  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await resetSHBVN(timer, device_id, bank);
    return setTimeout(() => submitLoginSHBVN2({ device_id, bank }, t), 500);
  }

  const latestXMLPath = path.join(logDir, files[0].name);
  const xmlContent = fs.readFileSync(latestXMLPath, 'utf-8');

  // resource-id="com.shinhan.global.vn.bank:id/tv_user_pw"
  const tv_user_pw = xmlContent.includes('com.shinhan.global.vn.bank:id/tv_user_pw');

  console.log(`tv_user_pw: ${tv_user_pw}`);

  if (tv_user_pw) {
    console.log('Đã thấy field Password...bắt đầu click vào ô Mật khẩu');
    await tapPasswordFiled(device_id);
  } else {
    const t = await resetSHBVN(timer, device_id, bank);
    setTimeout(() => submitLoginSHBVN2({ device_id, bank }, t), 500);
  }
};

// Bắt đầu tap vào bàn phím để nhập mật khẩu (sau khi click nút ĐĂNG NHẬP)
const submitLoginSHBVN3 = async ({ device_id, bank, text }, timer) => {
  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await resetSHBVN(timer, device_id, bank);
    return setTimeout(() => submitLoginSHBVN3({ device_id, bank, text }, t), 500);
  }

  const latestXMLPath = path.join(logDir, files[0].name);
  const xmlContent = fs.readFileSync(latestXMLPath, 'utf-8');

  // resource-id="com.shinhan.global.vn.bank:id/nf_fun_key_delete"
  const nf_fun_key_delete = xmlContent.includes('com.shinhan.global.vn.bank:id/nf_fun_key_delete');

  console.log(`nf_fun_key_delete: ${nf_fun_key_delete}`);

  if (nf_fun_key_delete) {
    console.log('Đã click vào field Password...bắt đầu tap vào bàn phím để nhập mật khẩu');
    await inputSHBVN({ device_id, text });
  } else {
    const t = await resetSHBVN(timer, device_id, bank, text);
    setTimeout(() => submitLoginSHBVN3({ device_id, bank, text }, t), 500);
  }
};

// ============== submitLogin VPB ============== // chua lam
const submitLoginVPB1 = async ({ device_id, bank }, password, timer) => {
  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await reset(timer, device_id, bank);
    return setTimeout(() => submitLoginVPB1({ device_id, bank }, password, t), 500);
  }

  const latestFile = path.join(logDir, files[0].name);
  const content = fs.readFileSync(latestFile, 'utf-8');

  // const hasTransfer = content.includes('text="Chuyển tiền"'); // chua lam
  // const hasQuickAccess = content.includes('text="Truy cập nhanh"'); // chua lam

  // console.log(`🟡 hasTransfer: ${hasTransfer}, hasQuickAccess: ${hasQuickAccess}`);

  // if (hasTransfer && hasQuickAccess) {
  //   console.log('Đã thấy Chuyển tiền và Truy cập nhanh → nhập mật khẩu');
  //   await client.shell(device_id, 'input tap 970 150');
  // } else {
  //   const t = await reset(timer, device_id, bank);
  //   setTimeout(() => submitLoginVPB1({ device_id, bank }, password, t), 500);
  // }
};

// ============== submitLogin VIKKI ============== // dump xml không ổn định.
const submitLoginVIKKI1 = async ({ device_id, bank }, password, timer) => {
  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await reset(timer, device_id, bank);
    return setTimeout(() => submitLoginVIKKI1({ device_id, bank }, password, t), 500);
  }

  const latestFile = path.join(logDir, files[0].name);
  const content = fs.readFileSync(latestFile, 'utf-8');

  const forgotPass = content.includes('Quên mã PIN?');
  const text1 = content.includes('text="1"');
  const text2 = content.includes('text="2"');
  const text3 = content.includes('text="3"');
  const text4 = content.includes('text="4"');
  const text5 = content.includes('text="5"');
  const text6 = content.includes('text="6"');
  const text7 = content.includes('text="7"');
  const text8 = content.includes('text="8"');
  const text9 = content.includes('text="9"');
  const text0 = content.includes('text="0"');

  console.log(`🟡 forgotPass: ${forgotPass}`);

  if (forgotPass && text1 && text2 && text3 && text4 && text5 && text6 && text7 && text8 && text9 && text0) {
    console.log('Đã thấy màn hình Nhập mã PIN → Nhập mã PIN');
    // await delay(10000);
    await client.shell(device_id, 'input tap 540 1094');
    await delay(300);
    await client.shell(device_id, 'input tap 540 1332');
    await delay(300);
    await client.shell(device_id, 'input tap 540 1564');
    await delay(300);
    await client.shell(device_id, 'input tap 540 1800');
    await delay(300);
    await client.shell(device_id, 'input tap 540 1800');
    await delay(300);
    await client.shell(device_id, 'input tap 540 1800');
  } else {
    const t = await reset(timer, device_id, bank);
    setTimeout(() => submitLoginVIKKI1({ device_id, bank }, password, t), 500);
  }
};

// ============== upload image SHB ============== //
const uploadQRSHB1 = async ({ device_id, bank }, timer) => {
  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await reset(timer, device_id, bank);
    return setTimeout(() => uploadQRSHB1({ device_id, bank }, t), 500);
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
    setTimeout(() => uploadQRSHB1({ device_id, bank }, t), 500);
  }
};

const uploadQRSHB2 = async ({ device_id, bank }, timer) => {
  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await reset(timer, device_id, bank);
    return setTimeout(() => uploadQRSHB2({ device_id, bank }, t), 500);
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
    setTimeout(() => uploadQRSHB2({ device_id, bank }, t), 500);
  }
};

const uploadQRSHB3 = async ({ device_id, bank }, timer) => {
  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await reset(timer, device_id, bank);
    return setTimeout(() => uploadQRSHB3({ device_id, bank }, t), 500);
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
    setTimeout(() => uploadQRSHB3({ device_id, bank }, t), 500);
  }
};

// ============== upload image OCB ============== //
const uploadQROCB1 = async ({ device_id, bank }, timer) => {
  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await reset(timer, device_id, bank);
    return setTimeout(() => uploadQROCB1({ device_id, bank }, t), 500);
  }

  const latestFile = path.join(logDir, files[0].name);
  const content = fs.readFileSync(latestFile, 'utf-8');

  const scanQR = content.includes('Quét mã QR');
  const uploadImg = content.includes('Chọn ảnh');

  console.log(`🟡 scanQR: ${scanQR}, uploadQR: ${uploadImg}`);

  if (scanQR && uploadImg) {
    console.log('Đã thấy màn hình Chọn ảnh → Click Chọn ảnh');
    await client.shell(device_id, 'input tap 397 1925');
  } else {
    const t = await reset(timer, device_id, bank);
    setTimeout(() => uploadQROCB1({ device_id, bank }, t), 500);
  }
};

const uploadQROCB2 = async ({ device_id, bank }, timer) => {
  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await reset(timer, device_id, bank);
    return setTimeout(() => uploadQROCB2({ device_id, bank }, t), 500);
  }

  const latestFile = path.join(logDir, files[0].name);
  const content = fs.readFileSync(latestFile, 'utf-8');

  const cam = content.includes('Camera');
  const inNote9 = content.includes('HÌNH ẢNH TRÊN GALAXY NOTE9');

  console.log(`🟡 cam: ${cam}, inNote9: ${inNote9}`);

  if (cam && inNote9) {
    console.log('Đã thấy thư mục Camera → Chọn ảnh');
    await client.shell(device_id, 'input tap 215 550');
  } else {
    const t = await reset(timer, device_id, bank);
    setTimeout(() => uploadQROCB2({ device_id, bank }, t), 500);
  }
};

// ============== upload image NAB ============== //
const uploadQRNAB1 = async ({ device_id, bank }, timer) => {
  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await reset(timer, device_id, bank);
    return setTimeout(() => uploadQRNAB1({ device_id, bank }, t), 500);
  }

  const latestFile = path.join(logDir, files[0].name);
  const content = fs.readFileSync(latestFile, 'utf-8');

  const uploadImg = content.includes('Quét mã QR để thanh toán (trong nước, song phương), chuyển tiền và rút tiền mặt tại ATM.');
  const uploadImg2 = content.includes('Scan QR code for payment (Domestic/Overseas), money transfer (internal transfer Nam A Bank/FastFund Napas 247)');

  console.log(`🟡 uploadImg: ${uploadImg}, uploadImg2: ${uploadImg2}`);

  if (uploadImg || uploadImg2) {
    console.log('Đã thấy màn hình uploadImg → Click chọn');
    await client.shell(device_id, 'input tap 460 1855');
  } else {
    const t = await reset(timer, device_id, bank);
    setTimeout(() => uploadQRNAB1({ device_id, bank }, t), 500);
  }
};

const uploadQRNAB2 = async ({ device_id, bank }, timer) => {
  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await reset(timer, device_id, bank);
    return setTimeout(() => uploadQRNAB2({ device_id, bank }, t), 500);
  }

  const latestFile = path.join(logDir, files[0].name);
  const content = fs.readFileSync(latestFile, 'utf-8');

  const gallery = content.includes('Bộ sưu tập');
  const systemTraces = content.includes('Dấu vết hệ thống');
  const yourFile = content.includes('File của bạn');

  console.log(`🟡 gallery: ${gallery}, systemTraces: ${systemTraces}, yourFile: ${yourFile}`);

  if (gallery && systemTraces && yourFile) {
    console.log('Đã thấy màn hình DUYỆT QUA TỆP TRONG CÁC ỨNG DỤNG KHÁC → Click Bộ sưu tập');
    await client.shell(device_id, 'input tap 135 415');
  } else {
    const t = await reset(timer, device_id, bank);
    setTimeout(() => uploadQRNAB2({ device_id, bank }, t), 500);
  }
};

const uploadQRNAB3 = async ({ device_id, bank }, timer) => {
  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await reset(timer, device_id, bank);
    return setTimeout(() => uploadQRNAB3({ device_id, bank }, t), 500);
  }

  const latestFile = path.join(logDir, files[0].name);
  const content = fs.readFileSync(latestFile, 'utf-8');

  const select = content.includes('Chọn mục');
  const img = content.includes('Hình ảnh');
  const album = content.includes('Album');

  console.log(`🟡 select: ${select}, img: ${img}, album: ${album}`);

  if (select && img && album) {
    console.log('Đã thấy màn hình Target img → Click Target img');
    await client.shell(device_id, 'input tap 138 838');
  } else {
    const t = await reset(timer, device_id, bank);
    setTimeout(() => uploadQRNAB3({ device_id, bank }, t), 500);
  }
};

// ============== upload image MB ============== //
const uploadQRMB1 = async ({ device_id, bank }, timer) => {
  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await reset(timer, device_id, bank);
    return setTimeout(() => uploadQRMB1({ device_id, bank }, t), 500);
  }

  const latestFile = path.join(logDir, files[0].name);
  const content = fs.readFileSync(latestFile, 'utf-8');

  const gallery = content.includes('Bộ sưu tập');
  const systemTraces = content.includes('Dấu vết hệ thống');
  const yourFile = content.includes('File của bạn');

  console.log(`🟡 gallery: ${gallery}, systemTraces: ${systemTraces}, yourFile: ${yourFile}`);

  if (gallery && systemTraces && yourFile) {
    console.log('Đã thấy màn hình DUYỆT QUA TỆP TRONG CÁC ỨNG DỤNG KHÁC → Click Bộ sưu tập');
    await client.shell(device_id, 'input tap 135 415');
  } else {
    const t = await reset(timer, device_id, bank);
    setTimeout(() => uploadQRMB1({ device_id, bank }, t), 500);
  }
};

const uploadQRMB2 = async ({ device_id, bank }, timer) => {
  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await reset(timer, device_id, bank);
    return setTimeout(() => uploadQRMB2({ device_id, bank }, t), 500);
  }

  const latestFile = path.join(logDir, files[0].name);
  const content = fs.readFileSync(latestFile, 'utf-8');

  const select = content.includes('Chọn mục');
  const img = content.includes('Hình ảnh');
  const album = content.includes('Album');

  console.log(`🟡 select: ${select}, img: ${img}, album: ${album}`);

  if (select && img && album) {
    console.log('Đã thấy màn hình Target img → Click Target img');
    await client.shell(device_id, 'input tap 138 838');
  } else {
    const t = await reset(timer, device_id, bank);
    setTimeout(() => uploadQRMB2({ device_id, bank }, t), 500);
  }
};

// ============== upload image BAB ============== //
const uploadQRBAB1 = async ({ device_id, bank }, timer) => {
  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    const t = await reset(timer, device_id, bank);
    return setTimeout(() => uploadQRBAB1({ device_id, bank }, t), 500);
  }

  const latestFile = path.join(logDir, files[0].name);
  const content = fs.readFileSync(latestFile, 'utf-8');

  const genQR = content.includes('Tạo mã QR');
  const uploadImg = content.includes('Quét ảnh');

  console.log(`🟡 genQR: ${genQR}, uploadImg: ${uploadImg}`);

  if (genQR && uploadImg) {
    console.log('Đã thấy màn hình Quét QR → Quét ảnh');
    await client.shell(device_id, 'input tap 911 1836');
  } else {
    const t = await reset(timer, device_id, bank);
    setTimeout(() => uploadQRBAB1({ device_id, bank }, t), 500);
  }
};

async function checkLogin({ device_id, bank }) {
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
  const keywords = scanQRSuccessKeywords[bank.toLowerCase()] || [];
  const maxAttempts = 10;
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
  bank = json?.data?.bank || 'shbvn';
  transId = json?.data?.trans_id;
  const stopApp = mapStopBank[bank.toLowerCase()];
  const startApp = mapStartBank[bank.toLowerCase()];
  const loginApp = mapLoginBank[bank.toLowerCase()];  

  // Dọn sạch logs cũ
  // fs.readdirSync(logDir)
  //   .filter(file => file.endsWith('.xml'))
  //   .forEach(file => fs.unlinkSync(path.join(logDir, file)));

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
    await delay(3000);
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
  startTransfer,
  stopTransfer,
  checkHome,
  stopABB,
  stopACB,
  stopBAB,
  stopBIDV,
  stopEIB,
  stopHDB,
  stopICB,
  stopLPB,
  stopOCB,
  stopNAB,
  stopNCB,
  stopTPB,
  stopVPB,
  stopMB,
  stopMSB,
  stopPVCB,
  stopSHB,
  stopSHBVN,
  stopSEAB,
  stopSTB,
  stopTCB,
  stopVIKKI,
  stopVCB,
  stopVIB,
  stopVIETBANK,
  startABB,
  startACB,
  startBAB,
  startBIDV,
  startEIB,
  startHDB,
  startICB,
  startOCB,
  startNAB,
  startVPB,
  startMB,
  startNCB,
  startSHB,
  startSHBVN,
  startSTB,
  startTPB,
  startVIKKI,
  startVIETBANK,
  copyQRImages,
  scanQRICB,
  clickScanQRBIDV,
  clickSelectImageBIDV,
  clickLoginHDB,
  clickConfirmBIDV,
  clickConfirmScanFaceBIDV,
  clickConfirmICB,
  clickConfirmOCB,
  inputPINBIDV,
  inputPINICB,
  inputICB,
  tapLoginButton,
  inputSHBVN, // input theo cái tọa độ đc loading từ bounds lấy ra từ xml
  loginSHBVN
};
