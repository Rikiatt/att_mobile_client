require('dotenv').config();
const adb = require('adbkit');
const path = require('path');
const { delay } = require('../helpers/functionHelper');
const { escapeSpecialChars, removeVietnameseStr } = require('../utils/string.util');
const adbPath = path.join(__dirname, '../platform-tools', 'adb.exe');
const client = adb.createClient({ bin: adbPath });

const coordinatesScanQRACB = require('../config/coordinatesScanQRACB.json');
const coordinatesScanQREIB = require('../config/coordinatesScanQREIB.json');
const coordinatesScanQRNAB = require('../config/coordinatesScanQRNAB.json');
const coordinatesScanQRTPB = require('../config/coordinatesScanQRTPB.json');
const coordinatesScanQRVPB = require('../config/coordinatesScanQRVPB.json');
const coordinatesDevice = require('../config/coordinatesDevice.json');
const coordinatesScanQRNCB = require('../config/coordinatesScanQRNCB.json');
const coordinatesScanQRMSB = require('../config/coordinatesScanQRMSB.json');
const coordinatesScanQROCB = require('../config/coordinatesScanQROCB.json');

const deviceHelper = require('../helpers/deviceHelper');

module.exports = {
  closeAll: async ({ device_id }) => {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);

    await client.shell(device_id, 'input keyevent KEYCODE_APP_SWITCH');
    await delay(500);

    if (deviceModel === "ONEPLUS A5010") {
      // await client.shell(device_id, 'input swipe 540 1414 540 150 100'); // input swipe <x1> <y1> <x2> <y2> <duration>
      await client.shell(device_id, 'input swipe 540 1080 2182 1080 100');
      await delay(500);
      await client.shell(device_id, 'input tap 200 888');
      console.log('Đã đóng tất cả các app đang mở');
    }
    else if (deviceModel === "ONEPLUS A5000") {
      // await client.shell(device_id, 'input swipe 540 1414 540 150 100'); // input swipe <x1> <y1> <x2> <y2> <duration>
      await client.shell(device_id, 'input swipe 540 1080 2182 1080 100');
      await delay(500);
      await client.shell(device_id, 'input tap 200 888');
      console.log('Đã đóng tất cả các app đang mở');
    }
    else if (deviceModel === "SM-A155") {
      // await client.shell(device_id, 'input tap 540 1826');
      await client.shell(device_id, 'input tap 540 1855');
      console.log('Đã đóng tất cả các app đang mở');
    }
    else if (deviceModel === "SM-A055") {
      // await client.shell(device_id, 'input tap 540 1826');
      await client.shell(device_id, 'input tap 360 1250');
      console.log('Đã đóng tất cả các app đang mở');
    }
    else {
      await client.shell(device_id, 'input tap 540 1750'); // Click "Close all", for example: Note9
      console.log('Đã đóng tất cả các app đang mở');
    }

    return { status: 200, message: 'Success' };
  },

  listDevice: async () => {
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
  },  
  
  tapADB: async ({ device_id, percent, screenSize }) => {
    console.log(`Click::[${percentSize(percent.X, screenSize.X)} - ${percentSize(percent.Y, screenSize.Y)}]`);
    await client.shell(device_id, `input tap ${percentSize(percent.X, screenSize.X)} ${percentSize(percent.Y, screenSize.Y)}`);
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  inputADB: async ({ device_id, text }) => {
    const formatText = removeVietnameseStr(text);
    const charRegex = escapeSpecialChars(formatText);
    await client.shell(device_id, `input text ${charRegex}`);
    await delay(1000);
    return { status: 200, message: 'Success' };
  },

  checkDeviceACB: async ({ device_id }) => {
    try {
      const deviceModel = await deviceHelper.getDeviceModel(device_id);

      const deviceCoordinates = coordinatesScanQRACB[deviceModel];

      if (deviceCoordinates == undefined) {
        console.log(`No coordinatesScanQRACB found for device model: ${deviceModel}`);
        return { status: 500, valid: false, message: 'Thiết bị chưa hỗ trợ' };
      }

      return deviceCoordinates;
    } catch (error) {
      console.error(`Error checking device: ${error.message}`);
      throw error;
    }
  },

  checkDeviceEIB: async ({ device_id }) => {
    try {
      const deviceModel = await deviceHelper.getDeviceModel(device_id);

      const deviceCoordinates = coordinatesScanQREIB[deviceModel];

      if (deviceCoordinates == undefined) {
        console.log(`No coordinatesScanQREIB found for device model: ${deviceModel}`);
        return { status: 500, valid: false, message: 'Thiết bị chưa hỗ trợ' };
      }

      return deviceCoordinates;
    } catch (error) {
      console.error(`Error checking device: ${error.message}`);
      throw error;
    }
  },

  checkDeviceNAB: async ({ device_id }) => {
    try {
      const deviceModel = await deviceHelper.getDeviceModel(device_id);

      const deviceCoordinates = coordinatesScanQRNAB[deviceModel];

      if (deviceCoordinates == undefined) {
        return { status: 500, valid: false, message: 'Thiết bị chưa hỗ trợ' };
      }

      return deviceCoordinates;
    } catch (error) {
      console.error(`Error checking device: ${error.message}`);
      throw error;
    }
  },

  checkDeviceTPB: async ({ device_id }) => {
    try {
      const deviceModel = await deviceHelper.getDeviceModel(device_id);

      const deviceCoordinates = coordinatesScanQRTPB[deviceModel];

      if (deviceCoordinates == undefined) {
        return { status: 500, valid: false, message: 'Thiết bị chưa hỗ trợ' };
      }

      return deviceCoordinates;
    } catch (error) {
      console.error(`Error checking device: ${error.message}`);
      throw error;
    }
  },

  checkDeviceVPB: async ({ device_id }) => {
    try {
      const deviceModel = await deviceHelper.getDeviceModel(device_id);

      const deviceCoordinates = coordinatesScanQRVPB[deviceModel];

      if (deviceCoordinates == undefined) {
        return { status: 500, valid: false, message: 'Thiết bị chưa hỗ trợ' };
      }

      return deviceCoordinates;
    } catch (error) {
      console.error(`Error checking device: ${error.message}`);
      throw error;
    }
  },

  checkDevice: async ({ device_id }) => {
    try {
      const deviceModel = await deviceHelper.getDeviceModel(device_id);

      const deviceCoordinates = coordinatesDevice[deviceModel];

      if (deviceCoordinates == undefined) {
        return { status: 500, valid: false, message: 'Thiết bị chưa hỗ trợ' };
      }

      return deviceCoordinates;
    } catch (error) {
      console.error(`Error checking device: ${error.message}`);
      throw error;
    }
  },

  checkDeviceNCB: async ({ device_id }) => {
    try {
      const deviceModel = await deviceHelper.getDeviceModel(device_id);

      const deviceCoordinates = coordinatesScanQRNCB[deviceModel];

      if (deviceCoordinates == undefined) {
        return { status: 500, valid: false, message: 'Thiết bị chưa hỗ trợ' };
      }

      return deviceCoordinates;
    } catch (error) {
      console.error(`Error checking device: ${error.message}`);
      throw error;
    }
  },

  checkDeviceMSB: async ({ device_id }) => {
    try {
      const deviceModel = await deviceHelper.getDeviceModel(device_id);

      const deviceCoordinates = coordinatesScanQRMSB[deviceModel];

      if (deviceCoordinates == undefined) {
        return { status: 500, valid: false, message: 'Thiết bị chưa hỗ trợ' };
      }

      return deviceCoordinates;
    } catch (error) {
      console.error(`Error checking device: ${error.message}`);
      throw error;
    }
  },

  checkDeviceOCB: async ({ device_id }) => {
    try {
      const deviceModel = await deviceHelper.getDeviceModel(device_id);

      const deviceCoordinates = coordinatesScanQROCB[deviceModel];

      if (deviceCoordinates == undefined) {
        return { status: 500, valid: false, message: 'Thiết bị chưa hỗ trợ' };
      }

      return deviceCoordinates;
    } catch (error) {
      console.error(`Error checking device: ${error.message}`);
      throw error;
    }
  },
    
  enterADB: async ({ device_id }) => {
    console.log('Nhấn Enter');
    await client.shell(device_id, `input keyevent 66`);
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  tabADB: async ({ device_id }) => {
    console.log('Nhấn Tab');
    await client.shell(device_id, `input keyevent 61`);
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  newlineADB: async ({ device_id }) => {
    console.log('Xuống dòng / element');
    await client.shell(device_id, `input keyevent 20`);
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  connectTcpIp: async ({ device_id, type = 'wlan0' }) => {
    // device_id: 192.168.0.1:5555
    try {
      let connStr = device_id;
      if (type != 'tailscale') {
        const ipaddress = await getIp(device_id, type);
        await client.tcpip(device_id, 5555);
        connStr = `${ipaddress}:5555`;
        await delay(1000);
      }
      await client.connect(`${connStr}`);
      console.log(`Connected to ${connStr}`);
      return { status: 200, valid: true, message: 'Success' };
    } catch (error) {
      console.error(`Failed to connect to ${device_id}:`, error);
      return { status: 500, valid: false, message: 'Fail' };
    }
  },

  disconnectTcpIp: async ({ device_id }) => {
    // device_id: 192.168.0.1:5555
    try {
      await client.disconnect(device_id);
      console.log(`Disconnected from ${device_id}`);
      return { status: 200, message: 'Success' };
    } catch (error) {
      console.error(`Failed disconnect from ${device_id}:`, error);
      return { status: 200, message: 'Success' };
    }
  },

  keyEventADB: async ({ device_id, key_event }) => {
    console.log(`Key Event ${key_event}`);
    await client.shell(device_id, `input keyevent ${key_event}`);
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  backHomeADB: async ({ device_id }) => {
    console.log('Trở về Home');
    await client.shell(device_id, `input keyevent KEYCODE_HOME`);
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  unlockScreenADB: async ({ device_id, text }) => {
    console.log('Mở khóa màn hình thiết bị');
    await client.shell(device_id, `input keyevent 26`);
    await delay(300);
    await client.shell(device_id, `input swipe 500 1500 500 500`);
    await delay(800);
    await client.shell(device_id, `input text ${text}`);
    await delay(600);
    await client.shell(device_id, `input keyevent 66`);
    return { status: 200, message: 'Success' };
  },

  sendFile: async (device_id, localPath, devicePath) => {
    await client.push(device_id, localPath, devicePath);
    await delay(500);
    await client.shell(device_id, `am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file://${devicePath}`);
    await delay(100);
    return { status: 200, message: 'Success' };
  },

  delADBImg: async ({ device_id }) => {
    const devicePaths = [
      "/sdcard/",
      "/sdcard/DCIM/Camera/",
      "/sdcard/DCIM/",
      "/sdcard/DCIM/Screenshots/",
      "/sdcard/Pictures/",
      "/sdcard/Pictures/Download/",
      "/sdcard/Pictures/Download/",
      "/sdcard/Android/.Trash/com.sec.android.gallery3d/"
    ];

    try {
      for (const devicePath of devicePaths) {
        console.log(`Processing path: ${devicePath}`);
        const listCommand = `ls ${devicePath} | grep -E '\\.(png|jpg)$'`;
        const files = await client.shell(device_id, listCommand).then(adb.util.readAll);
        const fileList = files.toString().trim().split('\n');

        if (fileList.length === 0 || (fileList.length === 1 && fileList[0] === '')) {
          console.log(`No files to delete in ${devicePath}.`);
          continue; // Skip to the next path
        }

        const deleteCommands = fileList.map(file => `rm '${devicePath}${file}'`).join(' && ');
        console.log(`Delete command for ${devicePath}:`, deleteCommands);

        await client.shell(device_id, deleteCommands);

        // Trigger a media scanner update
        await delay(100);
        await client.shell(device_id, `am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file://${devicePath}`);
        // android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file:///storage/emulated/0/
        await client.shell(device_id, `am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file:///storage/emulated/0/`);
      }

      console.log('Deleted images successfully!');
      return { status: 200, message: 'Success' };
    } catch (error) {
      console.error('Error deleting images:', error);
      return { status: 500, message: 'Error deleting images', error };
    }
  },

  delImg: async (device_id, devicePath, filename = '') => {
    const listCommand = `ls ${devicePath} | grep -E '${filename}\\.(png|jpg)$'`;
    client.shell(device_id, listCommand)
      .then(adb.util.readAll)
      .then((files) => {
        const fileList = files.toString().trim().split('\n');
        if (fileList.length === 0) {
          return;
        }
        const deleteCommands = fileList.map(file => `rm '${devicePath}${file}'`).join(' && ');
        return client.shell(device_id, deleteCommands);
      })
    await delay(100);
    client.shell(device_id, `am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file://${devicePath}`);
    return { status: 200, message: 'Success' };
  }
};

const percentSize = (percent, screenSize) => {
  return ((screenSize * percent) / 100).toFixed(0);
};

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

const getIp = async (device_id, type) => {
  try {
    const output = await client.shell(device_id, 'ip addr show ' + type); // wlan0 tune0
    const result = await adb.util.readAll(output);

    const ipMatch = result.toString().match(/inet\s+(\d+\.\d+\.\d+\.\d+)/);
    const ipAddress = ipMatch ? ipMatch[1] : 'IP not found';

    console.log(`${device_id} IP: ${ipAddress}`);
    return ipAddress;
  } catch (error) {
    console.error(`Error IP ${device_id}:`, error);
  }
}