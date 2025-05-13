const path = require('path');
const { delay } = require('../helpers/functionHelper');
const responseHelper = require('../helpers/responseHelper');
const { updateSource, getDataJson } = require('../functions/function');
const { stopGnirehtet, autoRunGnirehtet } = require('../functions/gnirehtet.function');
const fs = require('fs');
const axios = require('axios');
const { exec } = require('child_process');

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

// const downloadQrFromVietQR = async (url, device_id) => {
//   try {
//     const qrBuffer = await axios.get(url, { responseType: 'arraybuffer' });
//     const fileName = `${device_id}_vietqr.png`;
//     const localPath = path.join(__dirname, '../database', fileName);
//     fs.writeFileSync(localPath, qrBuffer.data);

//     // Dùng adb push nhưng đảm bảo adb server đang chạy
//     const adbPath = path.join(__dirname, '../platform-tools/adb.exe');

//     // Kiểm tra thiết bị đã authorized chưa
//     const checkCmd = `"${adbPath}" -s ${device_id} get-state`;
//     await new Promise((resolve, reject) => {
//       exec(checkCmd, (err, stdout, stderr) => {
//         if (err || stdout.trim() !== 'device') {
//           return reject(new Error('Thiết bị chưa authorized hoặc offline'));
//         }
//         return resolve();
//       });
//     });

//     // adb push
//     const pushCmd = `"${adbPath}" -s ${device_id} push "${localPath}" /sdcard/DCIM/Camera`;    
//     const pushResult = await new Promise((resolve, reject) => {
//       exec(pushCmd, (error, stdout, stderr) => {
//         if (error) {
//           console.error('adb push error:', stderr || error.message);
//           return reject(new Error(stderr || error.message));
//         }
//         resolve(stdout.trim());
//       });
//     });

//     return {
//       success: true,
//       path: `/sdcard/DCIM/Camera/${fileName}`,
//       localPath,
//       adbLog: pushResult
//     };
//   } catch (e) {
//     console.error('downloadQrFromVietQR ERROR:', e.message);
//     return {
//       success: false,
//       message: e.message
//     };
//   }
// };
const downloadQrFromVietQR = async (url, device_id) => {
  try {
    const qrBuffer = await axios.get(url, { responseType: 'arraybuffer' });
    const fileName = `${device_id}_vietqr.png`;
    const localPath = path.join(__dirname, '../database', fileName);
    fs.writeFileSync(localPath, qrBuffer.data);

    const adbPath = path.join(__dirname, '../platform-tools/adb.exe');

    // Kiểm tra thiết bị có đang kết nối
    const checkCmd = `"${adbPath}" -s "${device_id}" get-state`;
    await new Promise((resolve, reject) => {
      exec(checkCmd, (err, stdout) => {
        if (err || stdout.trim() !== 'device') {
          return reject(new Error('Thiết bị chưa authorized hoặc offline'));
        }
        resolve();
      });
    });

    // Danh sách thư mục ưu tiên để đẩy QR vào
    const targetDirs = ["/sdcard/DCIM/Camera/", "/sdcard/Download/", "/sdcard/"];
    let pushSuccess = false;
    let finalPath = '';
    let pushLog = '';

    for (const dir of targetDirs) {
      const pushCmd = `"${adbPath}" -s "${device_id}" push "${localPath}" "${dir}"`;
      try {
        const result = await new Promise((resolve, reject) => {
          exec(pushCmd, (error, stdout, stderr) => {
            if (error) return reject(stderr || error.message);
            resolve(stdout.trim());
          });
        });
        finalPath = path.posix.join(dir, fileName);
        pushLog = result;
        pushSuccess = true;
        break; // Thành công thì dừng vòng lặp
      } catch (err) {
        console.warn(`⚠ adb push tới ${dir} thất bại: ${err}`);
      }
    }

    if (!pushSuccess) {
      throw new Error('Đẩy ảnh QR vào thiết bị không thành công.');
    }

    return {
      success: true,
      path: finalPath,
      localPath,
      adbLog: pushLog
    };
  } catch (e) {
    console.error('downloadQrFromVietQR ERROR:', e.message);
    return {
      success: false,
      message: e.message
    };
  }
};

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

  download_qr_for_account : async (req, res) => {
    try {
      const { bank_code, bank_account, device_id, amount } = req.query;
  
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
        
      const qrUrl = `https://img.vietqr.io/image/${bin}-${bank_account}-qr.png?amount=${amount}&addInfo=`;      
      const result = await downloadQrFromVietQR(qrUrl, device_id);
  
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
