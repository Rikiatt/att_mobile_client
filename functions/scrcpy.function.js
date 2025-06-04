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

// const infoQRPath = path.join(__dirname, '../database/info-qr.json');
// const { runBankTransfer } = require("../functions/bank.function");
// const validBankTriggers = ["bidv", "icb", "ncb", "tcb", "vcb"];
// sắp xếp lại cái này sau theo thứ tự start nhanh của app
// const preferredApps = ["eib", "ocb", "nab", "tpb", "vpb", "mb", "shb", "abb", "acb"]; 

// const bankPackages = {
//   abb: 'vn.abbank.retail',
//   acb: 'mobile.acb.com.vn',
//   eib: 'com.vnpay.EximBankOmni',
//   ocb: 'vn.com.ocb.awe',
//   nab: 'ops.namabank.com.vn',
//   tpb: 'com.tpb.mb.gprsandroid',
//   vpb: 'com.vnpay.vpbankonline',
//   mb: 'com.mbmobile',
//   shb: 'vn.shb.saha.mbanking',
//   stb: 'com.sacombank.ewallet'
// };

// async function isAppInstalled(device_id, packageName) {
//   try {
//     const output = await client.shell(device_id, `pm list packages ${packageName}`)
//       .then(adb.util.readAll)
//       .then(buffer => buffer.toString());
//     return output.includes(packageName);
//   } catch (err) {
//     console.error(`Lỗi kiểm tra app ${packageName}:`, err.message);
//     return false;
//   }
// }

function getLastDeviceId() {
  if (fs.existsSync(tmpFile)) {
    return fs.readFileSync(tmpFile, 'utf8').trim();
  }
  return null;
}

module.exports = {
  // connectScrcpy: async ({ device_id, title }) => {
  //   console.log(`Kết nối thiết bị -s ${device_id}`);
  //   nodeCmd.run(`${scrcpyFolder}" -s ${device_id} --no-audio --window-title="${title ? title : device_id}`);
  //   await delay(500);

  //   const validSites =
  //     ['shbet', 'new88'].includes(siteOrg) ||
  //     ['shbet', 'new88'].includes(siteAtt) ||
  //     (['jun88cmd', 'jun88k36'].includes(siteOrg));

  //   console.log('log in validSites connectScrcpy:',validSites);      
      
  //   if (validSites) {      
  //     await trackingLoop({ device_id });
  //   }

  //   return { status: 200, message: 'Success' };
  // },
  connectScrcpy: async ({ device_id, title }) => {
    console.log(`Kết nối thiết bị -s ${device_id}`);
    nodeCmd.run(`"${scrcpyFolder}" -s ${device_id} --no-audio --window-title="${title ? title : device_id}"`);
    await delay(500);

    // if (validSites.includes(siteOrg) || validSites.includes(siteAtt)) {
    //   await trackingLoop({ device_id: device_id });
    // }
    const validSites =
      ['shbet', 'new88'].includes(siteOrg) ||
      ['shbet', 'new88'].includes(siteAtt) ||
      (['jun88cmd', 'jun88k36'].includes(siteOrg));
      
    if (validSites) {      
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
