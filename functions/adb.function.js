require('dotenv').config();
const adb = require('adbkit');
const fs = require('fs');
const path = require('path');
const { delay } = require('../helpers/functionHelper');
const { escapeSpecialChars, removeVietnameseStr } = require('../utils/string.util');
const xml2js = require('xml2js');
const adbPath = path.join(__dirname, '../platform-tools', 'adb.exe');
const client = adb.createClient({ bin: adbPath });

const coordinatesLoginACB = require('../config/coordinatesLoginACB.json');
const coordinatesScanQRACB = require('../config/coordinatesScanQRACB.json');
const coordinatesScanQREIB = require('../config/coordinatesScanQREIB.json');
const coordinatesScanQREIB2 = require('../config/coordinatesScanQREIB2.json');
const coordinatesLoginICB = require('../config/coordinatesLoginICB.json');
const coordinatesLoginNAB = require('../config/coordinatesLoginNAB.json');
const coordinatesScanQRNAB = require('../config/coordinatesScanQRNAB.json');
const coordinatesScanQRTPB = require('../config/coordinatesScanQRTPB.json');
const coordinatesScanQRVPB = require('../config/coordinatesScanQRVPB.json');
const coordinatesDevice = require('../config/coordinatesDevice.json');
const coordinatesScanQRMB2 = require('../config/coordinatesScanQRMB2.json');
const coordinatesScanQRMB3 = require('../config/coordinatesScanQRMB3.json');
const coordinatesScanQRNCB = require('../config/coordinatesScanQRNCB.json');
const coordinatesScanQRMSB = require('../config/coordinatesScanQRMSB.json');
const coordinatesScanQRICB = require('../config/coordinatesScanQRICB.json');
const coordinatesScanQRBIDV = require('../config/coordinatesScanQRBIDV.json');
const coordinatesScanQROCB = require('../config/coordinatesScanQROCB.json');
const coordinatesScanQRBAB = require('../config/coordinatesScanQRBAB.json');
const coordinatesScanQRSHBSAHA = require('../config/coordinatesScanQRSHBSAHA.json');

const adbHelper = require('../helpers/adbHelper');
const deviceHelper = require('../helpers/deviceHelper');

const { isEIBRunning, isMBRunning, isMSBRunning } = require('../functions/bankStatus.function');

const ensureDirectoryExists = ( dirPath ) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function clearTempFile( { device_id } ) {
  try {                
    await client.shell(device_id, `rm /sdcard/temp_dump.xml`);
    await delay(1000);    
  } catch (error) {
    console.error("Cannot delete file temp_dump.xml:", error.message);
  }
}

async function dumpXmlToLocal ( device_id, localPath ) {  
  try {          
    const tempPath = `/sdcard/temp_dump.xml`;
      
    await client.shell(device_id, `uiautomator dump ${tempPath}`);    
      
    await client.pull( device_id , tempPath)
      .then(stream => new Promise((resolve, reject) => {        
        const fileStream = fs.createWriteStream(localPath);
        stream.pipe(fileStream);
        fileStream.on('finish', resolve);
        fileStream.on('error', reject);
    }));    
  } catch (error) {
      console.error(`Error occurred while dumping XML to local. ${error.message}`);
  }
}

// Bảng ánh xạ tên ngân hàng sang mã BIN khi dùng NAB
const bankBinMapNAB = {
  // chưa xong
};

// Bảng ánh xạ tên ngân hàng sang mã BIN khi dùng MSB
const bankBinMapMSB = {
  // chưa xong
};

