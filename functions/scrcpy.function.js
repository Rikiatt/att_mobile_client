const nodeCmd = require('../helpers/nodeCmdHelper');
const path = require('path');

const scrcpyFolder = path.join(__dirname, '../scrcpy', 'scrcpy.exe');
const { delay } = require('../helpers/functionHelper');

module.exports = {
  connectScrcpy: async ({ device_id, title }) => {
    console.log('Kết nối thiết bị');
    nodeCmd.run(
      `"${scrcpyFolder}" -s ${device_id} --video-codec=h265 --max-size=1920 --max-fps=60 --no-audio --window-title="${
        title ? title : device_id
      }"`
    );
    await delay(3000);
  },

  cameraScrcpy: async ({ device_id, camera_id }) => {
    console.log('Khởi chạy camera');
    // --camera-id=1 : Cam trước
    // --camera-id=0 : Cam sau
    nodeCmd.run(`"${scrcpyFolder}" -s ${device_id} --video-source=camera --camera-id=${camera_id} --orientation=270 --camera-fps=60`);
    await delay(3000);
  }
};
