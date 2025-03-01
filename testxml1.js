const xml2js = require('xml2js');
const adb = require('adbkit');
const fs = require('fs');
const path = require('path');

const jsonFilePath = "C:\\att_mobile_client\\database\\info-qr.json";

// Bảng ánh xạ tên ngân hàng sang mã BIN
const bankBinMap = {
    "Asia (ACB)": "970416",
    "Vietnam Foreign Trade (VCB)": "970436",
    "Technology and Trade (TCB)": "970407",
    "Investment and development (BIDV)": "970418",
    "Military (MB)": "970422",
    "NCB": "970419"
};

// Từ khóa cần tìm
const keywordsVI = [
    "Số tài&#10;khoản", "Số&#10;điện thoại", "&#10;Số thẻ",
    "Truy vấn giao dịch giá trị lớn", "Đối tác MB", "Chuyển tiền"
];
const keywordsEN = [
    "Account", "Phone number", "Card",
    "Large-value transaction inquiry", "MB partner", "Transfer"
];

const compareData = (xmlData, jsonData) => {
    let differences = [];
    if (xmlData.bin !== jsonData.bin) differences.push(`BIN khác: XML(${xmlData.bin}) ≠ JSON(${jsonData.bin})`);
    if (xmlData.account_number !== String(jsonData.account_number)) differences.push(`Số tài khoản khác: XML(${xmlData.account_number}) ≠ JSON(${jsonData.account_number})`);
    if (Number(xmlData.amount) !== Number(jsonData.amount)) differences.push(`Số tiền khác: XML(${xmlData.amount}) ≠ JSON(${jsonData.amount})`);
    return differences;
};

const triggerAlert = (message) => {
    console.log("🚨 " + message);
    console.log("stop app");
    console.log("sendTelegramAlert");
    console.log("saveAlertToDatabase");
    process.exit(1); // Dừng ứng dụng ngay lập tức
};

const checkXmlContentMB = async (localPath) => {
    try {
        const content = fs.readFileSync(localPath, "utf-8");        

        // Nếu phát hiện từ khóa, trả về true ngay lập tức
        if (keywordsVI.every(kw => content.includes(kw)) || keywordsEN.every(kw => content.includes(kw))) {
            console.log("🚨 Phát hiện nội dung nghi vấn!");
            // handleAlert(differences.join("\n"), jsonFilePath1);
            console.log('stop app');
            console.log('sendTelegramAlert');
            console.log('saveAlertToDatabase');
            return true;
        }        

        const parsed = await xml2js.parseStringPromise(content, { explicitArray: false, mergeAttrs: true });
        const extractedData = extractNodes(parsed);

        if (!extractedData.bin || !extractedData.account_number || !extractedData.amount) {
            console.log("⚠ Không tìm thấy đủ thông tin quan trọng trong XML. Bỏ qua.");
            return false;
        }

        let oldData = {};
        if (fs.existsSync(jsonFilePath)) {
            try {
                const rawData = fs.readFileSync(jsonFilePath, "utf8");
                oldData = JSON.parse(rawData).data || {};
            } catch (error) {
                console.warn("⚠ Không thể đọc dữ liệu cũ, đặt về object rỗng.");
                oldData = {};
            }
        }

        const differences = compareData(extractedData, oldData);
        if (differences.length > 0) {
            triggerAlert(`⚠ Dữ liệu giao dịch thay đổi!\n${differences.join("\n")}`);
            return true;
        } else {
            console.log("✅ Dữ liệu giao dịch KHÔNG thay đổi, bỏ qua.");
            return false;
        }
    } catch (error) {
        console.error("❌ Got an error:", error.message);
        return false;
    }
}