// chưa xong
function extractNodesNAB(obj) {
  let bin = null, account_number = null, amount = null;
  const bankList = [
    // chưa xong
  ];
  
  let foundBank = false; 
  let foundAccount = false;
  let maxAmount = 0;

  function traverse(node) {
      if (!node) return;

      if (typeof node === 'object') {
          for (let key in node) {
              traverse(node[key]);
          }
      }

      if (typeof node === 'string') {
          let text = node.trim();
          if (!text || text === "false" || text === "true") return;          

          // 1️⃣ Tìm ngân hàng trước
          if (!bin) {
              for (let bank of bankList) {
                  if (text.includes(bank)) {
                      bin = bankBinMapNAB[bank] || bank;
                      foundBank = true;                      
                      return; 
                  }
              }
          }

          // 2️⃣ Tìm số tài khoản (chỉ tìm sau khi đã tìm thấy ngân hàng)
          if (foundBank && !account_number) {
              const accountMatch = text.match(/\b\d{6,}\b/); // Tìm số tài khoản (ít nhất 6 số)
              if (accountMatch) {
                  account_number = accountMatch[0];
                  foundAccount = true;                  
                  return;
              }
          }

          // 3️⃣ Tìm số tiền giao dịch lớn nhất
          const amountMatch = text.match(/^\d{1,3}(?:,\d{3})*$/);
          if (amountMatch) {
              let extractedAmount = parseInt(amountMatch[0].replace(/,/g, ''), 10); // Bỏ dấu `,` và convert thành số
              if (extractedAmount > maxAmount) {
                  maxAmount = extractedAmount;                  
              }
          }
      }
  }

  traverse(obj);
  amount = maxAmount;

  return { bin, account_number, amount };
}

// ko dump duoc sau khi quet QR
function extractNodesMSB(obj) {
  let bin = null, account_number = null, amount = null;
  const bankList = [
    "ACB - NH TMCP A CHAU",
    "VIETCOMBANK -NH TMCP NGOAI THUONG VIET NAM (VCB)"
  ];
  
  let foundBank = false; 
  let foundAccount = false;
  let maxAmount = 0;

  function traverse(node) {
      if (!node) return;

      if (typeof node === 'object') {
          for (let key in node) {
              traverse(node[key]);
          }
      }

      if (typeof node === 'string') {
          let text = node.trim();
          if (!text || text === "false" || text === "true") return;          

          // 1️⃣ Tìm ngân hàng trước
          if (!bin) {
              for (let bank of bankList) {
                  if (text.includes(bank)) {
                      bin = bankBinMapMSB[bank] || bank;
                      foundBank = true;                      
                      return; 
                  }
              }
          }

          // 2️⃣ Tìm số tài khoản (chỉ tìm sau khi đã tìm thấy ngân hàng)
          if (foundBank && !account_number) {
              const accountMatch = text.match(/\b\d{6,}\b/); // Tìm số tài khoản (ít nhất 6 số)
              if (accountMatch) {
                  account_number = accountMatch[0];
                  foundAccount = true;                  
                  return;
              }
          }

          // 3️⃣ Tìm số tiền giao dịch lớn nhất
          const amountMatch = text.match(/^\d{1,3}(?:,\d{3})*$/);
          if (amountMatch) {
              let extractedAmount = parseInt(amountMatch[0].replace(/,/g, ''), 10); // Bỏ dấu `,` và convert thành số
              if (extractedAmount > maxAmount) {
                maxAmount = extractedAmount;                  
              }
          }
      }
  }

  traverse(obj);
  amount = maxAmount;

  return { bin, account_number, amount };
}

// chưa xong
const checkContentMSB = async (device_id, localPath) => {
  try {
    const chatId = '-4725254373';
    const telegramToken = '7884594856:AAEKZXIBH2IaROGR_k6Q49IP2kSt8uJ4wE0';

    const content = fs.readFileSync(localPath, "utf-8").trim();

    const keywordsVI = [
      // chưa xong
    ];
    const keywordsEN = [      
      // chưa xong
    ];

    if (keywordsVI.every(kw => content.includes(kw)) || keywordsEN.every(kw => content.includes(kw))) {      
      console.log('Đóng app MSB');
      await stopMSB ( { device_id } );                

      await sendTelegramAlert(
        telegramToken,
        chatId,
        `🚨 Cảnh báo! Phát hiện có thao tác thủ công khi xuất với MSB (id thiết bị: ${device_id})`
      );

      await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason: `Phát hiện có thao tác thủ công khi xuất với MSB (id thiết bị: ${device_id})`,
        filePath: localPath 
      });

      return;
    }

    const parsed = await xml2js.parseStringPromise(content, { explicitArray: false, mergeAttrs: true });
    const extractedData = extractNodesMSB(parsed);    

    if (extractedData.bin && extractedData.account_number && extractedData.amount) {
      console.log("⚠ XML có chứa dữ liệu giao dịch: bin (bank name) account_number, amount. Đang so sánh trong info-qr.json.");      

      let jsonData = {};
      if (fs.existsSync(jsonFilePath)) {
        try {        
          const rawData = fs.readFileSync(jsonFilePath, "utf8");
          jsonData = JSON.parse(rawData).data || {};        
        } catch (error) {          
          console.warn("⚠ Không thể đọc dữ liệu cũ, đặt về object rỗng.");
          jsonData = {};          
        }
      }

      const differences = compareData(extractedData, jsonData);
      if (differences.length > 0) {
        console.log(`⚠ Dữ liệu giao dịch thay đổi!\n${differences.join("\n")}`);

        console.log('Dừng luôn app MSB');
        await stopMSB ( { device_id } );          

        await sendTelegramAlert(
          telegramToken,
          chatId,
          `🚨 Cảnh báo! Phát hiện có thao tác thủ công khi xuất với MSB (id thiết bị: ${device_id})`
        );

        await saveAlertToDatabase({
          timestamp: new Date().toISOString(),
          reason: `Phát hiện có thao tác thủ công khi xuất với MSB (id thiết bị: ${device_id})`,
          filePath: localPath 
        });

        return true;
      } else {
        console.log("✅ Dữ liệu giao dịch KHÔNG thay đổi, bỏ qua.");
        return false;
      }
    }    
  } catch (error) {    
      console.error("❌ Lỗi xử lý XML:", error.message);
  }
}

