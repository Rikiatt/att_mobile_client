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
const coordinatesLoginVTB = require('../config/coordinatesLoginVTB.json');
const coordinatesLoginNAB = require('../config/coordinatesLoginNAB.json');
const coordinatesScanQRNAB = require('../config/coordinatesScanQRNAB.json');
const coordinatesScanQRNAB2 = require('../config/coordinatesScanQRNAB2.json');
const coordinatesScanQRTPB = require('../config/coordinatesScanQRTPB.json');
const coordinatesScanQRVPB = require('../config/coordinatesScanQRVPB.json');
const coordinatesScanQRMB = require('../config/coordinatesScanQRMB.json');
const coordinatesScanQRMB2 = require('../config/coordinatesScanQRMB2.json');
const coordinatesScanQRMB3 = require('../config/coordinatesScanQRMB3.json');
const coordinatesScanQRNCB = require('../config/coordinatesScanQRNCB.json');
const coordinatesScanQRMSB = require('../config/coordinatesScanQRMSB.json');
const coordinatesScanQRVTB = require('../config/coordinatesScanQRVTB.json');
const coordinatesScanQRBIDV = require('../config/coordinatesScanQRBIDV.json');
const coordinatesScanQROCB = require('../config/coordinatesScanQROCB.json');
const coordinatesScanQRBAB = require('../config/coordinatesScanQRBAB.json');
const coordinatesScanQRSHBSAHA = require('../config/coordinatesScanQRSHBSAHA.json');

const adbHelper = require('../helpers/adbHelper');
const deviceHelper = require('../helpers/deviceHelper');

const { isACBRunning, isEIBRunning, isOCBRunning, isNABRunning, 
  isTPBRunning, isVPBRunning, isMBRunning, isMSBRunning
} = require('../functions/bankStatus.function');

const ensureDirectoryExists = ( dirPath ) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

const { checkContentNAB, checkContentTPB, checkContentVPB, checkContentMB } = require('../functions/checkBank.function');

const { qrDevicePath, filename } = require('../functions/endpoint');

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

const { sendTelegramAlert } = require('../services/telegramService');
const { saveAlertToDatabase } = require('../controllers/alert.controller');

