const fs = require('fs');
const path = require('path');
const io = require('socket.io-client');
const { delay } = require('../helpers/functionHelper');
// const { listDevice, sendFile, delImg } = require('./adb.function');
// const { sendFile, delImg } = require('./adb.function');
// const { sendFile } = require('./adb.function');
const { transToQr, downloadQr, setDataJson, getDataJson, getIpPublic } = require('./function');
let currentSocket = null;
const adbPath = path.join(__dirname, '../platform-tools', 'adb.exe');
const adb = require('adbkit');
const client = adb.createClient({ bin: adbPath });

const date = new Date();
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, '0');
const day = String(date.getDate()).padStart(2, '0');
const hours = String(date.getHours()).padStart(2, '0');
const minutes = String(date.getMinutes()).padStart(2, '0');
const seconds = String(date.getSeconds()).padStart(2, '0');
const filename = `${year}${month}${day}_${hours}${minutes}${seconds}`;
let qrDevicePath = '/sdcard/' + filename + '.jpg';

const copyQRImages = async ( device_id ) => {    
  if (!qrDevicePath) {
    console.error("❌ Không tìm thấy đường dẫn QR!");
    return;
  }

  console.log('log filename in copyQRImages:', filename);
  const sourcePath = qrDevicePath;
  const destinationDir = `/sdcard/`;

  console.log(`Bắt đầu sao chép ảnh từ ${sourcePath} trên thiết bị ${device_id}...`);

  for (let i = 1; i <= 20; i++) {
    const destinationPath = `${destinationDir}${filename}_copy_${i}.jpg`;

    try {
      await client.shell(device_id, `cp ${sourcePath} ${destinationPath}`);
      console.log(`✅ Đã sao chép ảnh vào: ${destinationPath}`);
    } catch (error) {
      console.error(`❌ Lỗi sao chép ảnh ${destinationPath}: ${error}`);
    }
  }

  return { status: 200, message: 'Success' };
}

const getScreenSize = async (device_id) => {
  try {
    // Thực thi lệnh `wm size` trên thiết bị
    const output = await client.shell(device_id, 'wm size');
    const resultBuffer = await adb.util.readAll(output);
    const result = resultBuffer.toString();

    // Sử dụng regex để tìm kiếm Override size và Physical size
    const overrideSizeMatch = result.match(/Override size: (\d+x\d+)/);
    const physicalSizeMatch = result.match(/Physical size: (\d+x\d+)/);

    // Nếu có Override size, trả về nó, nếu không trả về Physical size
    if (overrideSizeMatch) {
      return overrideSizeMatch[1];
    } else if (physicalSizeMatch) {
      return physicalSizeMatch[1];
    } else {
      return '';
    }
  } catch (error) {
    console.error('Error getting screen size:', error);
    return '';
  }
};

const getNameDevice = async (device_id) => {
  try {
    const output = await client.shell(device_id, 'dumpsys bluetooth_manager | grep name');
    const resultBuffer = await adb.util.readAll(output);
    const result = resultBuffer.toString();
    const match = result.match(/name:\s*(.*)\r?\n/);
    const name = match ? match[1].trim() : '';
    return name;
  } catch (error) {
    console.error('Error getting Bluetooth device name:', error);
    return '';
  }
};

const getAndroidVersion = async (device_id) => {
  try {
    const output = await client.shell(device_id, 'getprop ro.build.version.release');
    const resultBuffer = await adb.util.readAll(output);
    const result = parseInt(resultBuffer.toString().trim());
    return result;
  } catch (error) {
    console.error('Error getting Android version:', error);
    return '';
  }
};

const getModel = async (device_id) => {
  try {
    const output = await client.shell(device_id, 'getprop ro.product.model');
    const resultBuffer = await adb.util.readAll(output);
    const result = resultBuffer.toString().trim();
    return result;
  } catch (error) {
    console.error('Error getting model:', error);
    return '';
  }
};

async function listDevice() {
  try {
    const devices = await client.listDevices();
    for (let device of devices) {
      const [screenSize, nameDevice, androidVersion, model] = await Promise.all([
        getScreenSize(device.id),
        getNameDevice(device.id),
        getAndroidVersion(device.id),
        getModel(device.id)
      ])

      device.screenSize = screenSize;
      device.nameDevice = nameDevice;
      device.androidVersion = androidVersion;
      device.model = model;
    }
    console.log("Danh sách thiết bị ", devices?.length);
    return devices;
  } catch (error) {
    console.error('Error getting connected devices:', error);
    return [];
  }
}

async function delImg  (device_id, devicePath, filename = '') {
    const listCommand = `ls ${devicePath} | grep -E '${filename}\\.(png|jpg)$'`;
    client.shell(device_id, listCommand)
      .then(adb.util.readAll)
      .then((files) => {
        const fileList = files.toString().trim().split('\n');
        if (fileList.length === 0) {
          console.log('No files to delete.');
          return;
        }
        const deleteCommands = fileList.map(file => `rm '${devicePath}${file}'`).join(' && ');
        return client.shell(device_id, deleteCommands);
      })
    await delay(100);
    client.shell(device_id, `am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file://${devicePath}`);
    return { status: 200, message: 'Success' };
}

