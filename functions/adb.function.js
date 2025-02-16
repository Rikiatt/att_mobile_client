require('dotenv').config();
const adb = require('adbkit');
const fs = require('fs');
const path = require('path');
const { delay } = require('../helpers/functionHelper');
const { escapeSpecialChars, removeVietnameseStr } = require('../utils/string.util');

const adbPath = path.join(__dirname, '../platform-tools', 'adb.exe');
const client = adb.createClient({ bin: adbPath });

const coordinatesLoginVTB = require('../config/coordinatesLoginVTB.json');
const coordinatesLoginNAB = require('../config/coordinatesLoginNAB.json');
const coordinatesScanQRNAB = require('../config/coordinatesScanQRNAB.json');
const coordinatesScanQRMB = require('../config/coordinatesScanQRMB.json');
const coordinatesScanQRNCB = require('../config/coordinatesScanQRNCB.json');
const coordinatesScanQRMSB = require('../config/coordinatesScanQRMSB.json');
const coordinatesScanQRVTB = require('../config/coordinatesScanQRVTB.json');
const coordinatesScanQRBIDV = require('../config/coordinatesScanQRBIDV.json');
const coordinatesScanQROCB = require('../config/coordinatesScanQROCB.json');
const coordinatesScanQRBAB = require('../config/coordinatesScanQRBAB.json');
const coordinatesLoginBAB = require('../config/coordinatesLoginBAB.json');

const adbHelper = require('../helpers/adbHelper');
const deviceHelper = require('../helpers/deviceHelper');

const ensureDirectoryExists = ( dirPath ) => {
  if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
  }
}

const { isMbAppRunning } = require('../functions/checkAppBankStatus');
const { isOpenBankingAppRunning } = require('../functions/checkAppBankStatus');

const { qrDevicePath, filename } = require('../functions/endpoint');

async function clearTempFile( { device_id } ) {
  try {      
      console.log('log device_id in clearTempFile: ', device_id);
      await client.shell(device_id, `rm /sdcard/temp_dump.xml`);
      await delay(1000);
      console.log('Clear temp file successfully!');
  } catch (error) {
      console.error("Cannot delete file temp_dump.xml:", error.message);
  }
}

async function dumpXmlToLocal ( device_id, localPath ) {
  try {      
      console.log('log device_id in dumpXmlToLocal: ', device_id);
      const tempPath = `/sdcard/temp_dump.xml`;
      
      await client.shell(device_id, `uiautomator dump ${tempPath}`);
      console.log(`XML dump saved temporarily to device as ${tempPath}`);       
      
      await client.pull( device_id , tempPath)
          .then(stream => new Promise((resolve, reject) => {
              const fileStream = fs.createWriteStream(localPath);
              stream.pipe(fileStream);
              fileStream.on('finish', resolve);
              fileStream.on('error', reject);
          }));
      console.log(`XML dump pulled directly to local: ${localPath}`);
  } catch (error) {
      console.error(`Error during XML dump to local. ${error.message}`);
  }
}

const checkXmlContentMB = (localPath) => {
  try {
    const content = fs.readFileSync(localPath, "utf-8");
    
    const keywordsVI = [
      "Số tài&#10;khoản",
      "Số&#10;điện thoại",
      "&#10;Số thẻ",
      "Truy vấn giao dịch giá trị lớn",
      "Đối tác MB",
      "Chuyển tiền"
    ];
    
    const keywordsEN = [
      "Account",
      "Phone number",
      "Card",
      "Large-value transaction inquiry",
      "MB partner",
      "Transfer"
    ];

    // Kiểm tra xem có đủ tất cả các từ khóa trong một bộ ngôn ngữ không
    const foundVI = keywordsVI.every(kw => content.includes(kw));
    const foundEN = keywordsEN.every(kw => content.includes(kw));

    return foundVI || foundEN;
  } catch (error) {
    console.error("❌ Lỗi khi đọc XML:", error.message);
    return false;
  }
};

