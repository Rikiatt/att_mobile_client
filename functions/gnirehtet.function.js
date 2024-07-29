const nodeCmd = require('../helpers/nodeCmdHelper');
const path = require('path');

const gnirehtetFolder = path.join(__dirname, '../gnirehtet', 'gnirehtet.exe');
const { delay } = require('../helpers/functionHelper');
const { listDevice } = require('./adb.function');

module.exports = {
  autoRunGnirehtet: async () => {
    console.log('Chia sẻ kết nối ngược');
    nodeCmd.runSync(`taskkill /F /IM gnirehtet.exe`);

    nodeCmd.run(`"${gnirehtetFolder}" autorun`);

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
