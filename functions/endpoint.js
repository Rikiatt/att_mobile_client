const fs = require('fs');
const path = require('path');
const io = require('socket.io-client');
const { delay } = require('../helpers/functionHelper');
const { transToQr, downloadQr, setDataJson, getDataJson, getIpPublic } = require('./function');
let currentSocket = null;

const adbPath = path.join(__dirname, '../platform-tools', 'adb.exe');
const adb = require('adbkit');
const client = adb.createClient({ bin: adbPath });

const ensureDirectoryExistence = (filePath) => {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
};

const getScreenSize = async (device_id) => {
  try {
    const output = await client.shell(device_id, 'wm size');
    const resultBuffer = await adb.util.readAll(output);
    const result = resultBuffer.toString();
    const overrideSizeMatch = result.match(/Override size: (\d+x\d+)/);
    const physicalSizeMatch = result.match(/Physical size: (\d+x\d+)/);
    return overrideSizeMatch ? overrideSizeMatch[1] : (physicalSizeMatch ? physicalSizeMatch[1] : '');
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
    return match ? match[1].trim() : '';
  } catch (error) {
    console.error('Error getting Bluetooth device name:', error);
    return '';
  }
};

const getAndroidVersion = async (device_id) => {
  try {
    const output = await client.shell(device_id, 'getprop ro.build.version.release');
    const resultBuffer = await adb.util.readAll(output);
    return parseInt(resultBuffer.toString().trim());
  } catch (error) {
    console.error('Error getting Android version:', error);
    return '';
  }
};

const getModel = async (device_id) => {
  try {
    const output = await client.shell(device_id, 'getprop ro.product.model');
    const resultBuffer = await adb.util.readAll(output);
    return resultBuffer.toString().trim();
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
      ]);
      device.screenSize = screenSize;
      device.nameDevice = nameDevice;
      device.androidVersion = androidVersion;
      device.model = model;
    }
    console.log('Danh sách thiết bị ', devices?.length);
    return devices;
  } catch (error) {
    console.error('Error getting connected devices:', error);
    return [];
  }
}

async function sendFile(device_id, localPath, devicePath) {
  await client.push(device_id, localPath, devicePath);
  await delay(500);
  await client.shell(device_id, `am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file://${devicePath}`);
  await delay(100);
  return { status: 200, message: 'Success' };
}

async function delImg(device_id, devicePath, filename = '') {
  const listCommand = `ls ${devicePath} | grep -E '${filename}\\.(png|jpg)$'`;
  client.shell(device_id, listCommand)
    .then(adb.util.readAll)
    .then((files) => {
      const fileList = files.toString().trim().split('\n');
      if (fileList.length === 0) {
        console.log('No files to delete.');
        return;
      }
      const deleteCommands = fileList.map((file) => `rm '${devicePath}${file}'`).join(' && ');
      return client.shell(device_id, deleteCommands);
    });
  await delay(100);
  client.shell(device_id, `am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file://${devicePath}`);
  return { status: 200, message: 'Success' };
}

module.exports = {
  connectEndpoint: async ({ type, disconnect }) => {
    const ipPublic = await getIpPublic();
    const lastReceived = {};
    try {
      if (currentSocket) {
        console.log('Closing existing socket connection...');
        currentSocket.disconnect();
        currentSocket = null;
      }

      let localPath = path.join(__dirname, '..', 'database', 'localdata.json');
      const localData = await getDataJson(localPath);
      console.log('---> Listening on server <---', type, localData, localData[type]?.endpoint, localData[type]?.site);

      if (localData && localData[type]?.endpoint && localData[type]?.site) {
        await setDataJson(localPath, {
          ...localData,
          connect: '',
          att: { ...localData.att, connected: false },
          org: { ...localData.org, connected: false }
        });

        if (!disconnect) {
          const { site, endpoint } = localData[type];
          let handPath = site.includes('ui_manual') ? '/ui_manual/connect/socket.io' : '/socket.io';

          currentSocket = io(endpoint + '/' + site, {
            path: handPath,
            transports: ['websocket']
          });

          currentSocket.on('connect', async () => {
            console.log('Connected to server:', currentSocket.id);
            await setDataJson(localPath, {
              ...localData,
              connect: type,
              [type]: { ...localData[type], connected: true, message: 'Success' }
            });
          });

          currentSocket.on('connect_error', async (error) => {
            console.error('Socket Fail:: ', error.message);
            await setDataJson(localPath, {
              ...localData,
              connect: type,
              [type]: { ...localData[type], connected: false, message: error.message }
            });
          });

          currentSocket.on('broadcast', async (data) => {
            const now = Date.now();
            console.log('log data ' + type, data);
            const devices = await listDevice();
            const findId = data.device_id.split('$')[0];
            const findIp = data.device_id.split('$')[1];
            const findDevice = devices.find((item) => (!findIp || findIp == ipPublic) && item.id == findId);
            if (!findDevice) return;
            if (lastReceived[findId] && now - lastReceived[findId] < 5000) return;
            lastReceived[findId] = now;

            const qrInfoPath = path.join(__dirname, '..', 'database', 'info-qr.json');
            let qrData = { type, data, timestamp: new Date().toISOString() };
            console.log('log qrData (device matched):', qrData);
            fs.writeFileSync(qrInfoPath, JSON.stringify(qrData, null, 2));
            console.log('Saved vietqr_url to info-qr.json');

            const { vietqr_url, trans_id, bin, account_number, amount, trans_mess, PIN, bank_pass } = data;
            if (!vietqr_url && (!bin || !account_number || !amount || !trans_mess || PIN || bank_pass)) {
              console.log('Mix Data');
              currentSocket.emit('callback', { ...data, success: false });
              return;
            }

            const filename = `${trans_id}`;
            let qrLocalPath = path.join(__dirname, '..', 'images', `${trans_id}.png`);
            let qrDevicePath = `/sdcard/DCIM/Camera/${trans_id}.png`;

            ensureDirectoryExistence(qrLocalPath);

            if (vietqr_url) {
              await delImg(findId, '/sdcard/DCIM/Camera/');
              console.log('Deleted old QR - ' + filename);
              await delay(100);
              const downloaded = await downloadQr(vietqr_url, qrLocalPath);
              if (!downloaded) {
                console.log('Download Failed -> create QR by library:', qrLocalPath);
                await transToQr(data, qrLocalPath);
              }
            } else {
              await transToQr(data, qrLocalPath);
            }

            let jsonPath = path.join(__dirname, '..', 'database', findId.split(':')[0] + '_url.json');
            await setDataJson(jsonPath, { vietqr_url: vietqr_url, last_time: Date.now() });
            await sendFile(findId, qrLocalPath, qrDevicePath);

            setTimeout(async () => {
              await delImg(findId, '/sdcard/DCIM/Camera/', filename);
              console.log('Deleted old QR - ' + filename);
            }, 300000);

            console.log('Success!');
            currentSocket.emit('callback', { ...data, success: true });
          });

          currentSocket.on('disconnect', async () => {
            console.log('Disconnected from server');
            await setDataJson(localPath, {
              ...localData,
              connect: type,
              [type]: { ...localData[type], connected: false, message: 'Disconnected' }
            });
          });
        }
      }
    } catch (e) {
      console.log(e);
    }
  }
};