module.exports = {
  closeAll: async ({ device_id }) => {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);

    await client.shell(device_id, 'input keyevent KEYCODE_APP_SWITCH');
    await delay(1000);

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
    else {
      await client.shell(device_id, 'input tap 540 1750'); // Click "Close all", for example: Note9
      console.log('Đã đóng tất cả các app đang mở');
    }

    return { status: 200, message: 'Success'};
  },            

  trackMSB : async ( { device_id } ) => {
    const targetDir = path.join('C:\\att_mobile_client\\logs\\');
    ensureDirectoryExists(targetDir);

    console.log('🔍 Bắt đầu theo dõi MSB...');
    
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

    console.log('🔍 Bắt đầu theo dõi SHB SAHA...chưa làm được gì thì bị đòi máy chịu luôn');

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

  clickConfirmVTB: async ({ device_id }) => {    
    const coordinatesScanQRVTB = await loadCoordinatesForDeviceScanQRVTB(device_id);    
    await adbHelper.tapXY(device_id, ...coordinatesScanQRVTB['Confirm']);      
    return { status: 200, message: 'Success' };
  },

  clickLoginACB: async ({ device_id }) => {    
    const coordinatesLoginACB = await loadCoordinatesForDeviceLoginACB(device_id);
    
    await adbHelper.tapXY(device_id, ...coordinatesLoginACB['Click-Login']);
    await delay(500);  
    await adbHelper.tapXY(device_id, ...coordinatesLoginACB['Field-Password']);        

    return { status: 200, message: 'Success' };
  },
  
  clickScanQRMSB: async ({ device_id }) => {    
    const coordinatesScanQRMSB = await loadCoordinatesForDeviceScanQRMSB(device_id);    
    await adbHelper.tapXY(device_id, ...coordinatesScanQRMSB['ScanQR']);      
    return { status: 200, message: 'Success' };
  },

  scanQRACB: async ({ device_id }) => {    
    const coordinatesScanQRACB = await loadCoordinatesForDeviceScanQRACB(device_id);
    
    // await adbHelper.tapXY(device_id, ...coordinatesScanQRACB['Hide-Popup']);
    // await adbHelper.tapXY(device_id, ...coordinatesScanQRACB['Hide-Popup']);
    // await delay(500);                  
    await adbHelper.tapXY(device_id, ...coordinatesScanQRACB['ScanQR']);
    await delay(600);                  
    await adbHelper.tapXY(device_id, ...coordinatesScanQRACB['Select-Image']);           
    await delay(600); 
    await adbHelper.tapXY(device_id, ...coordinatesScanQRACB['Select-Target-Img']);     

    return { status: 200, message: 'Success' };
  },

  scanQREIB: async ({ device_id, localPath }) => {
    const coordinatesScanQREIB = await loadCoordinatesForDeviceScanQREIB(device_id);    
    const coordinatesScanQREIB2 = await loadCoordinatesForDeviceScanQREIB2(device_id);         
  
    await adbHelper.tapXY(device_id, ...coordinatesScanQREIB['ScanQR']);             
    await delay(600);  
    await adbHelper.tapXY(device_id, ...coordinatesScanQREIB['Image']);
    await delay(600);      
    await adbHelper.tapXY(device_id, ...coordinatesScanQREIB['Hamburger-Menu']);
    await delay(600);
  
    let running = await isEIBRunning({ device_id });
    if (!running) {      
      return;
    } 
    
    await clearTempFile({ device_id });
  
    let selectedCoords = coordinatesScanQREIB;
    const targetDir = path.join('C:\\att_mobile_client\\logs\\');
      
    const keywordMap = {
      recent: ["Recent", "Gần đây"],
      images: ["Images", "Hình ảnh"],
      downloads: ["Downloads", "Tệp tải xuống"],
      galaxyNote9: ["Galaxy Note9"]  
    };
  
    while (running) {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localDumpPath = path.join(targetDir, `${timestamp}.xml`);
  
      await dumpXmlToLocal(device_id, localDumpPath);
      const xmlContent = fs.readFileSync(localDumpPath, "utf-8").trim();
        
      const containsAllKeywords = (keys) => {
        return keys.every(key =>
          keywordMap[key].some(kw => xmlContent.includes(kw))
        );
      };
  
      if (containsAllKeywords(['recent', 'images', 'downloads', 'galaxyNote9'])) {
        console.log("🔄 Sử dụng coordinatesScanQREIB.json (màn hình có mục Downloads)");
        selectedCoords = coordinatesScanQREIB;
        break;
      }
  
      if (containsAllKeywords(['recent', 'downloads', 'galaxyNote9'])) {
        console.log("🔄 Sử dụng coordinatesScanQREIB2.json (màn hình không có mục Downloads)");
        selectedCoords = coordinatesScanQREIB2;
        break;
      }
    }
  
    await adbHelper.tapXY(device_id, ...selectedCoords['Galaxy-Note9']);
    await delay(600);                 
    await client.shell(device_id, `input swipe 500 1800 500 300`);                                               
    await delay(600); 
    await adbHelper.tapXY(device_id, ...selectedCoords['Target-Img']);    
    await delay(600);
    await adbHelper.tapXY(device_id, ...selectedCoords['Finish']); 
  
    return { status: 200, message: 'Success' };
  },

  scanQROCB: async ({ device_id }) => {    
    const coordinatesScanQROCB = await loadCoordinatesForDeviceScanQROCB(device_id);
    await adbHelper.tapXY(device_id, ...coordinatesScanQROCB['ScanQR']);
    await delay(500);                  
    await adbHelper.tapXY(device_id, ...coordinatesScanQROCB['Image']);
    await delay(1000);   
    await adbHelper.tapXY(device_id, ...coordinatesScanQROCB['Hamburger-Menu']);
    await delay(800);   
    await adbHelper.tapXY(device_id, ...coordinatesScanQROCB['Galaxy-Note9']);
    await delay(600);                 
    await client.shell(device_id, `input swipe 500 1800 500 300`);          
    await delay(600);
    await adbHelper.tapXY(device_id, ...coordinatesScanQROCB['Target-Img']); 
    await delay(600);
    await adbHelper.tapXY(device_id, ...coordinatesScanQROCB['Finish']);       

    return { status: 200, message: 'Success' };
  },

  clickScanQRNCB: async ({ device_id }) => {    
    const coordinatesScanQRNCB = await loadCoordinatesForDeviceScanQRNCB(device_id);    
    await adbHelper.tapXY(device_id, ...coordinatesScanQRNCB['Select-ScanQR']);      
    return { status: 200, message: 'Success' };
  },

  scanQRNCB: async ({ device_id }) => {    
    const coordinatesScanQRNCB = await loadCoordinatesForDeviceScanQRNCB(device_id);    
    await adbHelper.tapXY(device_id, ...coordinatesScanQRNCB['Select-Image']);        
    await delay(800); 
    await adbHelper.tapXY(device_id, ...coordinatesScanQRNCB['Select-Target-Img']); 
    await delay(800); 
    await adbHelper.tapXY(device_id, ...coordinatesScanQRNCB['Finish']); 
    return { status: 200, message: 'Success' };
  },

  scanQRNAB: async ({ device_id, localPath }) => {
    const coordinatesScanQRNAB = await loadCoordinatesForDeviceScanQRNAB(device_id);    
    const coordinatesScanQRNAB2 = await loadCoordinatesForDeviceScanQRNAB2(device_id);         
  
    await adbHelper.tapXY(device_id, ...coordinatesScanQRNAB['ScanQR']);             
    await delay(800);   
    await adbHelper.tapXY(device_id, ...coordinatesScanQRNAB['Image']);
    await delay(800);       
    await adbHelper.tapXY(device_id, ...coordinatesScanQRNAB['Hamburger-Menu']);
    await delay(800);
  
    let running = await isNABRunning({ device_id });
    if (!running) {      
      return;
    } 
    
    await clearTempFile({ device_id });
  
    let selectedCoords = coordinatesScanQRNAB;
    const targetDir = path.join('C:\\att_mobile_client\\logs\\');
      
    const keywordMap = {
      recent: ["Recent", "Gần đây"],
      images: ["Images", "Hình ảnh"],
      downloads: ["Downloads", "Tệp tải xuống"],
      galaxyNote9: ["Galaxy Note9"],
      bugReports: ["Bug reports", "Báo cáo lỗi"],
      gallery: ["Gallery", "Bộ sưu tập"]      
    };
  
    while (running) {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localDumpPath = path.join(targetDir, `${timestamp}.xml`);
  
      await dumpXmlToLocal(device_id, localDumpPath);
      const xmlContent = fs.readFileSync(localDumpPath, "utf-8").trim();
  
      // Helper function: kiểm tra xem nội dung XML có chứa tất cả keyword (dù là tiếng Anh hay tiếng Việt)
      const containsAllKeywords = (keys) => {
        return keys.every(key =>
          keywordMap[key].some(kw => xmlContent.includes(kw))
        );
      };
  
      if (containsAllKeywords(['recent', 'images', 'downloads', 'galaxyNote9', 'bugReports', 'gallery'])) {
        console.log("🔄 Sử dụng coordinatesScanQRNAB2.json (Bug reports detected)");
        selectedCoords = coordinatesScanQRNAB2;
        break;
      }
  
      if (containsAllKeywords(['recent', 'images', 'downloads', 'galaxyNote9', 'gallery'])) {
        console.log("🔄 Sử dụng coordinatesScanQRNAB.json (màn hình không có Bug reports)");
        selectedCoords = coordinatesScanQRNAB2;
        break;
      }
    }
  
    await adbHelper.tapXY(device_id, ...selectedCoords['Gallery']);
    await delay(800);                                               
    await adbHelper.tapXY(device_id, ...selectedCoords['Target-Img']);    
  
    return { status: 200, message: 'Success' };
  },

  // chưa test được đang đợi c Hira
  scanQRTPB: async ({ device_id }) => {    
    const coordinatesScanQRTPB = await loadCoordinatesForDeviceScanQRTPB(device_id);    
    const deviceModel = await deviceHelper.getDeviceModel(device_id);        

    await adbHelper.tapXY(device_id, ...coordinatesScanQRTPB['ScanQR']); 
    await delay(500);                  
    await adbHelper.tapXY(device_id, ...coordinatesScanQRTPB['Select-Image']); 
    await delay(500);     
    await adbHelper.tapXY(device_id, ...coordinatesScanQRTPB['Target-Image-1']); 

    // if (deviceModel === 'SM-G973') {  // Nếu là S10 thì click thêm Target-Image-2
    //   await delay(500);     
    //   await adbHelper.tapXY(device_id, ...coordinatesScanQRTPB['Target-Image-2']); 
    // }

    return { status: 200, message: 'Success' };
  },

  // Nếu mà dùng đã cài đăng nhập bằng mã PIN
  scanQRVPB: async ({ device_id }) => {    
    const coordinatesScanQRVPB = await loadCoordinatesForDeviceScanQRVPB(device_id);
    
    await adbHelper.tapXY(device_id, ...coordinatesScanQRVPB['Select-ScanQR']);                                

    return { status: 200, message: 'Success' };
  },

  // Nếu mà dùng mật khẩu để đăng nhập
  scanQRVPB2: async ({ device_id }) => {    
    const coordinatesScanQRVPB = await loadCoordinatesForDeviceScanQRVPB(device_id);
    
    await adbHelper.tapXY(device_id, ...coordinatesScanQRVPB['Select-ScanQR-2']);                                

    return { status: 200, message: 'Success' };
  },

  scanQRMB: async ({ device_id, localPath }) => {
    const coordinatesScanQRMB = await loadCoordinatesForDeviceScanQRMB(device_id);    
    const coordinatesScanQRMB2 = await loadCoordinatesForDeviceScanQRMB2(device_id);    
    const coordinatesScanQRMB3 = await loadCoordinatesForDeviceScanQRMB3(device_id);    
  
    await adbHelper.tapXY(device_id, ...coordinatesScanQRMB['ScanQR']);             
    await delay(800);   
    await adbHelper.tapXY(device_id, ...coordinatesScanQRMB['Image']);
    await delay(800);       
    await adbHelper.tapXY(device_id, ...coordinatesScanQRMB['Hamburger-Menu']);
    await delay(800);
  
    let running = await isMBRunning({ device_id });
    if (!running) {      
      return;
    } 
    
    await clearTempFile({ device_id });
  
    let selectedCoords = coordinatesScanQRMB;
    const targetDir = path.join('C:\\att_mobile_client\\logs\\');
      
    const keywordMap = {
      recent: ["Recent", "Gần đây"],
      images: ["Images", "Hình ảnh"],
      downloads: ["Downloads", "Tệp tải xuống"],
      bugReports: ["Bug reports", "Báo cáo lỗi"],
      gallery: ["Gallery", "Bộ sưu tập"],
      galaxyNote9: ["Galaxy Note9"]
    };
  
    while (running) {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localDumpPath = path.join(targetDir, `${timestamp}.xml`);
  
      await dumpXmlToLocal(device_id, localDumpPath);
      const xmlContent = fs.readFileSync(localDumpPath, "utf-8").trim();
  
      // Helper function: kiểm tra xem nội dung XML có chứa tất cả keyword (dù là tiếng Anh hay tiếng Việt)
      const containsAllKeywords = (keys) => {
        return keys.every(key =>
          keywordMap[key].some(kw => xmlContent.includes(kw))
        );
      };
  
      if (containsAllKeywords(['recent', 'images', 'downloads', 'galaxyNote9', 'bugReports', 'gallery'])) {
        console.log("🔄 Sử dụng coordinatesScanQRMB3 (Galaxy Note9 detected)");
        selectedCoords = coordinatesScanQRMB3;
        break;
      }
  
      if (containsAllKeywords(['recent', 'images', 'downloads', 'bugReports', 'gallery'])) {
        console.log("🔄 Sử dụng coordinatesScanQRMB2 (màn hình chứa Bộ sưu tập)");
        selectedCoords = coordinatesScanQRMB2;
        break;
      }
    }
  
    await adbHelper.tapXY(device_id, ...selectedCoords['Gallery']);
    await delay(800);                                               
    await adbHelper.tapXY(device_id, ...selectedCoords['Target-Img']);    
  
    return { status: 200, message: 'Success' };
  }, 
  
  scanQRSHBSAHA: async ({ device_id }) => {    
    const coordinatesScanQRSHBSAHA = await loadCoordinatesForDeviceScanQRSHBSAHA(device_id);
    
    await adbHelper.tapXY(device_id, ...coordinatesScanQRSHBSAHA['ScanQR']);
    await delay(600);                  
    await adbHelper.tapXY(device_id, ...coordinatesScanQRSHBSAHA['Image']);
    await delay(1000);   
    await adbHelper.tapXY(device_id, ...coordinatesScanQRSHBSAHA['Target-Img']);        

    return { status: 200, message: 'Success' };
  },

  clickPasswordFieldEIB: async ({ device_id }) => {    
    const coordinatesScanQREIB = await loadCoordinatesForDeviceScanQREIB(device_id);
    await adbHelper.tapXY(device_id, ...coordinatesScanQREIB['Password-Field']);      
    await adbHelper.tapXY(device_id, ...coordinatesScanQREIB['Password-Field']);
    return { status: 200, message: 'Success' };
  },    

  clickSelectImageMSB: async ({ device_id }) => {    
    const coordinatesScanQRMSB = await loadCoordinatesForDeviceScanQRMSB(device_id);
    
    await adbHelper.tapXY(device_id, ...coordinatesScanQRMSB['Select-Image']);
    await delay(800);                  
    await adbHelper.tapXY(device_id, ...coordinatesScanQRMSB['Select-Hamburgur-Menu']);           
    await delay(800); 
    await adbHelper.tapXY(device_id, ...coordinatesScanQRMSB['Select-Galaxy-Note9']); 
    await delay(800);
    await client.shell(device_id, `input swipe 500 1800 500 300`);    
    await client.shell(device_id, `input swipe 500 1800 500 300`);
    await delay(800); 
    await adbHelper.tapXY(device_id, ...coordinatesScanQRMSB['Select-Target-Img']); 
    await delay(800); 
    await adbHelper.tapXY(device_id, ...coordinatesScanQRMSB['Finish']); 

    return { status: 200, message: 'Success' };
  },

  clickConfirmMB: async ({ device_id }) => {    
    const coordinatesScanQRMB = await loadCoordinatesForDeviceScanQRMB(device_id);    
    await adbHelper.tapXY(device_id, ...coordinatesScanQRMB['Confirm']);      
    return { status: 200, message: 'Success' };
  },  

  clickLoginNAB: async ({ device_id }) => {    
    const coordinatesLoginNAB = await loadCoordinatesForDeviceLoginNAB(device_id);    
    await adbHelper.tapXY(device_id, ...coordinatesLoginNAB['Login']);      
    return { status: 200, message: 'Success' };
  },

  copyQRImages : async ({ device_id }) => {    
    if (!qrDevicePath) {
      console.error("❌ Cannot find the directory of QR!");
      return;
    }
    
    const sourcePath = qrDevicePath;
    const destinationDir = `/sdcard/`;

    console.log(`Copying img from ${sourcePath} in device: ${device_id}...`);

    for (let i = 1; i <= 10; i++) {
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

  scanQRBAB: async ({ device_id }) => {    
    const coordinatesScanQRBAB = await loadCoordinatesForDeviceScanQRBAB(device_id);    
    await adbHelper.tapXY(device_id, ...coordinatesScanQRBAB['ScanQR']); 
    await delay(500);                  
    await adbHelper.tapXY(device_id, ...coordinatesScanQRBAB['Select-Image']); 
    await delay(500);     
    await adbHelper.tapXY(device_id, ...coordinatesScanQRBAB['Select-Image-2']);             
    await delay(500);     
    await adbHelper.tapXY(device_id, ...coordinatesScanQRBAB['Target-Image']);                 
    return { status: 200, message: 'Success' };
  },    

  scanQRVPB: async ({ device_id }) => {    
    const coordinatesScanQRVPB = await loadCoordinatesForDeviceScanQRVPB(device_id);
    const deviceModel = await deviceHelper.getDeviceModel(device_id);        
    
    await adbHelper.tapXY(device_id, ...coordinatesScanQRVPB['Upload-Image']); 
    await delay(1000);                  
    await adbHelper.tapXY(device_id, ...coordinatesScanQRVPB['Select-Image']); 
    await delay(2000);     
    await adbHelper.tapXY(device_id, ...coordinatesScanQRVPB['Target-Image']); 

    if (deviceModel === 'ONEPLUS A5000') {  // Nếu là ONEPLUS A5000 thì click thêm Target-Image-2
      await delay(500);     
      await adbHelper.tapXY(device_id, ...coordinatesScanQRVPB['Target-Image-2']); 
    }

    return { status: 200, message: 'Success' };
  },    

  clickConfirmOCB: async ({ device_id }) => {    
    const coordinatesScanQROCB = await loadCoordinatesForDeviceScanQROCB(device_id);  
    await adbHelper.tapXY(device_id, ...coordinatesScanQROCB['Confirm']);      
    return { status: 200, message: 'Success' };
  },

  clickConfirmBIDV: async ({ device_id }) => {  
    const coordinatesScanQRBIDV = await loadCoordinatesForDeviceScanQRBIDV(device_id);
    await adbHelper.tapXY(device_id, ...coordinatesScanQRBIDV['Confirm']); 
    return { status: 200, message: 'Success' };
  },

  clickScanQRVTB: async ({ device_id }) => {    
    const coordinatesScanQRVTB = await loadCoordinatesForDeviceScanQRVTB(device_id);
    await adbHelper.tapXY(device_id, ...coordinatesScanQRVTB['Select-ScanQR']);      
    return { status: 200, message: 'Success' };
  },

  scanQRVTB: async ({ device_id }) => {    
    const coordinatesScanQRVTB = await loadCoordinatesForDeviceScanQRVTB(device_id);
    const deviceModel = await deviceHelper.getDeviceModel(device_id);        
        
    await adbHelper.tapXY(device_id, ...coordinatesScanQRVTB['ScanQR']); 
    await sleep(600); 
    await adbHelper.tapXY(device_id, ...coordinatesScanQRVTB['Image']);  
    await sleep(800);   
    if (deviceModel === 'SM-N960') {  // Nếu là S20 FE 5G thì chỉ cần Target-Img ở đây
      await adbHelper.tapXY(device_id, ...coordinatesScanQRVTB['Target-Img']);             
    }
    else {      
      await adbHelper.tapXY(device_id, ...coordinatesScanQRVTB['Hamburger-Menu']);
      await delay(800);   
      await adbHelper.tapXY(device_id, ...coordinatesScanQRVTB['ONEPLUS A5010']); // = Galaxy Note9
      await delay(700);                     
      await client.shell(device_id, `input swipe 500 1800 500 300`);
      await delay(700);
      await adbHelper.tapXY(device_id, ...coordinatesScanQRVTB['Target-Img']); 
      await delay(700);      
      await adbHelper.tapXY(device_id, ...coordinatesScanQRVTB['Finish']);
    }
     

    return { status: 200, message: 'Success' };
  },

  clickConfirmScanFaceBIDV: async ({ device_id }) => {    
    const coordinatesScanQRBIDV = await loadCoordinatesForDeviceScanQRBIDV(device_id);
    await adbHelper.tapXY(device_id, ...coordinatesScanQRBIDV['Confirm']);
    return { status: 200, message: 'Success' };
  },

  clickScanQRBIDV: async ({ device_id }) => {    
    const coordinatesScanQRBIDV = await loadCoordinatesForDeviceScanQRBIDV(device_id);    
    await adbHelper.tapXY(device_id, ...coordinatesScanQRBIDV['ScanQR']);      
    return { status: 200, message: 'Success' };
  },

  clickSelectImageBIDV: async ({ device_id }) => {    
    const coordinatesScanQRBIDV = await loadCoordinatesForDeviceScanQRBIDV(device_id);     
    await adbHelper.tapXY(device_id, ...coordinatesScanQRBIDV['Select-Image']);    
    return { status: 200, message: 'Success' };
  }, 

  stopAppADBBAB: async ({ device_id }) => {   
    await client.shell(device_id, 'input keyevent 3'); 
    await client.shell(device_id, 'am force-stop com.bab.retailUAT');
    console.log('Đã dừng app BAB');
    await delay(200);
    return { status: 200, message: 'Success' };
  },

  startAppADBBAB: async ({ device_id }) => {    
    await client.shell(device_id, 'am start -n com.bab.retailUAT/.MainActivity');
    console.log('Đang khởi động app Bac A Bank');
    await delay(200);
    return { status: 200, message: 'Success' };
  },

  stopAppADBOCB: async ({ device_id }) => {    
    await client.shell(device_id, 'input keyevent 3');
    await client.shell(device_id, 'am force-stop vn.com.ocb.awe');
    console.log('Đã dừng app OCB');
    await delay(200);
    return { status: 200, message: 'Success' };
  },

  startAppADBOCB: async ({ device_id }) => {    
    await client.shell(device_id, 'monkey -p vn.com.ocb.awe -c android.intent.category.LAUNCHER 1');
    console.log('Đang khởi động app OCB');
    await delay(200);
    return { status: 200, message: 'Success' };
  },

  stopAppADBACB: async ({ device_id }) => {    
    await client.shell(device_id, 'input keyevent 3');
    await client.shell(device_id, 'am force-stop mobile.acb.com.vn');
    console.log('Đã dừng app ACB');
    await delay(200);
    return { status: 200, message: 'Success' };
  },

  stopAppADBEIB: async ({ device_id }) => {    
    await client.shell(device_id, 'input keyevent 3');
    await client.shell(device_id, 'am force-stop com.vnpay.EximBankOmni');
    console.log('Đã dừng app EximBank EDigi');
    await delay(200);
    return { status: 200, message: 'Success' };
  },

  startAppADBACB: async ({ device_id }) => {    
    await client.shell(device_id, 'monkey -p mobile.acb.com.vn -c android.intent.category.LAUNCHER 1');
    console.log('Đang khởi động app ACB');
    await delay(200);
    return { status: 200, message: 'Success' };
  },  

  startAppADBEIB: async ({ device_id }) => {    
    await client.shell(device_id, 'input keyevent 3');
    await client.shell(device_id, 'monkey -p com.vnpay.EximBankOmni -c android.intent.category.LAUNCHER 1');
    console.log('Đang khởi động app Eximbank EDigi');
    await delay(200);
    return { status: 200, message: 'Success' };
  },

  stopAppADBBIDV: async ({ device_id }) => {    
    await client.shell(device_id, 'input keyevent 3');
    await client.shell(device_id, 'am force-stop com.vnpay.bidv');
    console.log('Đã dừng app BIDV');
    await delay(200);
    return { status: 200, message: 'Success' };
  },

  startAppADBBIDV: async ({ device_id }) => {
    console.log('Đang khởi động app BIDV...');
    await client.shell(device_id, 'monkey -p com.vnpay.bidv -c android.intent.category.LAUNCHER 1');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  stopAppADBNAB: async ({ device_id }) => {    
    await client.shell(device_id, 'input keyevent 3');
    await client.shell(device_id, 'am force-stop ops.namabank.com.vn');
    console.log('Đã dừng app NAB');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  stopAppADBTPB: async ({ device_id }) => {    
    await client.shell(device_id, 'input keyevent 3');
    await client.shell(device_id, 'am force-stop com.tpb.mb.gprsandroid');
    console.log('Đã dừng app TPB');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  stopAppADBVPB: async ({ device_id }) => {    
    await client.shell(device_id, 'input keyevent 3');
    await client.shell(device_id, 'am force-stop com.vnpay.vpbankonline');
    console.log('Đã dừng app VPB');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  startAppADBNAB: async ({ device_id }) => {
    console.log('Đang khởi động app NAB...');
    await client.shell(device_id, 'monkey -p ops.namabank.com.vn -c android.intent.category.LAUNCHER 1');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  startAppADBTPB: async ({ device_id }) => {
    console.log('Đang khởi động app TPB...');
    await client.shell(device_id, 'monkey -p com.tpb.mb.gprsandroid -c android.intent.category.LAUNCHER 1');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  startAppADBVPB: async ({ device_id }) => {
    console.log('Đang khởi động app VPB...');
    await client.shell(device_id, 'monkey -p com.vnpay.vpbankonline -c android.intent.category.LAUNCHER 1');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  stopAppADBMB: async ({ device_id }) => {    
    await client.shell(device_id, 'input keyevent 3');
    await client.shell(device_id, 'am force-stop com.mbmobile');
    console.log('Đã dừng app MB');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  startAppADBMB: async ({ device_id }) => {
    console.log('Đang khởi động app MB...');
    await client.shell(device_id, 'monkey -p com.mbmobile -c android.intent.category.LAUNCHER 1');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  stopAppADBNCB: async ({ device_id }) => {    
    await client.shell(device_id, 'input keyevent 3');
    await client.shell(device_id, 'am force-stop com.ncb.bank');
    console.log('Đã dừng app NCB');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  startAppADBNCB: async ({ device_id }) => {
    console.log('Đang khởi động app NCB...');
    await client.shell(device_id, 'monkey -p com.ncb.bank -c android.intent.category.LAUNCHER 1');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  startAppADBMSB: async ({ device_id }) => {
    console.log('Đang khởi động app MSB...');
    await client.shell(device_id, 'monkey -p vn.com.msb.smartBanking -c android.intent.category.LAUNCHER 1');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  stopAppADBMSB: async ({ device_id }) => {
    console.log('Đã dừng app MSB...');
    await client.shell(device_id, 'am force-stop vn.com.msb.smartBanking');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  stopAppADBVCB: async ({ device_id }) => {    
    await client.shell(device_id, 'input keyevent 3');
    await client.shell(device_id, 'am force-stop com.VCB');
    console.log('Đã dừng app VCB');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  startAppADBVCB: async ({ device_id }) => {
    console.log('Đang khởi động app VCB...');
    await client.shell(device_id, 'monkey -p com.VCB -c android.intent.category.LAUNCHER 1');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  stopAppADBVTB: async ({ device_id }) => {    
    await client.shell(device_id, 'input keyevent 3');
    await client.shell(device_id, 'am force-stop com.vietinbank.ipay');
    console.log('Đã dừng app VietinBank iPay');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  startAppADBVTB: async ({ device_id }) => {
    console.log('Đang khởi động app VietinBank iPay...');
    await client.shell(device_id, 'monkey -p com.vietinbank.ipay -c android.intent.category.LAUNCHER 1');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  stopAppADBSHBSAHA: async ({ device_id }) => {    
    await client.shell(device_id, 'input keyevent 3');
    await client.shell(device_id, 'am force-stop vn.shb.saha.mbanking');
    console.log('Đã dừng app SHB SAHA');
    await delay(500);
    return { status: 200, message: 'Success' };
  },

  startAppADBSHBSAHA: async ({ device_id }) => {
    console.log('Đang khởi động app SHB SAHA...');
    await client.shell(device_id, 'monkey -p vn.shb.saha.mbanking -c android.intent.category.LAUNCHER 1');
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

  checkDeviceMB: async ({ device_id }) => {
    try {
      const deviceModel = await deviceHelper.getDeviceModel(device_id);      
  
      const deviceCoordinates = coordinatesScanQRMB[deviceModel];             
      
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

  checkDeviceVTB: async ({ device_id }) => {
    try {
      const deviceModel = await deviceHelper.getDeviceModel(device_id);      
  
      const deviceCoordinates = coordinatesLoginVTB[deviceModel];             
      
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
    const coordinatesScanQRVPB = await loadCoordinatesForDeviceScanQRVPB(device_id);
        
    for (const char of text) {
      await adbHelper.tapXY(device_id, ...coordinatesScanQRVPB[char]);
      console.log('Log char of PIN:', char);
    }  

    return { status: 200, message: 'Success' };
  },

  inputPINMSB: async ({ device_id, text }) => {  
    const coordinatesScanQRMSB = await loadCoordinatesForDeviceScanQRMSB(device_id);
        
    for (const char of text) {
      await adbHelper.tapXY(device_id, ...coordinatesScanQRMSB[char]);
      console.log('Log char of PIN:', char);
    }  

    return { status: 200, message: 'Success' };
  },

  inputPINBIDV: async ({ device_id, text }) => {  
    const coordinatesScanQRBIDV = await loadCoordinatesForDeviceScanQRBIDV(device_id);
        
    for (const char of text) {
      await adbHelper.tapXY(device_id, ...coordinatesScanQRBIDV[char]);
      console.log('Log char of PIN:', char);
    }  

    return { status: 200, message: 'Success' };
  },

  inputPINVTB: async ({ device_id, text }) => {  
    const coordinatesScanQRVTB = await loadCoordinatesForDeviceScanQRVTB(device_id);
        
    for (const char of text) {
      await adbHelper.tapXY(device_id, ...coordinatesScanQRVTB[char]);
      console.log('Log char of PIN:', char);
    }  

    return { status: 200, message: 'Success' };
  },

  inputADBVTB: async ({ device_id, text }) => {  
    const coordinatesLoginVTB = await loadCoordinatesForDeviceLoginVTB(device_id);
        
    for (const char of text) {
      if (isUpperCase(char)) {
        await adbHelper.tapXY(device_id, ...coordinatesLoginVTB['CapsLock']);
        await sleep(50); 
        await adbHelper.tapXY(device_id, ...coordinatesLoginVTB[char]);        
        await sleep(50);
      }
      else if (isSpecialChar(char)) {
        await adbHelper.tapXY(device_id, ...coordinatesLoginVTB['!#1']);
        await sleep(50); 
        await adbHelper.tapXY(device_id, ...coordinatesLoginVTB[char]);        
        await sleep(50); 
        await adbHelper.tapXY(device_id, ...coordinatesLoginVTB['ABC']);
      }        
      else {
        await adbHelper.tapXY(device_id, ...coordinatesLoginVTB[char.toLowerCase()]);        
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

async function loadCoordinatesForDeviceScanQRBIDV(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

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

    const deviceCoordinates = coordinatesScanQRNAB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRNAB for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesForDeviceScanQRNAB2(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesScanQRNAB2[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRNAB for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesForDeviceScanQRNAB3(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesScanQRNAB3[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRNAB for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesForDeviceScanQRTPB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesScanQRTPB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRTPB for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesForDeviceScanQRVPB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesScanQRVPB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRVPB for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesForDeviceScanQRMB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesScanQRMB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRMB for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesForDeviceScanQRMB2(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesScanQRMB2[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRMB2 for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesForDeviceScanQRMB3(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesScanQRMB3[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRMB2 for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesForDeviceScanQRSHBSAHA(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesScanQRSHBSAHA[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRSHBSAHA for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesForDeviceLoginACB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesLoginACB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesLoginACB for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesForDeviceScanQRACB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesScanQRACB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRACB for device: ${error.message}`);
    throw error;
  }
}

async function loadCoordinatesForDeviceScanQREIB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesScanQREIB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQREIB for device: ${error.message}`);
    throw error;
  }
}

async function loadCoordinatesForDeviceScanQREIB2(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesScanQREIB2[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQREIB for device: ${error.message}`);
    throw error;
  }
}

async function loadCoordinatesForDeviceScanQRMSB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesScanQRMSB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRMSB for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesForDeviceScanQRNCB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesScanQRNCB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRNCB for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesForDeviceScanQRBAB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesScanQRBAB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQROCB for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesForDeviceScanQROCB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesScanQROCB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQROCB for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesForDeviceScanQRVTB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);

    const deviceCoordinates = coordinatesScanQRVTB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRVTB for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesForDeviceLoginVTB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    

    const deviceCoordinates = coordinatesLoginVTB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesLoginVTB for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesForDeviceLoginNAB(device_id) {
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