const checkXmlContentNAB = (localPath) => {
  try {
    const content = fs.readFileSync(localPath, "utf-8");
    
    const keywordsVI = [
      "Tài khoản",
      "Thẻ",
      "Quét QR",
      "Chuyển tiền quốc tế",
      "Danh bạ người nhận",
      "Danh sách lịch chuyển tiền",
      "Chuyển tiền gần đây"
    ];
    
    const keywordsEN = [
      "Money transfer",
      "Account",
      "Card",
      "QR code",
      "International payments"
    ];
    
    // Kiểm tra xem có đủ tất cả các từ khóa trong một bộ ngôn ngữ không
    const foundVI = keywordsVI.every(kw => content.includes(kw));
    const foundEN = keywordsEN.every(kw => content.includes(kw));

    return foundVI || foundEN;
  } catch (error) {
    console.error("❌ Lỗi khi đọc XML:", error.message);
    return false;
  }
};

async function stopNABApp ({ device_id }) {    
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop ops.namabank.com.vn');
  console.log('App NAB has been stopped');
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopMBApp ({ device_id }) {    
  await client.shell(device_id, 'am force-stop com.mbmobile');
  console.log('App MB has been stopped');
  await delay(500);
  return { status: 200, message: 'Success' };
}

const { sendTelegramAlert } = require('../services/telegramService');
const { saveAlertToDatabase } = require('../controllers/alert.controller');

module.exports = {
  trackOCBApp : async ( { device_id } ) => {
    const targetDir = path.join('C:\\att_mobile_client\\logs\\');
    ensureDirectoryExists(targetDir);

    console.log('🔍 Bắt đầu theo dõi NAB App...');
    
    const chatId = '7098096854';
    const telegramToken = '7884594856:AAEKZXIBH2IaROGR_k6Q49IP2kSt8uJ4wE0';

    if (!chatId) {
      console.error("Cannot continue cause of invalid chat ID.");
      return;
    } 

    let running = await isOpenBankingAppRunning( { device_id } );

    if (!running) {
        console.log("App NAB is not running.");
        return;
    }
        
    await clearTempFile( { device_id } );
    
    while (running) {
        console.log('App NAB is in process');
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const localPath = path.join(targetDir, `${timestamp}.xml`);
    
        await dumpXmlToLocal( device_id, localPath );
            
        if (checkXmlContentNAB( localPath )) {    
          console.log('Stop NAB app');
          await stopNABApp ( { device_id } );          

          await sendTelegramAlert(
            telegramToken,
            chatId,
            `🚨 Cảnh báo! Phát hiện nội dung cấm trên thiết bị ${device_id}`);

            await saveAlertToDatabase({
              timestamp: new Date().toISOString(),
              reason: 'Detected sensitive content',
              filePath: localPath 
            });

            return false;
        }
    
        running = await isOpenBankingAppRunning( { device_id } );
    
        if (!running) {            
          console.log('🚫 App NAB đã tắt. Dừng theo dõi.');
          await clearTempFile( { device_id } );      
          return false;          
        }
    }
  },

  trackNABApp : async ( { device_id } ) => {
    const targetDir = path.join('C:\\att_mobile_client\\logs\\');
    ensureDirectoryExists(targetDir);

    console.log('🔍 Bắt đầu theo dõi NAB App...');
    
    const chatId = '7098096854';
    const telegramToken = '7884594856:AAEKZXIBH2IaROGR_k6Q49IP2kSt8uJ4wE0';

    if (!chatId) {
      console.error("Cannot continue cause of invalid chat ID.");
      return;
    } 

    let running = await isOpenBankingAppRunning( { device_id } );

    if (!running) {
      console.log("App NAB is not running.");
      return;
    }
        
    await clearTempFile( { device_id } );
    
    while (running) {
      console.log('App NAB is in process');
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);
    
      await dumpXmlToLocal( device_id, localPath );
            
      if (checkXmlContentNAB( localPath )) {    
        // console.log('Stop NAB app');
        await stopNABApp ( { device_id } );          

        await sendTelegramAlert(
          telegramToken,
          chatId,
          `🚨 Cảnh báo! Phát hiện nội dung cấm trên thiết bị ${device_id}`);

          await saveAlertToDatabase({
            timestamp: new Date().toISOString(),
            reason: 'Detected sensitive content',
            filePath: localPath 
          });

          return false;
      }
    
      running = await isOpenBankingAppRunning( { device_id } );
    
      if (!running) {            
        console.log('🚫 App NAB đã tắt. Dừng theo dõi.');
        await clearTempFile( { device_id } );      
        return false;          
      }
    }
  },

  trackMBApp : async ( { device_id } ) => {
    const targetDir = path.join('C:\\att_mobile_client\\logs\\');
    ensureDirectoryExists(targetDir);

    console.log('🔍 Bắt đầu theo dõi MB Bank App...');
    
    const chatId = '7098096854';
    const telegramToken = '7884594856:AAEKZXIBH2IaROGR_k6Q49IP2kSt8uJ4wE0';

    if (!chatId) {
      console.error("Cannot continue cause of invalid chat ID.");
      return;
    } 

    let running = await isMbAppRunning( { device_id } );

    if (!running) {
        console.log("App MB Bank is not running.");
        return;
    }
        
    await clearTempFile( { device_id } );
    
    while (running) {
        console.log('App MB Bank is in process');
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const localPath = path.join(targetDir, `${timestamp}.xml`);
    
        await dumpXmlToLocal( device_id, localPath );
            
        if (checkXmlContentMB( localPath )) {    
          // console.log('Stop MB Bank app');
          await stopMBApp ( { device_id } );          

          await sendTelegramAlert(
            telegramToken,
            chatId,
            `🚨 Cảnh báo! Phát hiện nội dung cấm trên thiết bị ${device_id}`);

            await saveAlertToDatabase({
              timestamp: new Date().toISOString(),
              reason: 'Detected sensitive content',
              filePath: localPath 
            });

            return false;
        }
    
        running = await isMbAppRunning( { device_id } );
    
        if (!running) {            
          console.log('🚫 App MB Bank đã tắt. Dừng theo dõi.');
          await clearTempFile( { device_id } );      
          return false;          
        }
    }
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

  clickConfirmVTB: async ({ device_id }) => {    
    const coordinatesScanQRVTB = await loadCoordinatesForDeviceScanQRVTB(device_id);
    
    await adbHelper.tapADBVTB(device_id, ...coordinatesScanQRVTB['Confirm']);      

    return { status: 200, message: 'Success' };
  },

  clickScanQRMB: async ({ device_id }) => {    
    const coordinatesScanQRMB = await loadCoordinatesForDeviceScanQRMB(device_id);
    
    await adbHelper.tapADBMB(device_id, ...coordinatesScanQRMB['Select-ScanQR']);      

    return { status: 200, message: 'Success' };
  }, 
  
  clickScanQRMSB: async ({ device_id }) => {    
    const coordinatesScanQRMSB = await loadCoordinatesForDeviceScanQRMSB(device_id);
    
    await adbHelper.tapADBMSB(device_id, ...coordinatesScanQRMSB['ScanQR']);      

    return { status: 200, message: 'Success' };
  },

  clickSelectImageMB: async ({ device_id }) => {    
    const coordinatesScanQRMB = await loadCoordinatesForDeviceScanQRMB(device_id);
    
    await adbHelper.tapADBMB(device_id, ...coordinatesScanQRMB['Select-Image']);
    await delay(800);                  
    await adbHelper.tapADBMB(device_id, ...coordinatesScanQRMB['Select-Hamburgur-Menu']);           
    await delay(800); 
    await adbHelper.tapADBMB(device_id, ...coordinatesScanQRMB['Select-Galaxy-Note9']); 
    await delay(800);
    await client.shell(device_id, `input swipe 500 1800 500 300`);
    await delay(800); 
    await adbHelper.tapADBMB(device_id, ...coordinatesScanQRMB['Select-Target-Img']); 
    await delay(800); 
    // await adbHelper.tapADBMB(device_id, ...coordinatesScanQRMB['Finish']); 

    return { status: 200, message: 'Success' };
  },

  clickSelectImageNCB: async ({ device_id }) => {    
    const coordinatesScanQRNCB = await loadCoordinatesForDeviceScanQRNCB(device_id);
    
    await adbHelper.tapADBNCB(device_id, ...coordinatesScanQRNCB['Select-Image']);        
    await delay(800); 
    await adbHelper.tapADBNCB(device_id, ...coordinatesScanQRNCB['Select-Target-Img']); 
    await delay(800); 
    await adbHelper.tapADBNCB(device_id, ...coordinatesScanQRNCB['Finish']); 

    return { status: 200, message: 'Success' };
  },

  clickSelectImageMSB: async ({ device_id }) => {    
    const coordinatesScanQRMSB = await loadCoordinatesForDeviceScanQRMSB(device_id);
    
    await adbHelper.tapADBMB(device_id, ...coordinatesScanQRMSB['Select-Image']);
    await delay(800);                  
    await adbHelper.tapADBMB(device_id, ...coordinatesScanQRMSB['Select-Hamburgur-Menu']);           
    await delay(800); 
    await adbHelper.tapADBMB(device_id, ...coordinatesScanQRMSB['Select-Galaxy-Note9']); 
    await delay(800);
    await client.shell(device_id, `input swipe 500 1800 500 300`);
    await delay(800); 
    await adbHelper.tapADBMB(device_id, ...coordinatesScanQRMSB['Select-Target-Img']); 
    await delay(800); 
    await adbHelper.tapADBMB(device_id, ...coordinatesScanQRMSB['Finish']); 

    return { status: 200, message: 'Success' };
  },

  clickConfirmMB: async ({ device_id }) => {    
    const coordinatesScanQRMB = await loadCoordinatesForDeviceScanQRMB(device_id);
    
    await adbHelper.tapADBMB(device_id, ...coordinatesScanQRMB['Confirm']);      

    return { status: 200, message: 'Success' };
  },

  clickScanQRNCB: async ({ device_id }) => {    
    const coordinatesScanQRNCB = await loadCoordinatesForDeviceScanQRNCB(device_id);
    
    await adbHelper.tapADBNCB(device_id, ...coordinatesScanQRNCB['Select-ScanQR']);      

    return { status: 200, message: 'Success' };
  },

  clickLoginBAB: async ({ device_id }) => {    
    const coordinatesLoginBAB = await loadCoordinatesForDeviceLoginBAB(device_id);
    
    await adbHelper.tapADBBAB(device_id, ...coordinatesLoginBAB['Login']);      

    return { status: 200, message: 'Success' };
  },

  clickLoginNAB: async ({ device_id }) => {    
    const coordinatesLoginNAB = await loadCoordinatesForDeviceLoginNAB(device_id);
    
    await adbHelper.tapADBBAB(device_id, ...coordinatesLoginNAB['Login']);      

    return { status: 200, message: 'Success' };
  },

  clickScanQRNAB: async ({ device_id }) => {    
    const coordinatesScanQRNAB = await loadCoordinatesForDeviceScanQRNAB(device_id);
    
    await adbHelper.tapADBNAB(device_id, ...coordinatesScanQRNAB['Select-ScanQR']);      

    return { status: 200, message: 'Success' };
  },

  clickScanQRBAB: async ({ device_id }) => {    
    const coordinatesScanQRBAB = await loadCoordinatesForDeviceScanQRBAB(device_id);
    
    await adbHelper.tapADBBAB(device_id, ...coordinatesScanQRBAB['Select-ScanQR']);      

    return { status: 200, message: 'Success' };
  },

  copyQRImages : async ({ device_id }) => {
    console.log('log qrDevicePath in copyQRImages:', qrDevicePath);
    
    if (!qrDevicePath) {
      console.error("❌ Cannot find the directory of QR!");
      return;
    }

    console.log('log filename in copyQRImages:', filename);
    const sourcePath = qrDevicePath;
    const destinationDir = `/sdcard/`;

    console.log(`Copying img from ${sourcePath} in device: ${device_id}...`);

    for (let i = 1; i <= 20; i++) {
      const destinationPath = `${destinationDir}${filename}_copy_${i}.jpg`;

      try {
        await client.shell(device_id, `cp ${sourcePath} ${destinationPath}`);
        console.log(`✅ Copied img to: ${destinationPath}`);
      } catch (error) {
        console.error(`❌ Got an error when copying img ${destinationPath}: ${error}`);
      }
    }

    return { status: 200, message: 'Success' };
  },

  clickScanQROCB: async ({ device_id }) => {    
    const coordinatesScanQROCB = await loadCoordinatesForDeviceScanQROCB(device_id);
    
    await adbHelper.tapADBOCB(device_id, ...coordinatesScanQROCB['Select-ScanQR']);      

    return { status: 200, message: 'Success' };
  },

  clickSelectImageNAB: async ({ device_id }) => {    
    const coordinatesScanQRNAB = await loadCoordinatesForDeviceScanQRNAB(device_id);
    
    await adbHelper.tapADBNAB(device_id, ...coordinatesScanQRNAB['Select-Image']);           
    await delay(800);
    await adbHelper.tapADBNAB(device_id, ...coordinatesScanQRNAB['Select-Hamburgur-Menu']);           
    await delay(800); 
    await adbHelper.tapADBNAB(device_id, ...coordinatesScanQRNAB['Select-Files']);  
    await delay(800); 
    await client.shell(device_id, `input swipe 500 1800 500 300`);
    await delay(800);   
    await adbHelper.tapADBNAB(device_id, ...coordinatesScanQRNAB['Select-Target-Img']);  
    await delay(800);   
    await adbHelper.tapADBNAB(device_id, ...coordinatesScanQRNAB['Finish']);

    return { status: 200, message: 'Success' };
  },

  clickSelectImageBAB: async ({ device_id }) => {    
    const coordinatesScanQRBAB = await loadCoordinatesForDeviceScanQRBAB(device_id);
    
    await adbHelper.tapADBBAB(device_id, ...coordinatesScanQRBAB['Select-Image']);     

    return { status: 200, message: 'Success' };
  },

  clickSelectImageOCB: async ({ device_id }) => {    
    const coordinatesScanQROCB = await loadCoordinatesForDeviceScanQROCB(device_id);
    
    await adbHelper.tapADBOCB(device_id, ...coordinatesScanQROCB['Select-Image']);           
    await delay(800);
    await adbHelper.tapADBOCB(device_id, ...coordinatesScanQROCB['Select-Hamburgur-Menu']);           
    await delay(800); 
    await adbHelper.tapADBOCB(device_id, ...coordinatesScanQROCB['Select-Galaxy-Note9']);  
    await delay(800); 

    await client.shell(device_id, `input swipe 500 1800 500 300`);
    await delay(800);   
    await client.shell(device_id, `input swipe 500 1800 500 300`);
    await delay(800);   
    await adbHelper.tapADBOCB(device_id, ...coordinatesScanQROCB['Select-Target-Img']);  
    await delay(800);   
    await adbHelper.tapADBOCB(device_id, ...coordinatesScanQROCB['Finish']);        

    return { status: 200, message: 'Success' };
  },

  clickConfirmOCB: async ({ device_id }) => {    
    const coordinatesScanQROCB = await loadCoordinatesForDeviceScanQROCB(device_id);
    
    await adbHelper.tapADBOCB(device_id, ...coordinatesScanQROCB['Confirm']);      

    return { status: 200, message: 'Success' };
  },

  clickConfirmBIDV: async ({ device_id }) => {  
    const coordinatesScanQRBIDV = await loadCoordinatesForDeviceScanQRBIDV(device_id);
          
    await adbHelper.tapADBBIDV(device_id, ...coordinatesScanQRBIDV['Confirm']); 
  
    return { status: 200, message: 'Success' };
  },

  clickScanQRVTB: async ({ device_id }) => {    
    const coordinatesScanQRVTB = await loadCoordinatesForDeviceScanQRVTB(device_id);
    
    await adbHelper.tapADBVTB(device_id, ...coordinatesScanQRVTB['Select-ScanQR']);      

    return { status: 200, message: 'Success' };
  },

  clickSelectImageVTB: async ({ device_id }) => {    
    const coordinatesScanQRVTB = await loadCoordinatesForDeviceScanQRVTB(device_id);
        
    await adbHelper.tapADBVTB(device_id, ...coordinatesScanQRVTB['Select-ScanQR']); 
    await sleep(10000); 
    await adbHelper.tapADBVTB(device_id, ...coordinatesScanQRVTB['Select-Image']);  
    await sleep(2000);   
    // await adbHelper.tapADBVTB(device_id, ...coordinatesScanQRVTB['Select-Image-2']);  

    return { status: 200, message: 'Success' };
  },

  clickConfirmScanFaceBIDV: async ({ device_id }) => {    
    const coordinatesScanQRBIDV = await loadCoordinatesForDeviceScanQRBIDV(device_id);

    await adbHelper.tapADBBIDV(device_id, ...coordinatesScanQRBIDV['Confirm']);

    return { status: 200, message: 'Success' };
  },

  clickScanQRBIDV: async ({ device_id }) => {    
    const coordinatesScanQRBIDV = await loadCoordinatesForDeviceScanQRBIDV(device_id);
    
    await adbHelper.tapADBBIDV(device_id, ...coordinatesScanQRBIDV['ScanQR']);      

    return { status: 200, message: 'Success' };
  },

  clickSelectImageBIDV: async ({ device_id }) => {    
    const coordinatesScanQRBIDV = await loadCoordinatesForDeviceScanQRBIDV(device_id);
     
    await adbHelper.tapADBBIDV(device_id, ...coordinatesScanQRBIDV['Select-Image']);    

    return { status: 200, message: 'Success' };
  }, 

  stopAppADBBAB: async ({ device_id }) => {   
    await client.shell(device_id, 'input keyevent 3'); 
    await client.shell(device_id, 'am force-stop com.bab.retailUAT');
    console.log('App Bac A Bank has been stopped');
    await delay(200);
    return { status: 200, message: 'Success' };
  },

  startAppADBBAB: async ({ device_id }) => {    
    await client.shell(device_id, 'am start -n com.bab.retailUAT/.MainActivity');
    console.log('App Bac A Bank has been stopped');
    await delay(200);
    return { status: 200, message: 'Success' };
  },

  stopAppADBOCB: async ({ device_id }) => {    
    await client.shell(device_id, 'input keyevent 3');
    await client.shell(device_id, 'am force-stop vn.com.ocb.awe');
    console.log('App OCB OMNI has been stopped');
    await delay(200);
    return { status: 200, message: 'Success' };
  },

  startAppADBOCB: async ({ device_id }) => {    
    await client.shell(device_id, 'monkey -p vn.com.ocb.awe -c android.intent.category.LAUNCHER 1');
    console.log('App OCB OMNI has been stopped');
    await delay(200);
    return { status: 200, message: 'Success' };
  },

  stopAppADBBIDV: async ({ device_id }) => {    
    await client.shell(device_id, 'input keyevent 3');
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

  stopAppADBNAB: async ({ device_id }) => {    
    await client.shell(device_id, 'input keyevent 3');
    await client.shell(device_id, 'am force-stop ops.namabank.com.vn');
    console.log('App NAB has been stopped');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  startAppADBNAB: async ({ device_id }) => {
    console.log('Starting App NAB...');
    await client.shell(device_id, 'monkey -p ops.namabank.com.vn -c android.intent.category.LAUNCHER 1');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  stopAppADBMB: async ({ device_id }) => {    
    await client.shell(device_id, 'input keyevent 3');
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

  stopAppADBNCB: async ({ device_id }) => {    
    await client.shell(device_id, 'input keyevent 3');
    await client.shell(device_id, 'am force-stop com.ncb.bank');
    console.log('App NCB has been stopped');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  startAppADBNCB: async ({ device_id }) => {
    console.log('Starting App NCB...');
    await client.shell(device_id, 'monkey -p com.ncb.bank -c android.intent.category.LAUNCHER 1');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  startAppADBMSB: async ({ device_id }) => {
    console.log('Starting App MSB...');
    await client.shell(device_id, 'monkey -p vn.com.msb.smartBanking -c android.intent.category.LAUNCHER 1');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  stopAppADBMSB: async ({ device_id }) => {
    console.log('Stopping App MSB...');
    await client.shell(device_id, 'am force-stop vn.com.msb.smartBanking');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  stopAppADBVCB: async ({ device_id }) => {    
    await client.shell(device_id, 'input keyevent 3');
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
    await client.shell(device_id, 'input keyevent 3');
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
    await client.shell(device_id, 'input keyevent 3');
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

  checkDeviceNAB: async ({ device_id }) => {
    try {
      const deviceModel = await deviceHelper.getDeviceModel(device_id);      
  
      const deviceCoordinates = coordinatesScanQRNAB[deviceModel];             
      
      if (deviceCoordinates == undefined) {        
        console.log(`No coordinatesScanQRNAB found for device model: ${deviceModel}`);
        return { status: 500, valid: false, message: 'Thiết bị chưa hỗ trợ' };    
      }
  
      return deviceCoordinates;
    } catch (error) {
      console.error(`Error checking device: ${error.message}`);
      throw error;
    }
  },

  checkDeviceMB: async ({ device_id }) => {
    try {
      const deviceModel = await deviceHelper.getDeviceModel(device_id);      
  
      const deviceCoordinates = coordinatesScanQRMB[deviceModel];             
      
      if (deviceCoordinates == undefined) {        
        console.log(`No coordinatesScanQRMB found for device model: ${deviceModel}`);
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
        console.log(`No coordinatesScanQRNCB found for device model: ${deviceModel}`);
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
        console.log(`No coordinatesScanQRMSB found for device model: ${deviceModel}`);
        return { status: 500, valid: false, message: 'Thiết bị chưa hỗ trợ' };    
      }
  
      return deviceCoordinates;
    } catch (error) {
      console.error(`Error checking device: ${error.message}`);
      throw error;
    }
  },

  checkDeviceBAB: async ({ device_id }) => {
    try {
      const deviceModel = await deviceHelper.getDeviceModel(device_id);      
  
      const deviceCoordinates = coordinatesScanQRBAB[deviceModel];             
      
      if (deviceCoordinates == undefined) {        
        console.log(`No coordinatesScanQRBAB found for device model: ${deviceModel}`);
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
        console.log(`No coordinatesScanQROCB found for device model: ${deviceModel}`);
        return { status: 500, valid: false, message: 'Thiết bị chưa hỗ trợ' };    
      }
  
      return deviceCoordinates;
    } catch (error) {
      console.error(`Error checking device: ${error.message}`);
      throw error;
    }
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

  inputPINMSB: async ({ device_id, text }) => {  
    const coordinatesScanQRMSB = await loadCoordinatesForDeviceScanQRMSB(device_id);
        
    for (const char of text) {
      await adbHelper.tapADBMSB(device_id, ...coordinatesScanQRMSB[char]);
      console.log('Log char of text:', char);
    }  

    return { status: 200, message: 'Success' };
  },

  inputPINBIDV: async ({ device_id, text }) => {  
    const coordinatesScanQRBIDV = await loadCoordinatesForDeviceScanQRBIDV(device_id);
        
    for (const char of text) {
      await adbHelper.tapADBBIDV(device_id, ...coordinatesScanQRBIDV[char]);
      console.log('Log char of text:', char);
    }  

    return { status: 200, message: 'Success' };
  },

  inputPINVTB: async ({ device_id, text }) => {  
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

  startADB: async ({ device_id }) => {    
    console.log("Starting app to check QR...");
    await startFirstAvailableBank(device_id);    
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
};

const banks = [
  // { name: "ABBANK", package: "com.abbank.abditizen" },
  // { name: "ACB", package: "mobile.acb.com.vn" }, // pending
  // { name: "Agribank", package: "com.vnpay.Agribank3g" }, // pending
  // { name: "BAOVIET Bank", package: "com.baovietbank.mobile" },
  // { name: "Bac A Bank", package: "com.bacabank.smartbanking" },
  // { name: "CB", package: "com.cbbank.mb" },
  // { name: "CIMB", package: "com.cimb.vietnam" },
  // { name: "Co-opBank", package: "vn.com.coopbank" },
  // { name: "DongA Bank", package: "com.dongabank.mobile" },
  // { name: "Eximbank", package: "com.eximbank.ebmobile" },
  // { name: "GPBank", package: "com.gpb.smartbanking" },
  // { name: "HDBank", package: "com.hdbank.hdbankapp" },
  // { name: "Hong Leong Bank", package: "com.hlb.hongleongbankvn" },
  // { name: "HSBC", package: "com.hsbc.mobilebanking" },
  // { name: "Indovina Bank", package: "com.indovinabank.mobile" },
  // { name: "KienLongBank", package: "com.kienlongbank.kienlongsmartbanking" },
  // { name: "LienVietPostBank", package: "com.lienvietpostbank.mobilebanking" },
  // { name: "MBBank", package: "com.mbmobile" }, // ok
  // { name: "MSB", package: "vn.com.msb.smartBanking" }, // pending
  // { name: "NAB", package: "ops.namabank.com.vn" }, // ok
  // { name: "NCB", package: "com.ncb.bank" }, // ok
  // { name: "OceanBank", package: "com.oceanbank.mobile" },
  { name: "OCB", package: "vn.com.ocb.awe" }, // ok
  // { name: "PBVN", package: "com.pbvn.app" },
  // { name: "PG Bank", package: "com.pgbank.mobile" },
  // { name: "PVcomBank", package: "com.pvcombank.retail" }, // pending
  // { name: "Sacombank", package: "com.sacombank.sacombankapp" },
  // { name: "Saigonbank", package: "com.saigonbank.mobile" },
  // { name: "SCB", package: "com.scb.smartbanking" },
  // { name: "SeABank", package: "vn.com.seabank.mb1" }, // pending
  { name: "SHB", package: "vn.shb.mbanking" }, // pending
  { name: "TPBank", package: "com.tpb.mb.gprsandroid" }, // pending  
  // { name: "VCB", package: "com.VCB" }, // ok, but got blind
  { name: "VIB", package: "com.vib.mobile" },
  { name: "VPBank", package: "com.vpbank.smartbanking" }
];

const getInstalledPackages = async (device_id) => {
  try {
    const shellOutput = await client.shell(device_id, 'pm list packages');
    const output = await adb.util.readAll(shellOutput);
    return output
        .toString('utf-8')
        .split('\n')
        .map(line => line.replace('package:', '').trim())
        .filter(pkg => pkg); // Loại bỏ các dòng trống
  } catch (error) {
    console.error(`Error fetching installed packages for device ${device_id}:`, error.message);
    throw error;
  }
};

const startFirstAvailableBank = async (device_id) => {
  try {
    const installedPackages = await getInstalledPackages(device_id);

    // Lọc ngân hàng có package name khớp và sắp xếp theo alphabet
    const availableBanks = banks
        .filter((bank) => installedPackages.includes(bank.package))
        .sort((a, b) => a.name.localeCompare(b.name)); // Sắp xếp theo tên alphabet

    if (availableBanks.length === 0) {
        console.log("No bank apps available on the device.");
        return { status: 404, message: "No bank apps found on the device." };
    }

    // Lấy ngân hàng đầu tiên và khởi chạy
    const firstBank = availableBanks[0];
    console.log(`Starting ${firstBank.name} on device ${device_id}...`);

    // await client.startActivity(device_id, {
    //     action: 'android.intent.action.MAIN',
    //     category: ['android.intent.category.LAUNCHER'],
    //     packageName: firstBank.package
    // });

    await client.shell(device_id, `monkey -p ${firstBank.package} -c android.intent.category.LAUNCHER 1`);

    console.log(`${firstBank.name} started successfully.`);
    return { status: 200, message: `Started ${firstBank.name} successfully.` };
  } catch (error) {
    console.error("Error in startFirstAvailableBank:", error.message);
    return { status: 500, message: "Internal error occurred." };
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
    throw error;
  }
};

async function loadCoordinatesForDeviceScanQRNAB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);
    console.log('deviceModel now:', deviceModel);

    const deviceCoordinates = coordinatesScanQRNAB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRNAB for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesForDeviceScanQRMB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);
    console.log('deviceModel now:', deviceModel);

    const deviceCoordinates = coordinatesScanQRMB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRMB for device: ${error.message}`);
    throw error; // Re-throw error for the caller to handle
  }
};

async function loadCoordinatesForDeviceScanQRMSB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);
    console.log('deviceModel now:', deviceModel);

    const deviceCoordinates = coordinatesScanQRMSB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRMSB for device: ${error.message}`);
    throw error; // Re-throw error for the caller to handle
  }
};

async function loadCoordinatesForDeviceScanQRNCB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);
    console.log('deviceModel now:', deviceModel);

    const deviceCoordinates = coordinatesScanQRNCB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRNCB for device: ${error.message}`);
    throw error; // Re-throw error for the caller to handle
  }
};

async function loadCoordinatesForDeviceScanQRBAB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);
    console.log('deviceModel now:', deviceModel);

    const deviceCoordinates = coordinatesScanQRBAB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQROCB for device: ${error.message}`);
    throw error; // Re-throw error for the caller to handle
  }
};

async function loadCoordinatesForDeviceScanQROCB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);
    console.log('deviceModel now:', deviceModel);

    const deviceCoordinates = coordinatesScanQROCB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQROCB for device: ${error.message}`);
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

async function loadCoordinatesForDeviceLoginBAB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);
    console.log('deviceModel now:', deviceModel);

    const deviceCoordinates = coordinatesLoginBAB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesLoginBAB for device: ${error.message}`);
    throw error; // Re-throw error for the caller to handle
  }
};

async function loadCoordinatesForDeviceLoginNAB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);
    console.log('deviceModel now:', deviceModel);

    const deviceCoordinates = coordinatesLoginNAB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesLoginNAB for device: ${error.message}`);
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