async function stopMSB ({ device_id }) {    
  await client.shell(device_id, 'am force-stop vn.com.msb.smartBanking');
  console.log('Đã dừng app MSB');
  await delay(500);
  return { status: 200, message: 'Success' };
}

const { sendTelegramAlert, saveAlertToDatabase } = require('../functions/alert.function');

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
      await client.shell(device_id, 'input tap 540 1868');
      console.log('Đã đóng tất cả các app đang mở');
    }
    else {
      await client.shell(device_id, 'input tap 540 1750'); // Click "Close all", for example: Note9
      console.log('Đã đóng tất cả các app đang mở');
    }

    return { status: 200, message: 'Success'};
  },

  trackMSB : async ( { device_id } ) => {
    const targetDir = path.join('C:\\att_mobile_client\\logs\\');
    ensureDirectoryExists(targetDir);

    console.log('Đang theo dõi MSB...');
    
    const chatId = '-4725254373';    

    if (!chatId) {
      console.error("Cannot continue cause of invalid chat ID.");
      return;
    } 

    let running = await isMSBRunning( { device_id } );

    if (!running) {
      return;
    }
        
    await clearTempFile( { device_id } );
    
    while (running) {
      console.log('MSB app is in process');
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);
    
      await dumpXmlToLocal( device_id, localPath );
      await checkContentMSB( device_id, localPath );                       
    
      running = await isMSBRunning( { device_id } );
    
      if (!running) {            
        console.log('🚫 MSB đã tắt. Dừng theo dõi.');
        await clearTempFile( { device_id } );      
        return false;          
      }
    }
    return { status: 200, message: 'Success' };
  },

  trackSHBSAHA : async ( { device_id } ) => {
    const targetDir = path.join('C:\\att_mobile_client\\logs\\');
    ensureDirectoryExists(targetDir);

    console.log('Đang theo dõi SHB SAHA...');

    let running = await isSHBSAHARunning({ device_id });
    
      if (!running) {
        return await trackingLoop({ device_id });
      }
    
      await clearTempFile({ device_id });

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

  clickConfirmICB: async ({ device_id }) => {    
    const coordinatesScanQRICB = await loadCoordinatesScanQRICB(device_id);    
    await adbHelper.tapXY(device_id, ...coordinatesScanQRICB['Confirm']);      
    return { status: 200, message: 'Success' };
  },

  clickLoginACB: async ({ device_id }) => {    
    const coordinatesLoginACB = await loadCoordinatesLoginACB(device_id);
    
    await adbHelper.tapXY(device_id, ...coordinatesLoginACB['Click-Login']);
    await delay(500);  
    await adbHelper.tapXY(device_id, ...coordinatesLoginACB['Field-Password']);        

    return { status: 200, message: 'Success' };
  },
  
  clickScanQRMSB: async ({ device_id }) => {    
    const coordinatesScanQRMSB = await loadCoordinatesScanQRMSB(device_id);    
    await adbHelper.tapXY(device_id, ...coordinatesScanQRMSB['ScanQR']);      
    return { status: 200, message: 'Success' };
  },    

  clickScanQRNCB: async ({ device_id }) => {    
    const coordinatesScanQRNCB = await loadCoordinatesScanQRNCB(device_id);    
    await adbHelper.tapXY(device_id, ...coordinatesScanQRNCB['Select-ScanQR']);      
    return { status: 200, message: 'Success' };
  },

  clickPasswordFieldEIB: async ({ device_id }) => {    
    const coordinatesScanQREIB = await loadCoordinatesScanQREIB(device_id);
    await adbHelper.tapXY(device_id, ...coordinatesScanQREIB['Password-Field']);      
    await adbHelper.tapXY(device_id, ...coordinatesScanQREIB['Password-Field']);
    return { status: 200, message: 'Success' };
  },    

  clickConfirmMB: async ({ device_id }) => {    
    const coordinatesDevice = await loadCoordinatesScanQRMB(device_id);    
    await adbHelper.tapXY(device_id, ...coordinatesDevice['Confirm']);      
    return { status: 200, message: 'Success' };
  },  

  clickLoginNAB: async ({ device_id }) => {    
    const coordinatesLoginNAB = await loadCoordinatesLoginNAB(device_id);    
    await adbHelper.tapXY(device_id, ...coordinatesLoginNAB['Login']);      
    return { status: 200, message: 'Success' };
  },

  // copyQRImages: async ({ device_id }) => {        
  //   try {
  //     const jsonPath = path.join(__dirname, '../database/info-qr.json');
  //     const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  //     const timestamp = jsonData.timestamp;
  //     const date = new Date(timestamp);
  //     const pad = (n) => n.toString().padStart(2, '0');
  //     const filename = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;

  //     const sourcePath = `/sdcard/DCIM/Camera/${filename}.jpg`;
  //     const destinationDir = `/sdcard/DCIM/Camera/`;

  //     for (let i = 1; i <= 2; i++) {
  //       const destinationPath = `${destinationDir}${filename}_copy_${i}.jpg`;
  //       try {
  //         await client.shell(device_id, `cp ${sourcePath} ${destinationPath}`);
  //         console.log(`Copied to: ${destinationPath}`);
  //       } catch (err) {
  //         console.error(`Failed to copy to ${destinationPath}: ${err.message}`);
  //       }
  //     }
  //     return { status: 200, message: 'Success' };
  //   } catch (error) {
  //     console.log('copyQRImages got an error: ', error);
  //     return { status: 500, message: 'Failed to copy QR images' };
  //   }    
  // }, 
  copyQRImages: async ({ device_id }) => {
    try {
      // 1. Lấy danh sách ảnh .jpg trong thư mục Camera
      const lsOutput = await client.shell(device_id, `ls /sdcard/DCIM/Camera/`);
      const lsBuffer = await adb.util.readAll(lsOutput);
      const fileList = lsBuffer.toString().split('\n').map(f => f.trim()).filter(f => f.endsWith('.jpg'));
  
      if (!fileList.length) throw new Error('Không tìm thấy ảnh .jpg nào.');
  
      // 2. Lấy ảnh mới nhất theo tên (thường dạng timestamp)
      fileList.sort();
      const latestFile = fileList[fileList.length - 1];
      const sourcePath = `/sdcard/DCIM/Camera/${latestFile}`;
      const baseName = latestFile.replace(/\.jpg$/, '');
      const destinationDir = `/sdcard/DCIM/Camera/`;
  
      // 3. Tạo 2 bản copy
      for (let i = 1; i <= 2; i++) {
        const destinationPath = `${destinationDir}${baseName}_copy_${i}.jpg`;
        try {
          await client.shell(device_id, `cp "${sourcePath}" "${destinationPath}"`);
          console.log(`Copied to: ${destinationPath}`);
  
          // 4. Gửi broadcast để Gallery cập nhật ảnh
          await client.shell(
            device_id,
            `am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file://${destinationPath}`
          );
          console.log(`Broadcasted: ${destinationPath}`);
        } catch (err) {
          console.error(`Lỗi khi copy hoặc broadcast: ${destinationPath} - ${err.message}`);
        }
      }
  
      // 5. Gửi broadcast cho ảnh gốc (nếu cần)
      await client.shell(
        device_id,
        `am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file://${sourcePath}`
      );
      console.log(`Broadcasted gốc: ${sourcePath}`);
  
      return { status: 200, message: 'Copy + broadcast ảnh QR thành công' };
  
    } catch (error) {
      console.error("Lỗi trong copyQRImages:", error.message);
      return { status: 500, message: 'Thất bại khi copy và broadcast ảnh QR' };
    }
  }, 

  scanQRBAB: async ({ device_id }) => {    
    const coordinatesScanQRBAB = await loadCoordinatesScanQRBAB(device_id);    
    await adbHelper.tapXY(device_id, ...coordinatesScanQRBAB['ScanQR']); 
    await delay(500);                  
    await adbHelper.tapXY(device_id, ...coordinatesScanQRBAB['Select-Image']); 
    await delay(500);     
    await adbHelper.tapXY(device_id, ...coordinatesScanQRBAB['Select-Image-2']);             
    await delay(500);     
    await adbHelper.tapXY(device_id, ...coordinatesScanQRBAB['Target-Image']);                 
    return { status: 200, message: 'Success' };
  },         

  clickConfirmOCB: async ({ device_id }) => {    
    const coordinatesScanQROCB = await loadCoordinatesScanQROCB(device_id);  
    await adbHelper.tapXY(device_id, ...coordinatesScanQROCB['Confirm']);      
    return { status: 200, message: 'Success' };
  },

  clickConfirmBIDV: async ({ device_id }) => {  
    const coordinatesScanQRBIDV = await loadCoordinatesScanQRBIDV(device_id);
    await adbHelper.tapXY(device_id, ...coordinatesScanQRBIDV['Confirm']); 
    return { status: 200, message: 'Success' };
  },

  clickScanQRICB: async ({ device_id }) => {    
    const coordinatesScanQRICB = await loadCoordinatesScanQRICB(device_id);
    await adbHelper.tapXY(device_id, ...coordinatesScanQRICB['Select-ScanQR']);      
    return { status: 200, message: 'Success' };
  },

  scanQRICB: async ({ device_id }) => {    
    const coordinatesScanQRICB = await loadCoordinatesScanQRICB(device_id);
    const deviceModel = await deviceHelper.getDeviceModel(device_id);        
        
    await adbHelper.tapXY(device_id, ...coordinatesScanQRICB['ScanQR']); 
    await sleep(600); 
    await adbHelper.tapXY(device_id, ...coordinatesScanQRICB['Image']);  
    await sleep(800);   
    if (deviceModel === 'SM-N960') {  // Nếu là S20 FE 5G thì chỉ cần Target-Img ở đây
      await adbHelper.tapXY(device_id, ...coordinatesScanQRICB['Target-Img']);             
    }
    else if (deviceModel === 'ONEPLUS A5010' || deviceModel === 'ONEPLUS A5000') {      
      await adbHelper.tapXY(device_id, ...coordinatesScanQRICB['Hamburger-Menu']);
      await delay(800);   
      await adbHelper.tapXY(device_id, ...coordinatesScanQRICB['ONEPLUS A5010']); // = Galaxy Note9
      await delay(700);                     
      await client.shell(device_id, `input swipe 500 1800 500 300`);
      await delay(700);
      await adbHelper.tapXY(device_id, ...coordinatesScanQRICB['Target-Img']); 
      await delay(700);      
      await adbHelper.tapXY(device_id, ...coordinatesScanQRICB['Finish']);
    }
    else if (deviceModel === 'CPH2321') {      
      await adbHelper.tapXY(device_id, ...coordinatesScanQRICB['Overflow-Menu']);
      await delay(700);
      await adbHelper.tapXY(device_id, ...coordinatesScanQRICB['Browse']);            
      await delay(700);
      await adbHelper.tapXY(device_id, ...coordinatesScanQRICB['Hamburger-Menu']);
      await delay(700);
      await adbHelper.tapXY(device_id, ...coordinatesScanQRICB['OPPO-A55-5G']);
      await delay(700);
      await adbHelper.tapXY(device_id, ...coordinatesScanQRICB['DCIM']);
      await delay(700);
      await adbHelper.tapXY(device_id, ...coordinatesScanQRICB['Camera']);
      await delay(700);
      await adbHelper.tapXY(device_id, ...coordinatesScanQRICB['Target-Image']);
    }
     

    return { status: 200, message: 'Success' };
  },

  clickConfirmScanFaceBIDV: async ({ device_id }) => {    
    const coordinatesScanQRBIDV = await loadCoordinatesScanQRBIDV(device_id);
    await adbHelper.tapXY(device_id, ...coordinatesScanQRBIDV['Confirm']);
    return { status: 200, message: 'Success' };
  },

  clickScanQRBIDV: async ({ device_id }) => {    
    const coordinatesScanQRBIDV = await loadCoordinatesScanQRBIDV(device_id);    
    await adbHelper.tapXY(device_id, ...coordinatesScanQRBIDV['ScanQR']);      
    return { status: 200, message: 'Success' };
  },

  clickSelectImageBIDV: async ({ device_id }) => {    
    const coordinatesScanQRBIDV = await loadCoordinatesScanQRBIDV(device_id);     
    await adbHelper.tapXY(device_id, ...coordinatesScanQRBIDV['Select-Image']);    
    return { status: 200, message: 'Success' };
  }, 

  stopBAB: async ({ device_id }) => {   
    await client.shell(device_id, 'input keyevent 3'); 
    await client.shell(device_id, 'am force-stop com.bab.retailUAT');
    console.log('Đã dừng app BAB');
    await delay(200);
    return { status: 200, message: 'Success' };
  },

  startBAB: async ({ device_id }) => {    
    await client.shell(device_id, 'am start -n com.bab.retailUAT/.MainActivity');
    console.log('Đang khởi động app Bac A Bank');
    await delay(200);
    return { status: 200, message: 'Success' };
  },

  stopOCB: async ({ device_id }) => {    
    await client.shell(device_id, 'input keyevent 3');
    await client.shell(device_id, 'am force-stop vn.com.ocb.awe');
    console.log('Đã dừng app OCB');
    await delay(200);
    return { status: 200, message: 'Success' };
  },  

  stopACB: async ({ device_id }) => {    
    await client.shell(device_id, 'input keyevent 3');
    await client.shell(device_id, 'am force-stop mobile.acb.com.vn');
    console.log('Đã dừng app ACB');
    await delay(200);
    return { status: 200, message: 'Success' };
  },

  stopEIB: async ({ device_id }) => {    
    await client.shell(device_id, 'input keyevent 3');
    await client.shell(device_id, 'am force-stop com.vnpay.EximBankOmni');
    console.log('Đã dừng app EximBank EDigi');
    await delay(200);
    return { status: 200, message: 'Success' };
  },      

  stopBIDV: async ({ device_id }) => {    
    await client.shell(device_id, 'input keyevent 3');
    await client.shell(device_id, 'am force-stop com.vnpay.bidv');
    console.log('Đã dừng app BIDV');
    await delay(200);
    return { status: 200, message: 'Success' };
  },

  startBIDV: async ({ device_id }) => {
    console.log('Đang khởi động app BIDV...');
    await client.shell(device_id, 'monkey -p com.vnpay.bidv -c android.intent.category.LAUNCHER 1');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  stopICB: async ({ device_id }) => {    
    await client.shell(device_id, 'input keyevent 3');
    await client.shell(device_id, 'am force-stop com.vietinbank.ipay');
    console.log('Đã dừng app VietinBank iPay');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  startICB: async ({ device_id }) => {
    console.log('Đang khởi động app VietinBank iPay...');
    await client.shell(device_id, 'monkey -p com.vietinbank.ipay -c android.intent.category.LAUNCHER 1');
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

  checkDeviceBAB: async ({ device_id }) => {
    try {
      const deviceModel = await deviceHelper.getDeviceModel(device_id);      
  
      const deviceCoordinates = coordinatesScanQRBAB[deviceModel];             
      
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

  checkDeviceBIDV: async ({ device_id }) => {
    try {
      const deviceModel = await deviceHelper.getDeviceModel(device_id);      
  
      const deviceCoordinates = coordinatesScanQRBIDV[deviceModel];             
      
      if (deviceCoordinates == undefined) {                
        return { status: 500, valid: false, message: 'Thiết bị chưa hỗ trợ' };    
      }
  
      return deviceCoordinates;
    } catch (error) {
      console.error(`Error checking device: ${error.message}`);
      throw error;
    }
  },

  checkDeviceICB: async ({ device_id }) => {
    try {
      const deviceModel = await deviceHelper.getDeviceModel(device_id);      
  
      const deviceCoordinates = coordinatesLoginICB[deviceModel];             
      
      if (deviceCoordinates == undefined) {                
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

  inputPINVPB: async ({ device_id, text }) => {  
    const coordinatesScanQRVPB = await loadCoordinatesScanQRVPB(device_id);
        
    for (const char of text) {
      await adbHelper.tapXY(device_id, ...coordinatesScanQRVPB[char]);
      console.log('Log char of PIN:', char);
    }  

    return { status: 200, message: 'Success' };
  },

  inputPINMSB: async ({ device_id, text }) => {  
    const coordinatesScanQRMSB = await loadCoordinatesScanQRMSB(device_id);
        
    for (const char of text) {
      await adbHelper.tapXY(device_id, ...coordinatesScanQRMSB[char]);
      console.log('Log char of PIN:', char);
    }  

    return { status: 200, message: 'Success' };
  },

  inputPINBIDV: async ({ device_id, text }) => {  
    const coordinatesScanQRBIDV = await loadCoordinatesScanQRBIDV(device_id);
        
    for (const char of text) {
      await adbHelper.tapXY(device_id, ...coordinatesScanQRBIDV[char]);
      console.log('Log char of PIN:', char);
    }  

    return { status: 200, message: 'Success' };
  },

  inputPINICB: async ({ device_id, text }) => {  
    const coordinatesScanQRICB = await loadCoordinatesScanQRICB(device_id);
        
    for (const char of text) {
      await adbHelper.tapXY(device_id, ...coordinatesScanQRICB[char]);
      console.log('Log char of PIN:', char);
    }  

    return { status: 200, message: 'Success' };
  },

  inputICB: async ({ device_id, text }) => {  
    const coordinatesLoginICB = await loadCoordinatesLoginICB(device_id);    
        
    for (const char of text) {
      console.log('log char in text:',char);
      if (isUpperCase(char)) {
        await adbHelper.tapXY(device_id, ...coordinatesLoginICB['CapsLock']);
        await sleep(50); 
        await adbHelper.tapXY(device_id, ...coordinatesLoginICB[char]);        
        await sleep(50);
      }
      else if (isSpecialChar(char)) {
        await adbHelper.tapXY(device_id, ...coordinatesLoginICB['!#1']);
        await sleep(50); 
        await adbHelper.tapXY(device_id, ...coordinatesLoginICB[char]);        
        await sleep(50); 
        await adbHelper.tapXY(device_id, ...coordinatesLoginICB['ABC']);
      }        
      else {
        await adbHelper.tapXY(device_id, ...coordinatesLoginICB[char.toLowerCase()]);        
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

async function loadCoordinatesScanQRBIDV(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesScanQRBIDV[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRBIDV for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesScanQRNAB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesScanQRNAB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRNAB for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesScanQRTPB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesScanQRTPB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRTPB for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesScanQRVPB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesScanQRVPB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRVPB for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesScanQRMB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesDevice[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesDevice for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesScanQRMB2(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesScanQRMB2[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRMB2 for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesScanQRMB3(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesScanQRMB3[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRMB2 for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesScanQRSHBSAHA(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesScanQRSHBSAHA[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRSHBSAHA for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesLoginACB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesLoginACB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesLoginACB for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesScanQRACB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesScanQRACB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRACB for device: ${error.message}`);
    throw error;
  }
}

async function loadCoordinatesScanQREIB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesScanQREIB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQREIB for device: ${error.message}`);
    throw error;
  }
}

async function loadCoordinatesScanQREIB2(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesScanQREIB2[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQREIB for device: ${error.message}`);
    throw error;
  }
}

async function loadCoordinatesScanQRMSB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesScanQRMSB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRMSB for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesScanQRNCB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesScanQRNCB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRNCB for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesScanQRBAB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesScanQRBAB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQROCB for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesScanQROCB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesScanQROCB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQROCB for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesScanQRICB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);

    const deviceCoordinates = coordinatesScanQRICB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRICB for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesLoginICB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesLoginICB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesLoginICB for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesLoginNAB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesLoginNAB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesLoginNAB for device: ${error.message}`);
    throw error;
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