/*
const checkXmlContentMB = async (localPath) => {
  try {  
    const content = fs.readFileSync(localPath, "utf-8");
        
    const keywordsVI = [
      "Số tài&#10;khoản", "Số&#10;điện thoại", "&#10;Số thẻ",
      "Truy vấn giao dịch giá trị lớn", "Đối tác MB", "Chuyển tiền"
    ];
    const keywordsEN = [          
      "Account", "Phone number", "Card",
      "Large-value transaction inquiry", "MB partner", "Transfer"
    ];

    // Phát hiện bất thường, trả về true ngay lập tức
    if (keywordsVI.every(kw => content.includes(kw)) || keywordsEN.every(kw => content.includes(kw))) {          
      console.log("🚨 Phát hiện nội dung nghi vấn!");
      // handleAlert(differences.join("\n"), jsonFilePath1);
      console.log('stop app');
      console.log('sendTelegramAlert');
      console.log('saveAlertToDatabase');
      return true;
    }        

    const parsed = await xml2js.parseStringPromise(content, { explicitArray: false, mergeAttrs: true });
    const extractedData = extractNodes(parsed);    

    console.log('log extractedData:', extractedData);
    
    let oldData = {};
    console.log('log jsonFilePath:', jsonFilePath);

    console.log('fs.existsSync(jsonFilePath):...',fs.existsSync(jsonFilePath));
    if (fs.existsSync(jsonFilePath)) {
      try {
            const rawData = fs.readFileSync(jsonFilePath, "utf8");
            oldData = JSON.parse(rawData).data || {};
            console.log('log oldData:', oldData);
      } catch (error) {        
        console.warn("⚠ Không thể đọc dữ liệu cũ, đặt về object rỗng.");
        oldData = {};        
      }
    }    
    const differences = compareData(extractedData, oldData);
    if (differences.length > 0) {
      triggerAlert(`⚠ Dữ liệu giao dịch thay đổi!\n${differences.join("\n")}`);        
      return true;
    } else {
      console.log("✅ Dữ liệu giao dịch KHÔNG thay đổi, bỏ qua.");
      return false;
    }
  } catch (error) {      
    console.error("❌ Got an error:", error.message);
    return false;
  }
}

// backup
*/

function extractNodes(obj) {
    let bin = null, account_number = null, amount = null;
    const bankList = ["Asia (ACB)", "Vietnam Foreign Trade (VCB)", "Technology and Trade (TCB)", "Investment and development (BIDV)", "Military (MB)", "NCB"];
    let foundBank = false;
    let possibleAmounts = []; // Danh sách số tiền tìm thấy
    let lastText = "";

    function traverse(node) {
        if (!node) return;

        if (typeof node === 'object') {
            for (let key in node) {
                traverse(node[key]); // Đệ quy vào các node con
            }
        }

        if (typeof node === 'string') {
            let text = node.trim();

            // Bỏ qua dữ liệu không quan trọng
            if (!text || text === "false" || text === "true") return;

            console.log(`🔍 Scanning: "${text}"`);

            // Bỏ qua tọa độ dạng [x,y][x,y]
            if (/\[\d+,\d+\]\[\d+,\d+\]/.test(text)) {
                console.log(`🚫 Bỏ qua tọa độ: ${text}`);
                return;
            }

            // Tìm ngân hàng thụ hưởng
            if (!bin) {
                for (let bank of bankList) {
                    if (text.includes(bank)) {
                        bin = bankBinMap[bank] || bank; // Chuyển đổi sang mã BIN nếu có
                        foundBank = true;
                        console.log(`🏦 Tìm thấy BIN: ${bin}`);
                        return;
                    }
                }
            }

            // Tìm số tài khoản thụ hưởng
            if (foundBank && !account_number) {
                const accountMatch = text.match(/\b\d{6,}\b/);
                if (accountMatch) {
                    account_number = accountMatch[0]; // Không hỗ trợ định dạng có dấu `-` hoặc `.`
                    console.log(`💳 Tìm thấy Số tài khoản thụ hưởng: ${account_number}`);
                    foundBank = false; // Reset trạng thái
                    return;
                }
            }

            // Kiểm tra số tiền giao dịch (ưu tiên số lớn nhất)
            const amountMatch = text.match(/\b\d{1,3}([,.]\d{3})*\b/);
            if (amountMatch) {
                let extractedAmount = amountMatch[0].replace(/[,.]/g, '');
                console.log(`💰 Tìm thấy số tiền: ${extractedAmount}`);
                possibleAmounts.push(parseInt(extractedAmount));
            }            
        }
    }

    traverse(obj);

    // Chọn số tiền lớn nhất vì đó thường là số tiền giao dịch
    if (possibleAmounts.length > 0) {
        amount = Math.max(...possibleAmounts);
        console.log(`✅ Số tiền giao dịch chính xác: ${amount}`);
    }

    return { bin, account_number, amount };
}

// const timestamp = Math.floor(Date.now() / 1000).toString();
const timestamp = 'window_dump';
const targetDir = path.join('C:\\att_mobile_client\\logs\\');
const localPath = path.join(targetDir, `${timestamp}.xml`);
checkXmlContentMB(localPath);