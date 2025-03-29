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
const coordinatesScanQREXIM = require('../config/coordinatesScanQREXIM.json');
const coordinatesLoginVTB = require('../config/coordinatesLoginVTB.json');
const coordinatesLoginNAB = require('../config/coordinatesLoginNAB.json');
const coordinatesScanQRNAB = require('../config/coordinatesScanQRNAB.json');
const coordinatesScanQRTPB = require('../config/coordinatesScanQRTPB.json');
const coordinatesScanQRVPB = require('../config/coordinatesScanQRVPB.json');
const coordinatesScanQRMB = require('../config/coordinatesScanQRMB.json');
const coordinatesScanQRNCB = require('../config/coordinatesScanQRNCB.json');
const coordinatesScanQRMSB = require('../config/coordinatesScanQRMSB.json');
const coordinatesScanQRVTB = require('../config/coordinatesScanQRVTB.json');
const coordinatesScanQRBIDV = require('../config/coordinatesScanQRBIDV.json');
const coordinatesScanQROCB = require('../config/coordinatesScanQROCB.json');
const coordinatesScanQRBAB = require('../config/coordinatesScanQRBAB.json');

const adbHelper = require('../helpers/adbHelper');
const deviceHelper = require('../helpers/deviceHelper');

const ensureDirectoryExists = ( dirPath ) => {
  if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
  }
}

const { isACBRunning } = require('../functions/checkAppBankStatus');
const { isEXIMRunning } = require('../functions/checkAppBankStatus');
const { isMBRunning } = require('../functions/checkAppBankStatus');
const { isMSBRunning } = require('../functions/checkAppBankStatus');
const { isOCBRunning } = require('../functions/checkAppBankStatus');
const { isNABRunning } = require('../functions/checkAppBankStatus');
const { isTPBRunning } = require('../functions/checkAppBankStatus');
const { isVPBRunning } = require('../functions/checkAppBankStatus');

const { qrDevicePath, filename } = require('../functions/endpoint');

async function clearTempFile( { device_id } ) {
  try {            
      await client.shell(device_id, `rm /sdcard/temp_dump.xml`);
      await delay(1000);
      console.log('Clear temp file successfully!');
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
    console.log(`XML dump pulled directly to local: ${localPath}`);
  } catch (error) {
      console.error(`Error during XML dump to local. ${error.message}`);
  }
}

const jsonFilePath = "C:\\att_mobile_client\\database\\info-qr.json";

// Bảng ánh xạ tên ngân hàng sang mã BIN khi dùng MB Bank
const bankBinMapMB = {
    "Asia (ACB)": "970416",
    "Vietnam Foreign Trade (VCB)": "970436",
    "Vietnam Industry and Trade (VIETINBANK)": "970415",
    "Technology and Trade (TCB)": "970407",
    "Investment and development (BIDV)": "970418",
    "Military (MB)": "970422",
    "NCB": "970419",
    
    "Á Châu (ACB)": "970416",
    "Ngoại thương Việt Nam (VCB)": "970436",
    "Công Thương Việt Nam (VIETINBANK)": "970415",
    "Kỹ Thương (TCB)": "970407",
    "Đầu tư và phát triển (BIDV)": "970418",
    "Quân đội (MB)": "970422",
    "Quốc Dân (NCB)": "970419"
};

// Bảng ánh xạ tên ngân hàng sang mã BIN khi dùng OCB
const bankBinMapOCB = {
  "Asia (ACB)": "970416",
  "Vietnam Foreign Trade (VCB)": "970436",
  "Vietinbank (Vietnam Joint Stock Commercial Bank for Industry and Trade)": "970415", "Ngân hàng TMCP Công Thương Việt Nam": "970415",  
  "Technology and Trade (TCB)": "970407",
  "Investment and development (BIDV)": "970418", "Ngân hàng TMCP Đầu Tư và Phát Triển Việt Nam": "970418",
  "Military (MB)": "970422", "Ngân hàng TMCP Quân Đội": "970422",
  "NCB": "970419", "Ngân hàng TMCP Quốc Dân": "970419"  
};

// Bảng ánh xạ tên ngân hàng sang mã BIN khi dùng NAB
const bankBinMapNAB = {
  // chưa xong
};

// Bảng ánh xạ tên ngân hàng sang mã BIN khi dùng MSB
const bankBinMapMSB = {
  // chưa xong
};

const compareData = (xmlData, jsonData) => {
    let differences = [];
    if (xmlData.bin !== jsonData.bin) differences.push(`BIN khác: XML(${xmlData.bin}) ≠ JSON(${jsonData.bin})`);
    if (xmlData.account_number !== String(jsonData.account_number)) differences.push(`Số tài khoản khác: XML(${xmlData.account_number}) ≠ JSON(${jsonData.account_number})`);
    if (Number(xmlData.amount) !== Number(jsonData.amount)) differences.push(`Số tiền khác: XML(${xmlData.amount}) ≠ JSON(${jsonData.amount})`);
    return differences;
};

