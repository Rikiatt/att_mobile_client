const adb = require('adbkit');
const fs = require('fs');
const path = require('path');
const { delay } = require('../helpers/functionHelper');
const { escapeSpecialChars, removeVietnameseStr } = require('../utils/string.util');

const adbPath = path.join(__dirname, '../platform-tools', 'adb.exe');
const client = adb.createClient({ bin: adbPath });

const coordinatesLoginVTB = require('../config/coordinatesLoginVTB.json');
const coordinatesScanQRVTB = require('../config/coordinatesScanQRVTB.json');
const coordinatesScanQRBIDV = require('../config/coordinatesScanQRBIDV.json');

const adbHelper = require('../helpers/adbHelper');
const deviceHelper = require('../helpers/deviceHelper');

module.exports = {
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

  clickConfirmADBVTB: async ({ device_id }) => {    
    const coordinatesScanQRVTB = await loadCoordinatesForDeviceScanQRVTB(device_id);
    
    await adbHelper.tapADBVTB(device_id, ...coordinatesScanQRVTB['Confirm']);      

    return { status: 200, message: 'Success' };
  },

  clickScanQRADBVTB: async ({ device_id }) => {    
    const coordinatesScanQRVTB = await loadCoordinatesForDeviceScanQRVTB(device_id);
    
    await adbHelper.tapADBVTB(device_id, ...coordinatesScanQRVTB['Select-ScanQR']);      

    return { status: 200, message: 'Success' };
  },

  clickSelectImageADBVTB: async ({ device_id }) => {    
    const coordinatesScanQRVTB = await loadCoordinatesForDeviceScanQRVTB(device_id);
        
    await adbHelper.tapADBVTB(device_id, ...coordinatesScanQRVTB['Select-ScanQR']); 
    await sleep(500); 
    await adbHelper.tapADBVTB(device_id, ...coordinatesScanQRVTB['Select-Image']);  
    await sleep(500);   
    await adbHelper.tapADBVTB(device_id, ...coordinatesScanQRVTB['Select-Image-2']);  

    return { status: 200, message: 'Success' };
  },

  clickScanQRADBBIDV: async ({ device_id }) => {    
    const coordinatesScanQRBIDV = await loadCoordinatesForDeviceScanQRBIDV(device_id);
    
    await adbHelper.tapADBBIDV(device_id, ...coordinatesScanQRBIDV['ScanQR']);      

    return { status: 200, message: 'Success' };
  },

  clickSelectImageADBBIDV: async ({ device_id }) => {    
    const coordinatesScanQRBIDV = await loadCoordinatesForDeviceScanQRBIDV(device_id);
     
    await adbHelper.tapADBBIDV(device_id, ...coordinatesScanQRBIDV['Select-Image']);    

    return { status: 200, message: 'Success' };
  },

  clickConfirmADBBIDV: async ({ device_id }) => {    
    const coordinatesScanQRBIDV = await loadCoordinatesForDeviceScanQRBIDV(device_id);
    // const button = 'Confirm';    
    await adbHelper.tapADBBIDV(device_id, ...coordinatesScanQRBIDV['Confirm']);

    return { status: 200, message: 'Success' };
  },

  stopAppADBBIDV: async ({ device_id }) => {    
    await client.shell(device_id, 'am force-stop com.vnpay.bidv');
    console.log('App BIDV has been stopped');
    await delay(200);
    return { status: 200, message: 'Success' };
  },

  startAppADBBIDV: async ({ device_id }) => {
    console.log('Starting App BIDV...');
    await client.shell(device_id, 'monkey -p com.vnpay.bidv -c android.intent.category.LAUNCHER 1');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  stopAppADBMB: async ({ device_id }) => {    
    await client.shell(device_id, 'am force-stop com.mbmobile');
    console.log('App MB has been stopped');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  startAppADBMB: async ({ device_id }) => {
    console.log('Starting App MB...');
    await client.shell(device_id, 'monkey -p com.mbmobile -c android.intent.category.LAUNCHER 1');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  stopAppADBVCB: async ({ device_id }) => {    
    await client.shell(device_id, 'am force-stop com.VCB');
    console.log('App VCB has been stopped');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  startAppADBVCB: async ({ device_id }) => {
    console.log('Starting App VCB...');
    await client.shell(device_id, 'monkey -p com.VCB -c android.intent.category.LAUNCHER 1');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  stopAppADBVTB: async ({ device_id }) => {    
    await client.shell(device_id, 'am force-stop com.vietinbank.ipay');
    console.log('App VietinBank iPay has been stopped');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  startAppADBVTB: async ({ device_id }) => {
    console.log('Starting App VietinBank iPay...');
    await client.shell(device_id, 'monkey -p com.vietinbank.ipay -c android.intent.category.LAUNCHER 1');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  stopAppADBSHB: async ({ device_id }) => {    
    await client.shell(device_id, 'am force-stop vn.shb.mbanking');
    console.log('App SHB Mobile has been stopped');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  startAppADBSHB: async ({ device_id }) => {
    console.log('Starting App SHB Mobile...');
    await client.shell(device_id, 'monkey -p vn.shb.mbanking -c android.intent.category.LAUNCHER 1');
    await delay(500);
    return { status: 200, message: 'Success' };
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
    // for (const char of text) {
    //   const charRegex = escapeSpecialChars(char);
    //   console.log(`Nhập::[${char}]`);
    //   await client.shell(device_id, `input text ${charRegex}`);
    //   await delay(100);
    // }
    await delay(1000);
    return { status: 200, message: 'Success' };
  },

  checkDeviceBIDV: async ({ device_id }) => {
    try {
      const deviceModel = await deviceHelper.getDeviceModel(device_id);      
  
      const deviceCoordinates = coordinatesScanQRBIDV[deviceModel];             
      
      if (deviceCoordinates == undefined) {        
        console.log(`No coordinatesScanQRBIDV found for device model: ${deviceModel}`);
        return { status: 500, valid: false, message: 'Thiết bị chưa hỗ trợ' };    
      }
  
      return deviceCoordinates;
    } catch (error) {
      console.error(`Error checking device: ${error.message}`);
      throw error;
    }
  },

  checkDeviceVTB: async ({ device_id }) => {
    try {
      const deviceModel = await deviceHelper.getDeviceModel(device_id);      
  
      const deviceCoordinates = coordinatesLoginVTB[deviceModel];             
      
      if (deviceCoordinates == undefined) {        
        console.log(`No coordinatesLoginVTB found for device model: ${deviceModel}`);
        return { status: 500, valid: false, message: 'Thiết bị chưa hỗ trợ' };    
      }
  
      return deviceCoordinates;
    } catch (error) {
      console.error(`Error checking device: ${error.message}`);
      throw error;
    }
  },

  checkDeviceFHD: async ({ device_id }) => {
    try {      
      const deviceModel = await deviceHelper.getDeviceModel(device_id);
      console.log(`Device model: ${deviceModel}`);

      // Kiểm tra nếu model là 'SM-N960N' (Galaxy Note9)
      if (deviceModel === 'SM-N960') {
        console.log('Model is SM-N960, checking FHD+ mode...');
        const isFHD = await deviceHelper.checkDeviceFHD(device_id);

        if (!isFHD) {
          console.log('Thiết bị chưa cài đặt ở chế độ FHD+');
          return { status: 500, valid: false, message: 'Thiết bị chưa cài đặt ở chế độ FHD+' };
        }

        console.log('Thiết bị đang ở chế độ FHD+');
        return { status: 200, valid: true, message: 'Thiết bị đang ở chế độ FHD+' };
      } else {
        console.log(`Model ${deviceModel} không cần kiểm tra FHD+.`);
        return { status: 200, valid: true, message: 'Thiết bị không yêu cầu kiểm tra FHD+' };
      }
    } catch (error) {
      console.error(`Error checking device FHD+: ${error.message}`);
      throw error;
    }
  },

  inputPINADBVTB: async ({ device_id, text }) => {  
    const coordinatesScanQRVTB = await loadCoordinatesForDeviceScanQRVTB(device_id);
        
    for (const char of text) {
      await adbHelper.tapADBVTB(device_id, ...coordinatesScanQRVTB[char]);
      console.log('Log char of text:', char);
    }  

    return { status: 200, message: 'Success' };
  },

  inputADBVTB: async ({ device_id, text }) => {  
    const coordinatesLoginVTB = await loadCoordinatesForDeviceLoginVTB(device_id);
        
    for (const char of text) {
      if (isUpperCase(char)) {
          await adbHelper.tapADBVTB(device_id, ...coordinatesLoginVTB['CapsLock']);
          await sleep(50); 
          await adbHelper.tapADBVTB(device_id, ...coordinatesLoginVTB[char]);
          console.log('log ...coordinatesLoginVTB[char]', ...coordinatesLoginVTB[char]);    
          await sleep(50);
      }
      else if (isSpecialChar(char)) {
          await adbHelper.tapADBVTB(device_id, ...coordinatesLoginVTB['!#1']);
          await sleep(50); 
          await adbHelper.tapADBVTB(device_id, ...coordinatesLoginVTB[char]);
          console.log('log ...coordinatesLoginVTB[char]', ...coordinatesLoginVTB[char]);    
          await sleep(50); 
          await adbHelper.tapADBVTB(device_id, ...coordinatesLoginVTB['ABC']);
      }        
      else {
          await adbHelper.tapADBVTB(device_id, ...coordinatesLoginVTB[char.toLowerCase()]);
          console.log('log ...coordinatesLoginVTB[char]', ...coordinatesLoginVTB[char]);    
      }
              
      await sleep(50); 
    }
    return { status: 200, message: 'Success' };
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

  sendFile: async (device_id, localPath, devicePath) => {
    await client.push(device_id, localPath, devicePath);
    await delay(500);
    await client.shell(device_id, `am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file://${devicePath}`);
    await delay(100);
    return { status: 200, message: 'Success' };
  },

  // delImg: async (device_id, devicePath, filename = '') => {
  delImg: async ( { device_id, devicePath = "/sdcard/DCIM/Camera/" } ) => {
    try{
      // const date = new Date();
      // const year = date.getFullYear();
      // const month = String(date.getMonth() + 1).padStart(2, '0');
      // const day = String(date.getDate()).padStart(2, '0');
      // const hours = String(date.getHours()).padStart(2, '0');
      // const minutes = String(date.getMinutes()).padStart(2, '0');
      // const seconds = String(date.getSeconds()).padStart(2, '0');
      // filename = `${year}${month}${day}_${hours}${minutes}${seconds}`;
      // console.log('Log filename:', filename);

      // Generate the filename prefix
      // const filenamePrefix = `${year}${month}${day}_`;

      // const listCommand = `ls ${devicePath} | grep -E '${filename}\\.(png|jpg)$'`;
      // const listCommand = `ls ${devicePath} | grep -E '^${filenamePrefix}[0-9]{6}\\.(png|jpg)$'`;
      const listCommand = `ls ${devicePath} | grep -E '\\.(png|jpg)$'`;            
      const files = await client.shell(device_id, listCommand).then(adb.util.readAll);
      const fileList = files.toString().trim().split('\n');

      if (fileList.length === 0 || (fileList.length === 1 && fileList[0] === '')) {
        console.log('No files to delete.');
        return { status: 404, message: 'No files to delete' };
      }

      const deleteCommands = fileList.map(file => `rm '${devicePath}${file}'`).join(' && ');
      console.log('Delete command:', deleteCommands);

      await client.shell(device_id, deleteCommands);

      // client.shell(device_id, listCommand)
      //   .then(adb.util.readAll)
      //   .then((files) => {
      //     const fileList = files.toString().trim().split('\n');
      //     if (fileList.length === 0) {
      //       console.log('No files to delete.');
      //       return;
      //     }
      //     const deleteCommands = fileList.map(file => `rm '${devicePath}${file}'`).join(' && ');
      //     return client.shell(device_id, deleteCommands);
      //   })
      await delay(100);
      client.shell(device_id, `am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file://${devicePath}`);

      console.log('Deleted image successfully!');
      return { status: 200, message: 'Success' };
    } catch (error) {
      console.error('Error deleting images:', error);
      return { status: 500, message: 'Error deleting images', error };
    }
  }
};

async function loadCoordinatesForDeviceScanQRBIDV(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);
    console.log('deviceModel now:', deviceModel);

    const deviceCoordinates = coordinatesScanQRBIDV[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRBIDV for device: ${error.message}`);
    throw error; // Re-throw error for the caller to handle
  }
};

async function loadCoordinatesForDeviceScanQRVTB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);
    console.log('deviceModel now:', deviceModel);

    const deviceCoordinates = coordinatesScanQRVTB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRVTB for device: ${error.message}`);
    throw error; // Re-throw error for the caller to handle
  }
};

// Dùng cho inputADBVTB bên trên
async function loadCoordinatesForDeviceLoginVTB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);
    console.log('deviceModel now:', deviceModel);

    const deviceCoordinates = coordinatesLoginVTB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesLoginVTB for device: ${error.message}`);
    throw error; // Re-throw error for the caller to handle
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isSpecialChar = (char) => {
  return ['@', '#', '$', '%', '&', '*', '-', '+', '(', ')', 
          '~', '^', '<', '>', '|', '\\', '{', '}', '[', ']', 
          '=', '!', '"', "'", ':', ';', '/', '?'].includes(char);
};

const isUpperCase = (char) => {
  return char === char.toUpperCase() && char !== char.toLowerCase();
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