async function sendFile  (device_id, localPath, devicePath) {
    await client.push(device_id, localPath, devicePath);
    await delay(500);
    await client.shell(device_id, `am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file://${devicePath}`);
    await delay(100);
    return { status: 200, message: 'Success' };
}

module.exports = {
  qrDevicePath,

  filename,

  connectEndpoint: async ({ type, disconnect }) => {
    const ipPublic = await getIpPublic();
    const lastReceived = {};
    try {
      if (currentSocket) {
        console.log('Closing existing socket connection...');
        currentSocket.disconnect();
        currentSocket = null; // Đặt lại biến
      }
      // Khởi tạo file json
      let localPath = path.join(__dirname, '..', 'database', 'localdata.json');
      const localData = await getDataJson(localPath);
      console.log("---> Listening on server <---", type, localData, localData[type]?.endpoint, localData[type]?.site);
      if (localData && localData[type]?.endpoint && localData[type]?.site) {
        // reset
        await setDataJson(localPath, { ...localData, connect: '', att: { ...localData.att, connected: false }, org: { ...localData.org, connected: false } });
        // 
        if (!disconnect) {
          const { site, endpoint } = localData[type];

          console.log("---> Listening on server <---");
          // Cấu hình kết nối socket tới attpays+ và attpay.org
          let handPath = '/socket.io';
          if (site.includes('ui_manual')) {
            handPath = "/ui_manual/connect/socket.io";
          }
          currentSocket = io(endpoint + "/" + site, {
            path: handPath,
            transports: ['websocket']
          });

          // Khi kết nối thành công
          currentSocket.on('connect', async () => {
            console.log('Connected to server:', currentSocket.id);
            await setDataJson(localPath, { ...localData, connect: type, [type]: { ...localData[type], connected: true, message: 'Success' } });
          });

          currentSocket.on('connect_error', async (error) => {
            console.error('Socket Fail:: ', error.message);
            await setDataJson(localPath, { ...localData, connect: type, [type]: { ...localData[type], connected: false, message: error.message } });
          });

          // Nhận phản hồi từ server
          currentSocket.on('broadcast', async (data) => {
            const now = Date.now();
            console.log('data ' + type, data);
            const devices = await listDevice();

            const findId = data.device_id.split('$')[0];
            const findIp = data.device_id.split('$')[1];

            const findDevice = devices.find((item) => ((!findIp || findIp == ipPublic) && item.id == findId));
            if (!findDevice) {
              return;
            }

            // Đúng thiết bị
            if (lastReceived[findId] && now - lastReceived[findId] < 5000) {
              return;
            };
            lastReceived[findId] = now;
            
            const { vietqr_url, trans_id, bin, account_number, amount, trans_mess, PIN, bank_pass } = data;

            if (!vietqr_url && (!bin || !account_number || !amount || !trans_mess || PIN || bank_pass)) {
              console.log("Mix Data");
              currentSocket.emit('callback', { ...data, success: false });
              return;
            }

            let qrLocalPath = path.join(__dirname, '..', 'images', findId.split(':')[0] + '_qr.jpg');            

            if (vietqr_url) {
              console.log('log vietqr_url:', vietqr_url);
              await delImg(findId, '/sdcard/');
              await delay(1000);
              await delImg(findId, '/sdcard/DCIM/');
              await delay(1000);
              await delImg(findId, '/sdcard/DCIM/Camera/');
              console.log("Deleted old QR - " + filename);
              await delay(1000);
              await downloadQr(vietqr_url, qrLocalPath);                                                      
            } else {
              await transToQr(data, qrLocalPath);
            }
            let jsonPath = path.join(__dirname, '..', 'database', findId.split(':')[0] + '_url.json');

            await setDataJson(jsonPath, { vietqr_url: vietqr_url, last_time: Date.now() });

            console.log('log qrDevicePath before it sent to device:',qrDevicePath);
            await sendFile(findId, qrLocalPath, qrDevicePath);            
            
            setTimeout(async () => {              
              await delImg(findId, '/sdcard/', filename);                                
              console.log("Deleted old QR - " + filename);
            }, 300000);

            // Thành công !!!
            console.log("Success!");
            currentSocket.emit('callback', { ...data, success: true });
          });

          // Khi bị ngắt kết nối
          currentSocket.on('disconnect', async () => {
            console.log('Disconnected from server');
            await setDataJson(localPath, { ...localData, connect: type, [type]: { ...localData[type], connected: false, message: 'Disconnected' } });
          });
        }
      }      
    } catch (e) {
      console.log(e);
    }
  }  
};