const checkXmlContentMB = async (device_id, localPath) => {
  try {
    const chatId = '-4725254373';
    const telegramToken = '7884594856:AAEKZXIBH2IaROGR_k6Q49IP2kSt8uJ4wE0';

    if (!fs.existsSync(localPath)) {
      console.log("⚠ File XML không tồn tại, dừng luôn.");
      return;
    }

    const content = fs.readFileSync(localPath, "utf-8").trim();

    const screenKeywords = [
      {
        name: "Chuyển tiền",
        vi: ["Số tài&#10;khoản", "Số&#10;điện thoại", "&#10;Số thẻ", "Truy vấn giao dịch giá trị lớn", "Đối tác MB", "Chuyển tiền"],
        en: ["Account", "Phone number", "Card", "Large-value transaction inquiry", "MB partner", "Transfer"]
      }
    ];

    // const keywordsVI = [
    //   "Số tài&#10;khoản", "Số&#10;điện thoại", "&#10;Số thẻ",
    //   "Truy vấn giao dịch giá trị lớn", "Đối tác MB", "Chuyển tiền"
    // ];
    // const keywordsEN = [
    //   "Account", "Phone number", "Card",
    //   "Large-value transaction inquiry", "MB partner", "Transfer"
    // ];

    // if (keywordsVI.every(kw => content.includes(kw)) || keywordsEN.every(kw => content.includes(kw))) {
    //   console.log("🚨 Phát hiện có thao tác bất thường!");

    //   console.log('Dừng luôn app MB Bank');
    //   await stopMBApp ( { device_id } );                

    //   await sendTelegramAlert(
    //     telegramToken,
    //     chatId,
    //     `🚨 Cảnh báo! Phát hiện có thao tác bất thường ${device_id}`
    //   );

    //   await saveAlertToDatabase({
    //     timestamp: new Date().toISOString(),
    //     reason: 'Phát hiện có thao tác bất thường',
    //     filePath: localPath 
    //   });

    //   return;
    // }

    for (const screen of screenKeywords) {
      if (
        screen.vi.every(kw => content.includes(kw)) ||
        screen.en.every(kw => content.includes(kw))
      ) {
        console.log(`🚨 Phát hiện có thao tác bất thường ở màn hình: ${screen.name}`);

        console.log('Đóng app MB');
        await stopMBApp({ device_id });

        await sendTelegramAlert(
          telegramToken,
          chatId,
          `🚨 Cảnh báo! Phát hiện có thao tác bất thường ở màn hình: ${screen.name} (id thiết bị: ${device_id})`
        );

        await saveAlertToDatabase({
          timestamp: new Date().toISOString(),
          reason: `Phát hiện có thao tác bất thường ở màn hình: ${screen.name}`,
          filePath: localPath
        });

        return;
      }
    }

    const parsed = await xml2js.parseStringPromise(content, { explicitArray: false, mergeAttrs: true });
    const extractedData = extractNodesMB(parsed);

    console.log('log extractedData:', extractedData);

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

        console.log('Dừng luôn app MB Bank');
        await stopMBApp ( { device_id } );          

        await sendTelegramAlert(
          telegramToken,
          chatId,
          `🚨 Cảnh báo! Phát hiện có thao tác bất thường ${device_id}`
        );

        await saveAlertToDatabase({
          timestamp: new Date().toISOString(),
          reason: 'Phát hiện có thao tác bất thường',
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

const checkXmlContentOCB = async (device_id, localPath) => {
  try {
    const chatId = '-4725254373';
    const telegramToken = '7884594856:AAEKZXIBH2IaROGR_k6Q49IP2kSt8uJ4wE0';

    if (!fs.existsSync(localPath)) {
      console.log("⚠ File XML không tồn tại, dừng luôn.");
      return;
    }

    const content = fs.readFileSync(localPath, "utf-8").trim();

    const screenKeywords = [
      {
        name: "Chuyển tiền",
        vi: ["Chuyển tiền", "Trong OCB", "Ngân hàng khác", "Đến số thẻ", "Xem tất cả", "Chuyển gần đây"],
        en: ["Transfer money", "Within OCB", "Interbank", "To card number", "See all", "Recent transferred"]
      }
    ];

    for (const screen of screenKeywords) {
      if (
        screen.vi.every(kw => content.includes(kw)) ||
        screen.en.every(kw => content.includes(kw))
      ) {
        console.log(`🚨 Phát hiện có thao tác bất thường ở màn hình: ${screen.name}`);

        console.log('Đóng app OCB');
        await stopOCBApp({ device_id });

        await sendTelegramAlert(
          telegramToken,
          chatId,
          `🚨 Cảnh báo! Phát hiện có thao tác bất thường ở màn hình: ${screen.name} (${device_id})`
        );

        await saveAlertToDatabase({
          timestamp: new Date().toISOString(),
          reason: `Phát hiện có thao tác bất thường ở màn hình: ${screen.name}`,
          filePath: localPath
        });

        return;
      }
    }

    const parsed = await xml2js.parseStringPromise(content, { explicitArray: false, mergeAttrs: true });
    const extractedData = extractNodesOCB(parsed);

    console.log('log extractedData:', extractedData);

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

        console.log('Đóng app OCB OMNI');
        await stopOCBApp ( { device_id } );          

        await sendTelegramAlert(
          telegramToken,
          chatId,
          `🚨 Cảnh báo! Phát hiện có thao tác bất thường ${device_id}`
        );

        await saveAlertToDatabase({
          timestamp: new Date().toISOString(),
          reason: 'Phát hiện có thao tác bất thường',
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

const checkXmlContentACB = async (device_id, localPath) => {
  try {
    const chatId = '-4725254373';
    const telegramToken = '7884594856:AAEKZXIBH2IaROGR_k6Q49IP2kSt8uJ4wE0';

    if (!fs.existsSync(localPath)) {
      console.log("⚠ File XML không tồn tại, dừng luôn.");
      return;
    }

    const content = fs.readFileSync(localPath, "utf-8").trim();

    const keywordsVI = [
      "Chuyển tiền", 
      "Chuyển tiền đến", 
      "Tài khoản ngân hàng", 
      "Thẻ ngân hàng", 
      "CMND / Hộ chiếu", 
      "Số điện thoại"
    ];
    const keywordsEN = [
      "Transfer",
      "Transfer to",
      "Bank account",
      "Bank card",
      "ID / Passport",
      "Cellphone number",
    ];

    if (keywordsVI.every(kw => content.includes(kw)) || keywordsEN.every(kw => content.includes(kw))) {
      console.log("🚨 Phát hiện có thao tác bất thường!");

      console.log('Dừng luôn app ACB');
      await stopACBApp ( { device_id } );                

      await sendTelegramAlert(
        telegramToken,
        chatId,
        `🚨 Cảnh báo! Phát hiện có thao tác bất thường ${device_id}`
      );

      await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason: 'Phát hiện có thao tác bất thường',
        filePath: localPath 
      });

      return;
    }    
  } catch (error) {    
      console.error("❌ Lỗi xử lý XML:", error.message);
  }
}

function extractNodesMB(obj) {
  let bin = null, account_number = null, amount = null;
  const bankList = [
    "Asia (ACB)", "Á Châu (ACB)", 
    "Vietnam Foreign Trade (VCB)", "Ngoại thương Việt Nam (VCB)", 
    "Vietnam Industry and Trade (VIETINBANK)", "Công Thương Việt Nam (VIETINBANK)",
    "Technology and Trade (TCB)", "Kỹ Thương (TCB)", 
    "Investment and development (BIDV)", "Đầu tư và phát triển (BIDV)", 
    "Military (MB)", "Quân đội (MB)", 
    "NCB", "Quốc Dân (NCB)"
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

      console.log(`🔍 Scanning: "${text}"`);

      // 1️⃣ Tìm ngân hàng trước
      if (!bin) {
        for (let bank of bankList) {
          if (text.includes(bank)) {
            bin = bankBinMapMB[bank] || bank;
            foundBank = true;
            console.log(`🏦 Tìm thấy ngân hàng: ${bin}`);
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
          console.log(`💳 Tìm thấy Số tài khoản: ${account_number}`);
          return;
        }
      }

      // 3️⃣ Tìm số tiền giao dịch lớn nhất
      const amountMatch = text.match(/^\d{1,3}(?:,\d{3})*$/);
      if (amountMatch) {
        let extractedAmount = parseInt(amountMatch[0].replace(/,/g, ''), 10); // Bỏ dấu `,` và convert thành số
        if (extractedAmount > maxAmount) {
          maxAmount = extractedAmount;
          console.log(`✅ Tìm thấy số tiền giao dịch: ${maxAmount}`);
        }
      }
    }
  }

  traverse(obj);
  amount = maxAmount;

  return { bin, account_number, amount };
}

function extractNodesOCB(obj) {
  let bin = null, account_number = null, amount = null;
  const bankList = [
    "ACB (Asia Commercial Bank)", "Ngân hàng TMCP Á Châu", 
    "Vietcombank (Bank for Foreign Trade of Vietnam)", "Ngân hàng TMCP Ngoại Thương Việt Nam", 
    "Vietinbank (Vietnam Joint Stock Commercial Bank for Industry and Trade)", "Ngân hàng TMCP Công Thương Việt Nam",
    "Techcombank (Vietnam Technological and Commercial Joint Stock Bank)", "Ngân hàng TMCP Kỹ Thương Việt Nam", 
    "BIDV (Bank for Investment and Development of Vietnam)", "Ngân hàng TMCP Đầu Tư và Phát Triển Việt Nam", 
    "Military Commercial Joint Stock Bank", "Ngân hàng TMCP Quân Đội", 
    "National Citizen Bank", "Ngân hàng TMCP Quốc Dân"
  ];

  let foundBank = false;
  let foundAccount = false;

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

        console.log(`🔍 Scanning: "${text}"`);

        // 1️⃣ Tìm ngân hàng
        if (!bin) {
          for (let bank of bankList) {
            if (text.includes(bank)) {
              bin = bankBinMapOCB[bank] || bank;
              foundBank = true;
              console.log(`🏦 Tìm thấy ngân hàng: ${bin}`);
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
                console.log(`💳 Tìm thấy số tài khoản: ${account_number}`);
                return;
              }
          }
      }

      // 3️⃣ Lấy số tiền từ đúng thẻ có resource-id="vn.com.ocb.awe:id/edtInput"
      if (typeof node === 'object' && node['resource-id'] === 'vn.com.ocb.awe:id/edtInput' && node.text) {
        amount = parseInt(node.text.replace(/,/g, ''), 10);
        console.log(`✅ Tìm thấy số tiền giao dịch chính xác: ${amount}`);
      }
  }

  traverse(obj);
  return { bin, account_number, amount };
}

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

          console.log(`🔍 Scanning: "${text}"`);

          // 1️⃣ Tìm ngân hàng trước
          if (!bin) {
              for (let bank of bankList) {
                  if (text.includes(bank)) {
                      bin = bankBinMapNAB[bank] || bank;
                      foundBank = true;
                      console.log(`🏦 Tìm thấy ngân hàng: ${bin}`);
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
                  console.log(`💳 Tìm thấy Số tài khoản: ${account_number}`);
                  return;
              }
          }

          // 3️⃣ Tìm số tiền giao dịch lớn nhất
          const amountMatch = text.match(/^\d{1,3}(?:,\d{3})*$/);
          if (amountMatch) {
              let extractedAmount = parseInt(amountMatch[0].replace(/,/g, ''), 10); // Bỏ dấu `,` và convert thành số
              if (extractedAmount > maxAmount) {
                  maxAmount = extractedAmount;
                  console.log(`✅ Tìm thấy số tiền giao dịch: ${maxAmount}`);
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

          console.log(`🔍 Scanning: "${text}"`);

          // 1️⃣ Tìm ngân hàng trước
          if (!bin) {
              for (let bank of bankList) {
                  if (text.includes(bank)) {
                      bin = bankBinMapMSB[bank] || bank;
                      foundBank = true;
                      console.log(`🏦 Tìm thấy ngân hàng: ${bin}`);
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
                  console.log(`💳 Tìm thấy Số tài khoản: ${account_number}`);
                  return;
              }
          }

          // 3️⃣ Tìm số tiền giao dịch lớn nhất
          const amountMatch = text.match(/^\d{1,3}(?:,\d{3})*$/);
          if (amountMatch) {
              let extractedAmount = parseInt(amountMatch[0].replace(/,/g, ''), 10); // Bỏ dấu `,` và convert thành số
              if (extractedAmount > maxAmount) {
                  maxAmount = extractedAmount;
                  console.log(`✅ Tìm thấy số tiền giao dịch: ${maxAmount}`);
              }
          }
      }
  }

  traverse(obj);
  amount = maxAmount;

  return { bin, account_number, amount };
}

const checkXmlContentNAB = async (device_id, localPath) => {
  try {
    const chatId = '-4725254373';
    const telegramToken = '7884594856:AAEKZXIBH2IaROGR_k6Q49IP2kSt8uJ4wE0';

    if (!fs.existsSync(localPath)) {
      console.log("⚠ File XML không tồn tại, dừng luôn.");
      return;
    }

    const content = fs.readFileSync(localPath, "utf-8").trim();

    const keywordsVI = [
      "Tài khoản",
      "Thẻ",
      "Quét QR",
      "Chuyển tiền quốc tế",
      "Danh bạ &#10; người nhận",
      "Danh sách &#10; lịch chuyển tiền"
    ];

    const keywordsEN = [
      "Account",
      "Card",
      "QR code",
      "International payments",      
      "Danh bạ &#10; người nhận",
      "Danh sách &#10; lịch chuyển tiền"
    ];

    if (keywordsVI.every(kw => content.includes(kw)) || keywordsEN.every(kw => content.includes(kw))) {
      console.log("🚨 Phát hiện có thao tác bất thường!");

      console.log('Đóng app NAB');
      await stopNABApp ( { device_id } );                

      await sendTelegramAlert(
        telegramToken,
        chatId,
        `🚨 Cảnh báo! Phát hiện có thao tác bất thường ${device_id}`
      );

      await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason: 'Phát hiện có thao tác bất thường',
        filePath: localPath 
      });

      return;
    }

    // scan QR xong chi edit duoc description nen khong can extract data o day nua.
    // const parsed = await xml2js.parseStringPromise(content, { explicitArray: false, mergeAttrs: true });
    // const extractedData = extractNodesNAB(parsed);

    // console.log('log extractedData:', extractedData);

    // if (extractedData.bin && extractedData.account_number && extractedData.amount) {
    //   console.log("⚠ XML có chứa dữ liệu giao dịch: bin (bank name) account_number, amount. Đang so sánh trong info-qr.json.");      

    //   let jsonData = {};
    //   if (fs.existsSync(jsonFilePath)) {
    //     try {        
    //       const rawData = fs.readFileSync(jsonFilePath, "utf8");
    //       jsonData = JSON.parse(rawData).data || {};        
    //     } catch (error) {          
    //       console.warn("⚠ Không thể đọc dữ liệu cũ, đặt về object rỗng.");
    //       jsonData = {};          
    //     }
    //   }

    //   const differences = compareData(extractedData, jsonData);
    //   if (differences.length > 0) {
    //     console.log(`⚠ Dữ liệu giao dịch thay đổi!\n${differences.join("\n")}`);

    //     console.log('Dừng luôn app MB');
    //     await stopNABApp ( { device_id } );          

    //     await sendTelegramAlert(
    //       telegramToken,
    //       chatId,
    //       `🚨 Cảnh báo! Phát hiện có thao tác bất thường ${device_id}`
    //     );

    //     await saveAlertToDatabase({
    //       timestamp: new Date().toISOString(),
    //       reason: 'Phát hiện có thao tác bất thường',
    //       filePath: localPath 
    //     });

    //     return true;
    //   } else {
    //     console.log("✅ Dữ liệu giao dịch KHÔNG thay đổi, bỏ qua.");
    //     return false;
    //   }
    // }    
  } catch (error) {    
      console.error("❌ Lỗi xử lý XML:", error.message);
  }
};

// không dump được nữa
const checkXmlContentTPB = async (device_id, localPath) => {
  try {
    const chatId = '-4725254373';
    const telegramToken = '7884594856:AAEKZXIBH2IaROGR_k6Q49IP2kSt8uJ4wE0';

    if (!fs.existsSync(localPath)) {
      console.log("⚠ File XML không tồn tại, dừng luôn.");
      return;
    }

    const content = fs.readFileSync(localPath, "utf-8").trim();

    const screenKeywords = [
      {
        name: "Chuyển tiền/Chatpay",                
        vi: ["Chuyển tiền ChatPay", "Người Nhận Mới - Trong TPBank", "Người Nhận Mới - Liên Ngân Hàng/Thẻ", "Dán Thông Tin Chuyển Tiền"],
        en: ["Chuyển tiền ChatPay", "Người Nhận Mới - Trong TPBank", "Người Nhận Mới - Liên Ngân Hàng/Thẻ", "Dán Thông Tin Chuyển Tiền"] 
      }
    ];

    for (const screen of screenKeywords) {
      if (
        screen.vi.every(kw => content.includes(kw)) ||
        screen.en.every(kw => content.includes(kw))
      ) {
        console.log(`🚨 Phát hiện có thao tác bất thường ở màn hình: ${screen.name}`);

        console.log('Đóng app TPB');
        await stopTPBApp({ device_id });

        await sendTelegramAlert(
          telegramToken,
          chatId,
          `🚨 Cảnh báo! Phát hiện có thao tác bất thường ở màn hình: ${screen.name} (${device_id})`
        );

        await saveAlertToDatabase({
          timestamp: new Date().toISOString(),
          reason: `Phát hiện có thao tác bất thường ở màn hình: ${screen.name}`,
          filePath: localPath
        });

        return;
      }
    }

    // scan QR xong >> chi co the edit duoc description => khong can extract data o day nua.           
  } catch (error) {    
      console.error("❌ Lỗi xử lý XML:", error.message);
  }
};

const checkXmlContentVPB = async (device_id, localPath) => {
  try {
    const chatId = '-4725254373';
    const telegramToken = '7884594856:AAEKZXIBH2IaROGR_k6Q49IP2kSt8uJ4wE0';

    if (!fs.existsSync(localPath)) {
      console.log("⚠ File XML không tồn tại, dừng luôn.");
      return;
    }

    const content = fs.readFileSync(localPath, "utf-8").trim();

    const keywordsVI = [
      "Tới tài khoản",
      "Tới thẻ",
      "Tới tài khoản/&#10;thẻ của tôi",
      "Cộng đồng&#10;thịnh vượng"
    ];

    const keywordsEN = [
      ""
    ];

    if (keywordsVI.every(kw => content.includes(kw)) ) {
      console.log("🚨 Phát hiện có thao tác bất thường!");

      console.log('Đóng app VPB');
      await stopVPBApp ( { device_id } );                

      await sendTelegramAlert(
        telegramToken,
        chatId,
        `🚨 Cảnh báo! Phát hiện có thao tác bất thường ${device_id}`
      );

      await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason: 'Phát hiện có thao tác bất thường',
        filePath: localPath 
      });

      return;
    }

    // scan QR xong chi edit duoc description nen khong can extract data o day nua.
    // const parsed = await xml2js.parseStringPromise(content, { explicitArray: false, mergeAttrs: true });
    // const extractedData = extractNodesNAB(parsed);

    // console.log('log extractedData:', extractedData);

    // if (extractedData.bin && extractedData.account_number && extractedData.amount) {
    //   console.log("⚠ XML có chứa dữ liệu giao dịch: bin (bank name) account_number, amount. Đang so sánh trong info-qr.json.");      

    //   let jsonData = {};
    //   if (fs.existsSync(jsonFilePath)) {
    //     try {        
    //       const rawData = fs.readFileSync(jsonFilePath, "utf8");
    //       jsonData = JSON.parse(rawData).data || {};        
    //     } catch (error) {          
    //       console.warn("⚠ Không thể đọc dữ liệu cũ, đặt về object rỗng.");
    //       jsonData = {};          
    //     }
    //   }

    //   const differences = compareData(extractedData, jsonData);
    //   if (differences.length > 0) {
    //     console.log(`⚠ Dữ liệu giao dịch thay đổi!\n${differences.join("\n")}`);

    //     console.log('Dừng luôn app MB');
    //     await stopNABApp ( { device_id } );          

    //     await sendTelegramAlert(
    //       telegramToken,
    //       chatId,
    //       `🚨 Cảnh báo! Phát hiện có thao tác bất thường ${device_id}`
    //     );

    //     await saveAlertToDatabase({
    //       timestamp: new Date().toISOString(),
    //       reason: 'Phát hiện có thao tác bất thường',
    //       filePath: localPath 
    //     });

    //     return true;
    //   } else {
    //     console.log("✅ Dữ liệu giao dịch KHÔNG thay đổi, bỏ qua.");
    //     return false;
    //   }
    // }    
  } catch (error) {    
      console.error("❌ Lỗi xử lý XML:", error.message);
  }
};

// chưa xong
const checkXmlContentMSB = async (device_id, localPath) => {
  try {
    const chatId = '-4725254373';
    const telegramToken = '7884594856:AAEKZXIBH2IaROGR_k6Q49IP2kSt8uJ4wE0';

    if (!fs.existsSync(localPath)) {
      console.log("⚠ File XML không tồn tại, dừng luôn.");
      return;
    }

    const content = fs.readFileSync(localPath, "utf-8").trim();

    const keywordsVI = [
      // chưa xong
    ];
    const keywordsEN = [      
      // chưa xong
    ];

    if (keywordsVI.every(kw => content.includes(kw)) || keywordsEN.every(kw => content.includes(kw))) {
      console.log("🚨 Phát hiện có thao tác bất thường!");

      console.log('Đóng app MSB');
      await stopMSBApp ( { device_id } );                

      await sendTelegramAlert(
        telegramToken,
        chatId,
        `🚨 Cảnh báo! Phát hiện có thao tác bất thường ${device_id}`
      );

      await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason: 'Phát hiện có thao tác bất thường',
        filePath: localPath 
      });

      return;
    }

    const parsed = await xml2js.parseStringPromise(content, { explicitArray: false, mergeAttrs: true });
    const extractedData = extractNodesMSB(parsed);

    console.log('log extractedData:', extractedData);

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
        await stopMSBApp ( { device_id } );          

        await sendTelegramAlert(
          telegramToken,
          chatId,
          `🚨 Cảnh báo! Phát hiện có thao tác bất thường ${device_id}`
        );

        await saveAlertToDatabase({
          timestamp: new Date().toISOString(),
          reason: 'Phát hiện có thao tác bất thường',
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

async function stopNABApp ({ device_id }) {    
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop ops.namabank.com.vn');
  console.log('Dừng luôn app NAB');
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopBABApp ({ device_id }) {    
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop com.bab.retailUAT');
  console.log('Dừng luôn app BAB');
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopTPBApp ({ device_id }) {    
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop com.tpb.mb.gprsandroid');
  console.log('Dừng luôn app TPB');
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopVPBApp ({ device_id }) {    
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop com.vnpay.vpbankonline');
  console.log('Dừng luôn app VPB');
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopMBApp ({ device_id }) {    
  await client.shell(device_id, 'am force-stop com.mbmobile');
  console.log('Đã dừng app MB');
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopOCBApp ({ device_id }) {    
  await client.shell(device_id, 'am force-stop vn.com.ocb.awe');
  console.log('Đã dừng app OCB OMNI');
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopOCBApp ({ device_id }) {    
  await client.shell(device_id, 'am force-stop vn.com.ocb.awe');
  console.log('Đã dừng app OCB OMNI');
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopMSBApp ({ device_id }) {    
  await client.shell(device_id, 'am force-stop vn.com.msb.smartBanking');
  console.log('Đã dừng app MSB');
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopACBApp ({ device_id }) {    
  await client.shell(device_id, 'am force-stop mobile.acb.com.vn');
  console.log('Đã dừng app ACB');
  await delay(500);
  return { status: 200, message: 'Success' };
}

const { sendTelegramAlert } = require('../services/telegramService');
const { saveAlertToDatabase } = require('../controllers/alert.controller');

module.exports = {
  trackOCB : async ( { device_id } ) => {
    const targetDir = path.join('C:\\att_mobile_client\\logs\\');
    ensureDirectoryExists(targetDir);

    console.log('🔍 Bắt đầu theo dõi NAB App...');
    
    const chatId = '-4725254373';    

    if (!chatId) {
      console.error("Cannot continue cause of invalid chat ID.");
      return;
    } 

    let running = await isOCBRunning( { device_id } );

    if (!running) {
        console.log("OCB đang không chạy.");
        return;
    }
        
    await clearTempFile( { device_id } );
    
    while (running) {
      console.log('App OCB đang chạy');
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);
    
      await dumpXmlToLocal( device_id, localPath );
      await checkXmlContentOCB( device_id, localPath );   
                      
      running = await isOCBRunning( { device_id } );
    
      if (!running) {            
        console.log('🚫 OCB OMNI đã tắt. Dừng theo dõi.');
        await clearTempFile( { device_id } );      
        return false;          
      }
    }
    return { status: 200, message: 'Success' };
  },

  trackACB : async ( { device_id } ) => {
    const targetDir = path.join('C:\\att_mobile_client\\logs\\');
    ensureDirectoryExists(targetDir);

    console.log('🔍 Bắt đầu theo dõi ACB...');
    
    const chatId = '-4725254373';    

    if (!chatId) {
      console.error("Cannot continue cause of invalid chat ID.");
      return;
    } 

    let running = await isACBRunning( { device_id } );

    if (!running) {      
      console.log("ACB đang không chạy.");
      return;
    }
        
    await clearTempFile( { device_id } );
    
    while (running) {
      console.log('ACB đang chạy');
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);
    
      await dumpXmlToLocal( device_id, localPath );
      await checkXmlContentACB( device_id, localPath );                
    
      running = await isACBRunning( { device_id } );
    
      if (!running) {            
        console.log('🚫 ACB đã tắt. Dừng theo dõi.');
        await clearTempFile( { device_id } );      
        return false;          
      }
    }
    return { status: 200, message: 'Success' };
  },

  trackEXIM : async ( { device_id } ) => {
    const targetDir = path.join('C:\\att_mobile_client\\logs\\');
    ensureDirectoryExists(targetDir);

    console.log('🔍 Bắt đầu theo dõi NAB App...');
    
    const chatId = '-4725254373';    

    if (!chatId) {
      console.error("Cannot continue cause of invalid chat ID.");
      return;
    } 

    let running = await isEXIMRunning( { device_id } );

    if (!running) {
      console.log("EXIM đang không chạy.");
      return;
    }
        
    await clearTempFile( { device_id } );
    
    while (running) {
      console.log('Eximbank EDigi đang chạy');
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);
    
      await dumpXmlToLocal( device_id, localPath );
      // await checkXmlContentEXIM( device_id, localPath );   
      console.log('checkXmlContentEXIM chua lam');
                      
      running = await isEXIMRunning( { device_id } );
    
      if (!running) {            
        console.log('🚫 Eximbank EDigi đã tắt. Dừng theo dõi.');
        await clearTempFile( { device_id } );      
        return false;          
      }
    }
    return { status: 200, message: 'Success' };
  },

  trackNAB : async ( { device_id } ) => {    
    const targetDir = path.join('C:\\att_mobile_client\\logs\\');
    ensureDirectoryExists(targetDir);

    console.log('🔍 Bắt đầu theo dõi NAB...');
    
    const chatId = '-4725254373';    

    if (!chatId) {
      console.error("Cannot continue cause of invalid chat ID.");
      return;
    } 

    let running = await isNABRunning( { device_id } );

    if (!running) {
      console.log("NAB đang không chạy");
      return;
    }
        
    await clearTempFile( { device_id } );
    
    while (running) {
      console.log('NAB đang chạy...');
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);
    
      await dumpXmlToLocal( device_id, localPath );
      await checkXmlContentNAB( device_id, localPath );                   
    
      running = await isNABRunning( { device_id } );
    
      if (!running) {            
        console.log('🚫 NAB đã tắt. Dừng theo dõi.');
        await clearTempFile( { device_id } );      
        return false;          
      }
    }
    return { status: 200, message: 'Success' };
  },

  trackTPB : async ( { device_id } ) => {    
    const targetDir = path.join('C:\\att_mobile_client\\logs\\');
    ensureDirectoryExists(targetDir);

    console.log('🔍 Bắt đầu theo dõi TPB...');
    
    const chatId = '-4725254373';    

    if (!chatId) {
      console.error("Cannot continue cause of invalid chat ID.");
      return;
    } 

    let running = await isTPBRunning( { device_id } );

    if (!running) {
      console.log("TPB đang không chạy");
      return;
    }
        
    await clearTempFile( { device_id } );
    
    while (running) {
      console.log('TPB đang chạy...');
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);
    
      await dumpXmlToLocal( device_id, localPath );
      await checkXmlContentTPB( device_id, localPath );                   
    
      running = await isTPBRunning( { device_id } );
    
      if (!running) {            
        console.log('🚫 TPB đã tắt. Dừng theo dõi.');
        await clearTempFile( { device_id } );      
        return false;          
      }
    }
    return { status: 200, message: 'Success' };
  },

  trackVPB : async ( { device_id } ) => {    
    const targetDir = path.join('C:\\att_mobile_client\\logs\\');
    ensureDirectoryExists(targetDir);

    console.log('🔍 Bắt đầu theo dõi VPB...');
    
    const chatId = '-4725254373';    

    if (!chatId) {
      console.error("Cannot continue cause of invalid chat ID.");
      return;
    } 

    let running = await isVPBRunning( { device_id } );

    if (!running) {
      console.log("VPB đang không chạy");
      return;
    }
        
    await clearTempFile( { device_id } );
    
    while (running) {
      console.log('VPB đang chạy...');
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);
    
      await dumpXmlToLocal( device_id, localPath );
      await checkXmlContentVPB( device_id, localPath );                   
    
      running = await isVPBRunning( { device_id } );
    
      if (!running) {            
        console.log('🚫 VPB đã tắt. Dừng theo dõi.');
        await clearTempFile( { device_id } );      
        return false;          
      }
    }
    return { status: 200, message: 'Success' };
  },

  trackMB : async ( { device_id } ) => {
    const targetDir = path.join('C:\\att_mobile_client\\logs\\');
    ensureDirectoryExists(targetDir);

    console.log('🔍 Bắt đầu theo dõi MB Bank...');
    
    const chatId = '-4725254373';    

    if (!chatId) {
      console.error("Cannot continue cause of invalid chat ID.");
      return;
    } 

    let running = await isMBRunning( { device_id } );

    if (!running) {      
      console.log("MB đang không chạy.");
      return;
    }
        
    await clearTempFile( { device_id } );
    
    while (running) {
      console.log('MB đang chạy...');
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);
    
      await dumpXmlToLocal( device_id, localPath );
      await checkXmlContentMB( device_id, localPath );                
    
      running = await isMBRunning( { device_id } );
    
      if (!running) {            
        console.log('🚫 MB Bank đã tắt. Dừng theo dõi.');
        await clearTempFile( { device_id } );      
        return false;          
      }
    }
    return { status: 200, message: 'Success' };
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
      console.log("MSB app is not running.");
      return;
    }
        
    await clearTempFile( { device_id } );
    
    while (running) {
      console.log('MSB app is in process');
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);
    
      await dumpXmlToLocal( device_id, localPath );
      await checkXmlContentMSB( device_id, localPath );                       
    
      running = await isMSBRunning( { device_id } );
    
      if (!running) {            
        console.log('🚫 MSB đã tắt. Dừng theo dõi.');
        await clearTempFile( { device_id } );      
        return false;          
      }
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

  clickConfirmVTB: async ({ device_id }) => {    
    const coordinatesScanQRVTB = await loadCoordinatesForDeviceScanQRVTB(device_id);    
    await adbHelper.tapXY(device_id, ...coordinatesScanQRVTB['Confirm']);      
    return { status: 200, message: 'Success' };
  },

  clickLoginACB: async ({ device_id }) => {    
    const coordinatesLoginACB = await loadCoordinatesForDeviceLoginACB(device_id);
                       
    await adbHelper.tapXY(device_id, ...coordinatesLoginACB['Field-Password']);        

    return { status: 200, message: 'Success' };
  },
  
  clickScanQRMSB: async ({ device_id }) => {    
    const coordinatesScanQRMSB = await loadCoordinatesForDeviceScanQRMSB(device_id);    
    await adbHelper.tapXY(device_id, ...coordinatesScanQRMSB['ScanQR']);      
    return { status: 200, message: 'Success' };
  },

  scanQRMB: async ({ device_id }) => {    
    const coordinatesScanQRMB = await loadCoordinatesForDeviceScanQRMB(device_id);
    
    await adbHelper.tapXY(device_id, ...coordinatesScanQRMB['ScanQR']);
    await delay(600);                  
    await adbHelper.tapXY(device_id, ...coordinatesScanQRMB['Image']);
    await delay(800);   
    await adbHelper.tapXY(device_id, ...coordinatesScanQRMB['Hamburger-Menu']);
    await delay(800);   
    await adbHelper.tapXY(device_id, ...coordinatesScanQRMB['Galaxy-Note9']);
    await delay(700);                 
    await client.shell(device_id, `input swipe 500 1800 500 300`);
    // await client.shell(device_id, `input swipe 500 1800 500 300`);        
    await delay(700);
    await adbHelper.tapXY(device_id, ...coordinatesScanQRMB['Select-Target-Img']); 
    await delay(700);
    await adbHelper.tapXY(device_id, ...coordinatesScanQRMB['Finish']); 

    return { status: 200, message: 'Success' };
  },

  ScanQRACB: async ({ device_id }) => {    
    const coordinatesScanQRACB = await loadCoordinatesForDeviceScanQRACB(device_id);
    
    await adbHelper.tapXY(device_id, ...coordinatesScanQRACB['Hide-Keyboard']);
    await delay(500);                  
    await adbHelper.tapXY(device_id, ...coordinatesScanQRACB['ScanQR']);
    await delay(500);                  
    await adbHelper.tapXY(device_id, ...coordinatesScanQRACB['Select-Image']);           
    await delay(500); 
    await adbHelper.tapXY(device_id, ...coordinatesScanQRACB['Select-Target-Img']);     

    return { status: 200, message: 'Success' };
  },

  ScanQREXIM: async ({ device_id }) => {    
    const coordinatesScanQREXIM = await loadCoordinatesForDeviceScanQREXIM(device_id);
    
    await adbHelper.tapXY(device_id, ...coordinatesScanQREXIM['ScanQR']);
    await delay(500);                  
    await adbHelper.tapXY(device_id, ...coordinatesScanQREXIM['Image']);
    await delay(1000);   
    await adbHelper.tapXY(device_id, ...coordinatesScanQREXIM['Hamburger-Menu']);
    await delay(800);   
    await adbHelper.tapXY(device_id, ...coordinatesScanQREXIM['Galaxy-Note9']);
    await delay(700);                 
    await client.shell(device_id, `input swipe 500 1800 500 300`);
    // await client.shell(device_id, `input swipe 500 1800 500 300`);        
    await delay(700);
    await adbHelper.tapXY(device_id, ...coordinatesScanQREXIM['Select-Target-Img']); 
    await delay(700);
    await adbHelper.tapXY(device_id, ...coordinatesScanQREXIM['Finish']); 

    return { status: 200, message: 'Success' };
  },

  ScanQRNCB: async ({ device_id }) => {    
    const coordinatesScanQRNCB = await loadCoordinatesForDeviceScanQRNCB(device_id);    
    await adbHelper.tapXY(device_id, ...coordinatesScanQRNCB['Select-Image']);        
    await delay(800); 
    await adbHelper.tapXY(device_id, ...coordinatesScanQRNCB['Select-Target-Img']); 
    await delay(800); 
    await adbHelper.tapXY(device_id, ...coordinatesScanQRNCB['Finish']); 
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

  clickScanQRNCB: async ({ device_id }) => {    
    const coordinatesScanQRNCB = await loadCoordinatesForDeviceScanQRNCB(device_id);    
    await adbHelper.tapXY(device_id, ...coordinatesScanQRNCB['Select-ScanQR']);      
    return { status: 200, message: 'Success' };
  },

  clickLoginNAB: async ({ device_id }) => {    
    const coordinatesLoginNAB = await loadCoordinatesForDeviceLoginNAB(device_id);    
    await adbHelper.tapXY(device_id, ...coordinatesLoginNAB['Login']);      
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

  ScanQRNAB: async ({ device_id }) => {    
    const coordinatesScanQRNAB = await loadCoordinatesForDeviceScanQRNAB(device_id);
    
    await adbHelper.tapXY(device_id, ...coordinatesScanQRNAB['ScanQR']);
    await delay(500);                  
    await adbHelper.tapXY(device_id, ...coordinatesScanQRNAB['Image']);
    await delay(1000);   
    await adbHelper.tapXY(device_id, ...coordinatesScanQRNAB['Hamburger-Menu']);
    await delay(800);   
    await adbHelper.tapXY(device_id, ...coordinatesScanQRNAB['Galaxy-Note9']);
    await delay(600);                 
    await client.shell(device_id, `input swipe 500 1800 500 300`);
    // await client.shell(device_id, `input swipe 500 1800 500 300`);        
    await delay(600);
    await adbHelper.tapXY(device_id, ...coordinatesScanQRNAB['Target-Img']); 
    await delay(600);
    await adbHelper.tapXY(device_id, ...coordinatesScanQRNAB['Finish']);

    return { status: 200, message: 'Success' };
  },

  clickSelectImageBAB: async ({ device_id }) => {    
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

  scanQRTPB: async ({ device_id }) => {    
    const coordinatesScanQRTPB = await loadCoordinatesForDeviceScanQRTPB(device_id);    
    const deviceModel = await deviceHelper.getDeviceModel(device_id);    
    console.log('Device Model:', deviceModel);

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
  clickScanQRVPB: async ({ device_id }) => {    
    const coordinatesScanQRVPB = await loadCoordinatesForDeviceScanQRVPB(device_id);
    
    await adbHelper.tapXY(device_id, ...coordinatesScanQRVPB['Select-ScanQR']);                                

    return { status: 200, message: 'Success' };
  },

  // Nếu mà dùng mật khẩu để đăng nhập
  clickScanQRVPB2: async ({ device_id }) => {    
    const coordinatesScanQRVPB = await loadCoordinatesForDeviceScanQRVPB(device_id);
    
    await adbHelper.tapXY(device_id, ...coordinatesScanQRVPB['Select-ScanQR-2']);                                

    return { status: 200, message: 'Success' };
  },

  scanQRVPB: async ({ device_id }) => {    
    const coordinatesScanQRVPB = await loadCoordinatesForDeviceScanQRVPB(device_id);
    
    await adbHelper.tapXY(device_id, ...coordinatesScanQRVPB['Upload-Image']); 
    await delay(1000);                  
    await adbHelper.tapXY(device_id, ...coordinatesScanQRVPB['Select-Image']); 
    await delay(2000);     
    await adbHelper.tapXY(device_id, ...coordinatesScanQRVPB['Target-Image']); 

    return { status: 200, message: 'Success' };
  },  

  ScanQROCB: async ({ device_id }) => {    
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
    // await client.shell(device_id, `input swipe 500 1800 500 300`);        
    await delay(600);
    await adbHelper.tapXY(device_id, ...coordinatesScanQROCB['Target-Img']); 
    await delay(600);
    await adbHelper.tapXY(device_id, ...coordinatesScanQROCB['Finish']);       

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

  clickSelectImageVTB: async ({ device_id }) => {    
    const coordinatesScanQRVTB = await loadCoordinatesForDeviceScanQRVTB(device_id);
        
    await adbHelper.tapXY(device_id, ...coordinatesScanQRVTB['Select-ScanQR']); 
    await sleep(10000); 
    await adbHelper.tapXY(device_id, ...coordinatesScanQRVTB['Select-Image']);  
    await sleep(2000);   
    // await adbHelper.tapXY(device_id, ...coordinatesScanQRVTB['Select-Image-2']);  

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

  stopAppADBEXIM: async ({ device_id }) => {    
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

  startAppADBEXIM: async ({ device_id }) => {    
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

  checkDeviceEXIM: async ({ device_id }) => {
    try {
      const deviceModel = await deviceHelper.getDeviceModel(device_id);      
  
      const deviceCoordinates = coordinatesScanQREXIM[deviceModel];             
      
      if (deviceCoordinates == undefined) {        
        console.log(`No coordinatesScanQREXIM found for device model: ${deviceModel}`);
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
        console.log(`No coordinatesScanQRNAB found for device model: ${deviceModel}`);
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
        console.log(`No coordinatesScanQRTPB found for device model: ${deviceModel}`);
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
        console.log(`No coordinatesScanQRVPB found for device model: ${deviceModel}`);
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
        console.log('log ...coordinatesLoginVTB[char]', ...coordinatesLoginVTB[char]);    
        await sleep(50);
      }
      else if (isSpecialChar(char)) {
        await adbHelper.tapXY(device_id, ...coordinatesLoginVTB['!#1']);
        await sleep(50); 
        await adbHelper.tapXY(device_id, ...coordinatesLoginVTB[char]);
        console.log('log ...coordinatesLoginVTB[char]', ...coordinatesLoginVTB[char]);    
        await sleep(50); 
        await adbHelper.tapXY(device_id, ...coordinatesLoginVTB['ABC']);
      }        
      else {
        await adbHelper.tapXY(device_id, ...coordinatesLoginVTB[char.toLowerCase()]);
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
    console.log("Đang khởi động app to check QR...");    
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

async function loadCoordinatesForDeviceScanQRTPB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);
    console.log('deviceModel now:', deviceModel);

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
    console.log('deviceModel now:', deviceModel);

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
    console.log('deviceModel now:', deviceModel);

    const deviceCoordinates = coordinatesScanQRMB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRMB for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesForDeviceLoginACB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);
    console.log('deviceModel now:', deviceModel);

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
    console.log('deviceModel now:', deviceModel);

    const deviceCoordinates = coordinatesScanQRACB[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQRACB for device: ${error.message}`);
    throw error;
  }
};

async function loadCoordinatesForDeviceScanQREXIM(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);
    console.log('deviceModel now:', deviceModel);

    const deviceCoordinates = coordinatesScanQREXIM[deviceModel];

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error loading coordinatesScanQREXIM for device: ${error.message}`);
    throw error;
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
    throw error;
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
    throw error;
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
    throw error;
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
    throw error;
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
    throw error;
  }
};

async function loadCoordinatesForDeviceLoginVTB(device_id) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);
    console.log('deviceModel now:', deviceModel);

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
    console.log('deviceModel now:', deviceModel);

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