const path = require('path');
const { delay } = require('../helpers/functionHelper');
const responseHelper = require('../helpers/responseHelper');
const { getDataJson } = require('../functions/function');
const { stopGnirehtet, autoRunGnirehtet } = require('../functions/gnirehtet.function');
const fs = require('fs');
const axios = require('axios');
const { exec } = require('child_process');
const adb = require('adbkit');
const adbPath = path.join(__dirname, '../platform-tools', 'adb.exe');
const client = adb.createClient({ bin: adbPath });
const crypto = require('crypto');
require('dotenv').config();
const { getDatabase } = require('../database/mongoClient');
const { checkDeviceFHD, checkFontScale, checkWMDensity, checkDeviceICB, checkDeviceBIDV } = require('../functions/device.function');

const bankBins = {
  vcb: '970436',
  bidv: '970418',
  vietbank: '970433',
  tcb: '970407',
  stb: '970403',
  vpb: '970432',
  eib: '970431',
  abb: '970425',
  vba: '970405',
  bab: '970409',
  bvb: '970438',
  vcbneo: '970444',
  cimb: '422589',
  citibank: '533948',
  coopbank: '970446',
  dbs: '796500',
  vikki: '970406',
  gpb: '970408',
  hdb: '970437',
  hlbvn: '970442',
  hsbc: '458761',
  icb: '970415',
  ivb: '970434',
  ncb: '970419',
  nab: '970428',
  acb: '970416',
  shb: '970443',
  shbvn: '970424',
  cake: '546034',
  sgicb: '970400',
  seab: '970440',
  scb: '970429',
  pvcb: '970412',
  pgb: '970430',
  pbvn: '970439',
  mbv: '970414',
  ocb: '970448',
  lio: '963369',
  msb: '970426',
  mb: '970422',
  mafc: '977777',
  lpbank: '970449',
  kbank: '668888',
  klb: '970452',
  kebhanahcm: '970466',
  kebhanahn: '970467',
  kbhn: '970462',
  kbhcm: '970463',
  ubank: '546035',
  scvn: '970410',
  tpb: '970423',
  timo: '963388',
  uob: '970458',
  vab: '970427',
  vbsp: '999888',
  vccb: '970454',
  vib: '970441',
  vnpbmoney: '971011',
  vrb: '970421',
  vtlmoney: '971005',
  wvn: '970457'
};

const downloadQrFromVietQR = async (url, device_id) => {
  try {
    const qrBuffer = await axios.get(url, { responseType: 'arraybuffer' });    
    const fileName = `${device_id}_vietqr.png`;
    const localPath = path.join(__dirname, '../database', fileName);
    fs.writeFileSync(localPath, qrBuffer.data);

    const devicePath = `/sdcard/DCIM/Camera/${fileName}`;

    // Đẩy file vào thiết bị
    await client.push(device_id, localPath, devicePath);
    await delay(500);

    // Gửi broadcast để hiển thị lên Gallery
    await client.shell(
      device_id,
      `am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file://${devicePath}`
    );
    await delay(100);

    return {
      success: true,
      path: devicePath,
      localPath
    };
  } catch (e) {
    console.error('downloadQrFromVietQR ERROR:', e.message);
    return {
      success: false,
      message: e.message
    };
  }
};

const fetchGoogleSheet = async (req, res) => {
  try {
    const response = await axios.get('https://script.google.com/macros/s/AKfycbwVg5WXpDzkSZYUPrUqh8P_PYubQ2is1kwr-w6jkMLRTLVZ1Fiq6BMaR1sexuiZmUSA/exec');
    
    return res.json(response.data);
  } catch (error) {
    console.error('Error fetching Google Sheet:', error.message);
    return res.status(500).json({ error: 'Failed to fetch data from Google Sheet' });
  }
};

const get_google_sheet = async (req, res) => {
  try {
    const localPath = path.join(__dirname, '../database/localdata.json');
    const localRaw = fs.readFileSync(localPath, 'utf-8');
    const local = JSON.parse(localRaw);
    const siteFull = local?.att?.site || '';
    const site = siteFull.split('/').pop().trim().toUpperCase();

    const key = require('md5')(`${site}||RIKI`);    
    const GOOGLE_SHEET_JSON_URL = process.env.GOOGLE_SHEET_JSON_URL;        
    const url = `${GOOGLE_SHEET_JSON_URL}?key=${key}`;
    
    const response = await axios.get(url);

    if (!Array.isArray(response.data)) {
      return res.status(500).json({ status: false, message: "Phản hồi Google Sheets không hợp lệ" });
    }

    // Ghi file cho backend dùng password
    const backendPath = path.join(__dirname, '../database/local-banks.json');
    fs.writeFileSync(backendPath, JSON.stringify(response.data, null, 2), 'utf-8');

    // Ghi thêm file cho frontend (Import UI, Test QR, Macro...)
    const frontendPath = path.join(__dirname, '../views/portal_ui_automator/public/banks/local-banks.json');
    fs.writeFileSync(frontendPath, JSON.stringify(response.data, null, 2), 'utf-8');

    return res.json(response.data);
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu Google Sheet:', error.message);
    return res.status(500).json({ status: false, message: "Lỗi hệ thống hoặc kết nối" });
  }
};

