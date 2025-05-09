const nodeCmd = require('../helpers/nodeCmdHelper');
const path = require('path');

const scrcpyFolder = path.join(__dirname, '../scrcpy', 'scrcpy.exe');
const { delay } = require('../helpers/functionHelper');

const fs = require('fs');
const tmpFile = path.join(__dirname, '../scrcpy/current_device.txt');

const { startTrackingLoop } = require("../functions/bankStatus.function");
// Đọc file localdata.json
const localDataPath = path.join(__dirname, '../database/localdata.json');
const localRaw = fs.readFileSync(localDataPath, 'utf-8');
const local = JSON.parse(localRaw);
// Tách site cuối cùng, ví dụ: "ui_manual/connect/new88" => "new88"
const siteFull = local?.att?.site || '';
const site = siteFull.split('/').pop();

function killScrcpy() {
  return new Promise((resolve) => {
    nodeCmd.run('taskkill /IM scrcpy.exe /F', () => {
      resolve();
    });
  });
}

function getLastDeviceId() {
  if (fs.existsSync(tmpFile)) {
    return fs.readFileSync(tmpFile, 'utf8').trim();
  }
  return null;
}

function saveCurrentDeviceId(device_id) {
  fs.writeFileSync(tmpFile, device_id);
}

module.exports = {
  connectScrcpy: async ({ device_id, title }) => {
    // Tắt hết mọi thiết bị đang mở với scrcpy.exe cũ
    // để tránh gian lận
    // nodeCmd.run(`taskkill /F /IM scrcpy.exe`);
    // await delay(500);
    console.log(`Kết nối thiết bị -s ${device_id}`);
    nodeCmd.run(`"${scrcpyFolder}" -s ${device_id} --no-audio --window-title="${title ? title : device_id}"`);
    await delay(500);    
    if (!site) {
      return res.status(400).json({ status: false, message: 'Không xác định được site từ localdata.json' });
    }
    if (site === 'new88' || site === 'shbet') {
      await startTrackingLoop({ device_id: device_id }); 
    }    
  },

  // connectScrcpy: async ({ device_id, title }) => {
  //   const lastDevice = getLastDeviceId();
  //   console.log('log lastDevice:', lastDevice);

  //   // Nếu thiết bị mới khác thiết bị đang chạy thì kill process scrcpy
  //   if (lastDevice && lastDevice !== device_id) {
  //     console.log(`Đóng scrcpy của thiết bị cũ: ${lastDevice}`);
  //     await killScrcpy();
  //   }

  //   // Lưu thiết bị mới
  //   saveCurrentDeviceId(device_id);

  //   console.log(`Kết nối thiết bị ${device_id}`);
  //   nodeCmd.run(`"${scrcpyFolder}" -s ${device_id} --no-audio --window-title="${title ? title : device_id}"`);
  //   await delay(3000);
  // },

  // Optional: check xem scrcpy có đang chạy không
  isScrcpyRunning: () => {
    const { data } = nodeCmd.runSync('tasklist /FI "IMAGENAME eq scrcpy.exe"');
    return data.includes('scrcpy.exe');
  },

  getCurrentDevice: () => {
    return getLastDeviceId();
  },

  cameraScrcpy: async ({ device_id, camera_id }) => {
    console.log('Khởi chạy camera');
    // --camera-id=1 : Cam trước
    // --camera-id=0 : Cam sau
    nodeCmd.run(`"${scrcpyFolder}" -s ${device_id} --video-source=camera --camera-id=${camera_id} --orientation=270 --camera-fps=60`);
    await delay(3000);
  }
};
