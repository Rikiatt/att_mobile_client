const nodeCmd = require('../helpers/nodeCmdHelper');
const path = require('path');
const adb = require('adbkit');
const adbPath = path.join(__dirname, '../platform-tools', 'adb.exe');
const client = adb.createClient({ bin: adbPath });

const scrcpyFolder = path.join(__dirname, '../scrcpy', 'scrcpy.exe');
const { delay } = require('../helpers/functionHelper');

const fs = require('fs');
const tmpFile = path.join(__dirname, '../scrcpy/current_device.txt');

const { trackingLoop } = require("../functions/bankStatus.function");
const localDataPath = path.join(__dirname, '../database/localdata.json');
const localRaw = fs.readFileSync(localDataPath, 'utf-8');
const local = JSON.parse(localRaw);
const siteOrg = local?.org?.site || '';
const siteAtt = local?.att?.site?.split('/').pop() || '';
const { checkDeviceFHD, checkFontScale, checkWMDensity } = require('../functions/device.function');
const notifier = require('../events/notifier');
const { Logger } = require("../config/require.config");

function getLastDeviceId() {
  if (fs.existsSync(tmpFile)) {
    return fs.readFileSync(tmpFile, 'utf8').trim();
  }
  return null;
}

module.exports = {
  connectScrcpy: async ({ device_id, title }) => {
    console.log(`Kết nối thiết bị -s ${device_id}`);
    nodeCmd.run(`"${scrcpyFolder}" -s ${device_id} --no-audio --window-title="${title ? title : device_id}"`);
    await delay(500);

    const validSites =
      ['shbet', 'new88'].includes(siteOrg) ||
      ['shbet', 'new88'].includes(siteAtt) ||
      (['jun88cmd', 'jun88k36'].includes(siteOrg));

    // if (validSites) {      
    //   await trackingLoop({ device_id });
    // }
    if (validSites) {                  
      const deviceHelper = require('../helpers/deviceHelper');

      const deviceModel = await deviceHelper.getDeviceModel(device_id);

      if (deviceModel === 'SM-N960') {
        const checkFHD = await checkDeviceFHD({ device_id });
        if (!checkFHD.valid) {
          Logger.log(1, 'Vui lòng cài đặt độ phân giải màn hình ở FHD+', __filename);
          notifier.emit('multiple-banks-detected', {
            device_id,
            message: 'Vui lòng cài đặt độ phân giải màn hình ở FHD+'
          });
          return null;
        }

        const checkFont = await checkFontScale({ device_id });
        if (!checkFont.valid) {
          Logger.log(1, 'Vui lòng cài đặt cỡ font và kiểu font nhỏ nhất', __filename);
          notifier.emit('multiple-banks-detected', {
            device_id,
            message: 'Vui lòng cài đặt cỡ font và kiểu font nhỏ nhất'
          });
          return null;
        }

        const checkDensity = await checkWMDensity({ device_id });
        if (!checkDensity.valid) {
          Logger.log(1, 'Vui lòng cài đặt Thu/Phóng màn hình nhỏ nhất và độ phân giải màn hình ở FHD+', __filename);
          notifier.emit('multiple-banks-detected', {
            device_id,
            message: 'Vui lòng cài đặt Thu/Phóng màn hình nhỏ nhất và độ phân giải màn hình ở FHD+'
          });
          return null;
        }
      }

      await trackingLoop({ device_id });
    }

    return { status: 200, message: 'Success' };
  },

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