const sync_banks_to_mongodb = async (req, res) => {
  try {    
    const localPath = path.join(__dirname, '../database/localdata.json');
    const localRaw = fs.readFileSync(localPath, 'utf-8');
    const local = JSON.parse(localRaw);

    const siteFull = local?.att?.site || '';
    const siteUpper = siteFull.split('/').pop().trim().toUpperCase(); // để MD5
    const siteLower = siteFull.split('/').pop().trim().toLowerCase(); // để lưu mongodb

    const key = require('md5')(`${siteUpper}||RIKI`);
    const url = `${process.env.GOOGLE_SHEET_JSON_URL}?key=${key}`;

    const response = await axios.get(url);
    const data = response.data;

    if (!Array.isArray(data)) {
      return res.status(500).json({ status: false, message: 'Phản hồi Google Sheets không hợp lệ!' });
    }

    const db = await getDatabase();
    const collection = db.collection('banks');

    let insertCount = 0, updateCount = 0;

    for (const item of data) {
      const bank_account = item['SỐ TÀI KHOẢN']?.toString().trim();
      const bank = item['NGÂN HÀNG']?.toString().trim();

      if (!bank_account || !bank) {
        console.warn('Bỏ qua dòng vì thiếu SỐ TÀI KHOẢN hoặc NGÂN HÀNG:', item);
        continue;
      }

      const filter = {
        site: siteLower,
        bank_account,
        bank
      };

      const update = {
        $set: {
          bank,
          holder_name: item['TÊN CHỦ THẺ']?.toString().trim(),
          account_name: item['TÊN']?.toString().trim(),
          source: 'google-sheet',
          synced_at: new Date(),
          site: siteLower
        }
      };

      const result = await collection.updateOne(filter, update, { upsert: true });
      if (result.upsertedCount) insertCount++;
      else if (result.modifiedCount) updateCount++;
    }

    return res.json({
      status: true,
      message: 'Đồng bộ thành công',
      inserted: insertCount,
      updated: updateCount
    });
  } catch (err) {
    console.error('sync_banks_to_mongodb ERROR:', err);
    return res.status(500).json({ status: false, message: 'Đồng bộ thất bại', error: err.message });
  }
};

const mapAction = {  
  checkDeviceFHD: checkDeviceFHD,
  checkFontScale: checkFontScale,   
  checkWMDensity: checkWMDensity,
  checkDeviceICB: checkDeviceICB, 
  checkDeviceBIDV: checkDeviceBIDV
}

