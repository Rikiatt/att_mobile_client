const nodeCmd = require('../helpers/nodeCmdHelper');
const path = require('path');

const { delay } = require('../helpers/functionHelper');
const { listDevice } = require('./adb.function');

const gnirehtetFolder = path.join(__dirname, '../gnirehtet', 'gnirehtet.exe');
const batFilePath = path.join(__dirname, 'start_gnirehtet.bat');

module.exports = {
  autoRunGnirehtet: async () => {
    console.log('Dừng gnirehtet.exe');
    nodeCmd.runSync(`taskkill /F /IM gnirehtet.exe`);

    console.log('Chia sẻ kết nối ngược');

    nodeCmd.run(`start "" "${batFilePath}"`);

    await delay(1000);
  },

  stopGnirehtet: async () => {
    const devices = await listDevice();
    for (const device of devices) {
      console.log('Đóng kết nối ' + device.id);
      nodeCmd.runSync(`"${gnirehtetFolder}" stop ${device.id}`);
    }
    await delay(1000);
  }
};