module.exports = {
  restart: async (req, res) => {
    // updateSource();
    await delay(2000);
    responseHelper(res, 200, 'Thành công');
  },

  stopShare: async (req, res) => {
    await stopGnirehtet();
    responseHelper(res, 200, 'Thành công');
  },

  startShare: async (req, res) => {
    await autoRunGnirehtet();
    responseHelper(res, 200, 'Thành công');
  },

  get_qr: async (req, res) => {
    const { query } = req;
    let jsonPath = path.join(__dirname, '../database', query.device_id.split(':')[0] + '_url.json')
    const data = await getDataJson(jsonPath);
    res.json({
      status_code: 200,
      valid: true,
      message: 'Thành công',
      result: Date.now() - (data?.last_time || 0) < 30000 ? data.vietqr_url : null
    });
  },

  download_qr_for_account: async (req, res) => {
    try {
      const { bank_code, bank_account, device_id, amount, trans_id } = req.query;
      console.log('log bank_account:', bank_account);
      console.log('log amount:', amount);
      console.log('log bank_code:', bank_code);
      console.log('log device_id:', device_id);
      console.log('log trans_id:', trans_id);

      if (!bank_code || !bank_account || !device_id || !amount) {
        return res.status(400).json({
          status: false,
          message: 'Thiếu tham số bank_code, bank_account, device_id hoặc amount'
        });
      }

      const bin = bankBins[bank_code.toLowerCase()];
      if (!bin) {
        return res.status(400).json({
          status: false,
          message: 'Không hỗ trợ ngân hàng này trong danh sách BIN'
        });
      }

      const qrUrl = bank_account
        ? `https://img.vietqr.io/image/${bin}-${bank_account}-qr.png?amount=${amount}&addInfo=`
        : '';

      const result = bank_account
        ? await downloadQrFromVietQR(qrUrl, device_id)
        : { success: true, path: '' };

      const infoQrPath = path.join(__dirname, '../database/info-qr.json');
      const now = new Date().toISOString();

      const isTestMode = !trans_id; // Xác định TEST THẺ dựa vào không có trans_id

      if (isTestMode) {
        // Ghi đè toàn bộ kiểu test
        const testInfo = {
          type: 'test',
          data: {
            device_id,
            bank: bank_code.toLowerCase(),
            amount: Number(amount),
            trans_status: 'in_process'
          }
        };

        try {
          fs.writeFileSync(infoQrPath, JSON.stringify(testInfo, null, 2), 'utf8');
          console.log('Đã ghi info-qr.json theo type: test');
        } catch (err) {
          console.error('Lỗi ghi info-qr.json:', err.message);
        }

      } else {
        // Không phải test → xử lý cập nhật theo org hoặc att
        let currentInfo = {};
        try {
          const fileContent = fs.readFileSync(infoQrPath, 'utf8');
          currentInfo = JSON.parse(fileContent || '{}');
        } catch (err) {
          console.error('Lỗi đọc info-qr.json:', err.message);
        }

        if (currentInfo.type === 'org') {
          currentInfo.data.bank = bank_code.toLowerCase();
          currentInfo.data.amount = Number(amount);
          currentInfo.data.trans_status = 'in_process';
          currentInfo.timestamp = now;

          try {
            fs.writeFileSync(infoQrPath, JSON.stringify(currentInfo, null, 2), 'utf8');
            console.log('Đã cập nhật info-qr.json cho type: org');
          } catch (err) {
            console.error('Lỗi ghi info-qr.json:', err.message);
          }

        } else if (currentInfo.type === 'att') {
          currentInfo.data.bank = bank_code.toLowerCase();
          currentInfo.data.trans_status = 'in_process';
          currentInfo.timestamp = now;

          try {
            fs.writeFileSync(infoQrPath, JSON.stringify(currentInfo, null, 2), 'utf8');
            console.log('Đã cập nhật info-qr.json cho type: att');
          } catch (err) {
            console.error('Lỗi ghi info-qr.json:', err.message);
          }

        } else {
          console.log('Loại dữ liệu hiện tại không xác định, không cập nhật.');
        }
      }

      if (!result.success) {
        return res.status(500).json({ status: false, message: result.message });
      }

      res.json({
        status: true,
        message: 'Tải QR thành công',
        vietqr_url: qrUrl,
        file_path: result.path
      });
    } catch (error) {
      console.error('download-qr_for_account got an ERROR:', error);
      res.status(500).json({ status: false, message: 'Server error' });
    }
  },

  fetchGoogleSheet,

  get_google_sheet,

  sync_banks_to_mongodb,

  actionDeivce: async (req, res) => {
    try {                              
      const result = await mapAction[req.body.action](req.body);

      if (result?.valid === false) {
        return responseHelper(res, 200, { valid: false, message: result.message });
      }

      return responseHelper(res, 200, { status: 200, valid: true, message: 'Thành công' });
            
    } catch (error) {
      console.log('error:', error);
      responseHelper(res, 500, { message: error.message });
    }
  }
};

/**
 * - 1: adb tcpip 5555 | adb -s 69YTCQCQZ5RO89DM  tcpip 5555
 * - 2: adb -s 69YTCQCQZ5RO89DM connect 192.168.0.103:5555
 * -    adb disconnect 192.168.0.107:5555   ->    disconnected 192.168.0.107:5555
 *      
 * -    adb connect 192.168.0.107:5555      ->    connected to 192.168.0.107:5555 
 *        -> device_id=ip_public$$192.168.0.107:5555 -> lọc IP public, IP private để gửi qr
 * 
 * -    adb tcpip 5555    ->    error: no devices/emulators found
 * 
 * Error getting screen size: FailError: Failure: 'closed'  
 * Error getting Bluetooth device name: FailError: Failure: 'device offline'
 * Error getting Android version: FailError: Failure: 'device offline'
 * Error getting model: FailError: Failure: 'device offline'
 * 
 * 
 * 
 * 
 * 
 */
