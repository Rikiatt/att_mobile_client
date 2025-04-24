require('dotenv').config();
const adb = require('adbkit');
const fs = require('fs');
const path = require('path');
const { delay } = require('../helpers/functionHelper');
const xml2js = require('xml2js');
const adbPath = path.join(__dirname, '../platform-tools', 'adb.exe');
const client = adb.createClient({ bin: adbPath });

const filePath = 'C:\\att_mobile_client\\database\\info-qr.json';
let chatId = '-4725254373'; // mặc định là gửi vào nhóm Warning - Semi Automated Transfer
const telegramToken = '7884594856:AAEKZXIBH2IaROGR_k6Q49IP2kSt8uJ4wE0';
const { sendTelegramAlert } = require('../services/telegramService');
const { saveAlertToDatabase } = require('../controllers/alert.controller');
const jsonFilePath = "C:\\att_mobile_client\\database\\info-qr.json";

// Đọc file config để xác định chatId phù hợp
try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(fileContent);

    if (jsonData.data?.site === 'new88') {        
        // chatId = '-4607954489';
        chatId = '-4709837410'; // RIKI & BOT
    }
} catch (error) {
    console.error('❌ Lỗi khi đọc file info-qr.json:', error);
    return;
}

async function checkContentACB (device_id, localPath) {
    try {
        // Đọc nội dung XML đã dump ra
        const content = fs.readFileSync(localPath, "utf-8").trim();

        const screenKeywords = [                
            {
            name: "Chuyển tiền",
            vi: ["Chuyển tiền", "Chuyển tiền đến", "Tài khoản ngân hàng", "Thẻ ngân hàng", "CMND / Hộ chiếu", "Số điện thoại", "Danh sách người nhận", "Xem tất cả"],
            en: ["Transfer", "Transfer to", "Bank account", "Bank card", "ID / Passport", "Cellphone number", "Beneficiary list", "View all"]
            }
        ];
  
        for (const screen of screenKeywords) {
            if (
                screen.vi.every(kw => content.includes(kw)) ||
                screen.en.every(kw => content.includes(kw))
            ) {
                console.log(`🚨 Cảnh báo! Phát hiện có thao tác thủ công khi xuất với ACB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`);
        
                console.log('Đóng app ACB');
                await stopACB({ device_id });
        
                await sendTelegramAlert(
                    telegramToken,
                    chatId,
                    `🚨 Cảnh báo! Phát hiện có thao tác thủ công khi xuất với ACB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`
                );
        
                await saveAlertToDatabase({
                    timestamp: new Date().toISOString(),
                    reason: `Phát hiện có thao tác thủ công khi xuất với ACB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`,
                    filePath: localPath
                });
        
                return;
            }
        }         
    } catch (error) {    
        console.error("❌ Lỗi xử lý XML:", error.message);
    }
}

async function checkContentEIB (device_id, localPath) {
    try {
      const content = fs.readFileSync(localPath, "utf-8").trim();
  
      // Kiểm tra hai resource-id đặc trưng của màn hình cần bắt
      const hasCollapsingToolbarMenuTransfer = content.includes('resource-id="com.vnpay.EximBankOmni:id/collapsingToolbarMenuTransfer"');
      const hasBtnMenuTransferAddForm = content.includes('resource-id="com.vnpay.EximBankOmni:id/btnMenuTransferAddForm"');
  
      if (hasCollapsingToolbarMenuTransfer && hasBtnMenuTransferAddForm) {
        const screenName = "Chuyển tiền";
  
        console.log(`🚨 Phát hiện có thao tác thủ công khi xuất với EIB ở màn hình: ${screenName}`);
  
        console.log('Đóng app EIB');
        await stopEIB({ device_id });
  
        await sendTelegramAlert(
          telegramToken,
          chatId,
          `🚨 Cảnh báo! Phát hiện có thao tác thủ công khi xuất với EIB ở màn hình: ${screenName} (id thiết bị: ${device_id})`
        );
  
        await saveAlertToDatabase({
          timestamp: new Date().toISOString(),
          reason: `Phát hiện có thao tác thủ công khi xuất với EIB ở màn hình: ${screenName} (id thiết bị: ${device_id})`,
          filePath: localPath
        });
  
        return;
      }
  
    } catch (error) {
      console.error("❌ Lỗi xử lý XML:", error.message);
    }
}

async function checkContentOCB (device_id, localPath) {
    try {        
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
                console.log(`🚨 Cảnh báo! Phát hiện có thao tác thủ công khi xuất với OCB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`);        
        
                console.log('Đóng app OCB');
                await stopOCB({ device_id });
        
                await sendTelegramAlert(
                    telegramToken,
                    chatId,
                    `🚨 Cảnh báo! Phát hiện có thao tác thủ công khi xuất với OCB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`
                );
        
                await saveAlertToDatabase({
                    timestamp: new Date().toISOString(),
                    reason: `Phát hiện có thao tác thủ công khi xuất với OCB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`,
                    filePath: localPath
                });
        
                return;
            }
        }
    
        const parsed = await xml2js.parseStringPromise(content, { explicitArray: false, mergeAttrs: true });
        const extractedData = extractNodesOCB(parsed);    
    
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
            await stopOCB ( { device_id } );          
    
            await sendTelegramAlert(
                telegramToken,
                chatId,
                `🚨 Cảnh báo! Phát hiện có thay đổi dữ liệu giao dịch khi xuất với OCB (id thiết bị: ${device_id})`
            );
    
            await saveAlertToDatabase({
                timestamp: new Date().toISOString(),
                reason: `Phát hiện có thay đổi dữ liệu giao dịch khi xuất với OCB (id thiết bị: ${device_id})`,
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

// Đoạn này cần phải sửa lại 1 chút
  // Đoạn này cần phải sửa lại 1 chút
  // Đoạn này cần phải sửa lại 1 chút
  // Đoạn này cần phải sửa lại 1 chút
  // Đoạn này cần phải sửa lại 1 chút
  // Đoạn này cần phải sửa lại 1 chút
  // Đoạn này cần phải sửa lại 1 chút
  // Đoạn này cần phải sửa lại 1 chút
  // Đoạn này cần phải sửa lại 1 chút
  // Đoạn này cần phải sửa lại 1 chút
  // Đoạn này cần phải sửa lại 1 chút
async function checkContentNAB (device_id, localPath) {
  try {
    const content = fs.readFileSync(localPath, "utf-8").trim();

    const screenKeywords = [
        {
            name: "Chuyển tiền",
            vi: ["Tài khoản", "Thẻ", "Quét QR", "Chuyển tiền quốc tế", "Danh bạ &#10; người nhận", "Danh sách &#10; lịch chuyển tiền"],
            en: ["Account", "Card", "QR code", "International payments", "Danh bạ &#10; người nhận", "Danh sách &#10; lịch chuyển tiền"]
        }
    ];    

    for (const screen of screenKeywords) {
        if (
            screen.vi.every(kw => content.includes(kw)) ||
            screen.en.every(kw => content.includes(kw))
        ) {
            console.log(`🚨 Phát hiện có thao tác thủ công khi xuất với NAB ở màn hình: ${screen.name}`);

            console.log('Đóng app NAB');
            await stopNAB({ device_id });

            await sendTelegramAlert(
                telegramToken,
                chatId,
                `🚨 Cảnh báo! Phát hiện có thao tác thủ công khi xuất với NAB ở màn hình: ${screen.name} (${device_id})`
            );

            await saveAlertToDatabase({
                timestamp: new Date().toISOString(),
                reason: `Phát hiện có thao tác thủ công khi xuất với NAB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`,
                filePath: localPath
            });

            return;
            }
        }   
    } 
    catch (error) {    
        console.error("❌ Lỗi xử lý XML:", error.message);
    }
}

// CHƯA TEST LẠI ĐƯỢC, ĐANG ĐỢI CHỊ HIRA...
async function checkContentTPB (device_id, localPath) {
    try {
        const content = fs.readFileSync(localPath, "utf-8").trim();

        const screenKeywords = [
            {
                name: "Chuyển tiền/Chatpay",                
                vi: ["Chuyển tiền ChatPay", "Người Nhận Mới - Trong TPBank", "Người Nhận Mới - Liên Ngân Hàng/Thẻ", "Dán Thông Tin Chuyển Tiền"],
                en: ["Chuyển tiền ChatPay", "Người Nhận Mới - Trong TPBank", "Người Nhận Mới - Liên Ngân Hàng/Thẻ", "Dán Thông Tin Chuyển Tiền"] 
            },
            { // giao diện này nó không cho dump
                name: "Chuyển tiền",                
                vi: ["Chuyển tiền", "Từ tài khoản", "Chuyển đến", "Trong TPBank", "Liên Ngân Hàng", "Thẻ ATM"],
                en: ["Chuyển tiền", "Từ tài khoản", "Chuyển đến", "Trong TPBank", "Liên Ngân Hàng", "Thẻ ATM"]
            }
        ];

        for (const screen of screenKeywords) {
            if (
                screen.vi.every(kw => content.includes(kw)) ||
                screen.en.every(kw => content.includes(kw))
            ) {
                console.log(`🚨 Phát hiện có thao tác thủ công khi xuất với TPB ở màn hình: ${screen.name}`);

                console.log('Đóng app TPB');
                await stopTPB({ device_id });

                await sendTelegramAlert(
                    telegramToken,
                    chatId,
                    `🚨 Cảnh báo! Phát hiện có thao tác thủ công khi xuất với TPB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`
                );

                await saveAlertToDatabase({
                    timestamp: new Date().toISOString(),
                    reason: `Phát hiện có thao tác thủ công khi xuất với TPB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`,
                    filePath: localPath
                });

                return;
            }
        }
        // scan QR xong >> chi co the edit duoc description => khong can extract data o day nua.           
    } catch (error) {    
        console.error("❌ Lỗi xử lý XML:", error.message);
    }
}

async function checkContentVPB (device_id, localPath) {
    try {    
        const content = fs.readFileSync(localPath, "utf-8").trim();

        const screenKeywords = [
            {
                name: "Chuyển tiền",
                vi: ["Tới tài khoản", "Tới thẻ", "Tới tài khoản/&#10;thẻ của tôi", "Cộng đồng&#10;thịnh vượng"],
                en: ["Tới tài khoản", "Tới thẻ", "Tới tài khoản/&#10;thẻ của tôi", "Cộng đồng&#10;thịnh vượng"]
            },

            {
                name: "Chuyển đến số tài khoản",
                vi: ["Chuyển đến số tài khoản", "Tài khoản nguồn", "Thông tin người nhận", "Chọn ngân hàng"],
                en: ["Chuyển đến số tài khoản", "Tài khoản nguồn", "Thông tin người nhận", "Chọn ngân hàng"]
            }
        ];

        for (const screen of screenKeywords) {
            if (
                screen.vi.every(kw => content.includes(kw)) ||
                screen.en.every(kw => content.includes(kw))
            ) {
                console.log(`🚨 Cảnh báo! Phát hiện có thao tác thủ công khi xuất với VPB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`);

                console.log('Đóng app VPB');
                await stopVPB({ device_id });

                await sendTelegramAlert(
                telegramToken,
                chatId,
                `🚨 Cảnh báo! Phát hiện có thao tác thủ công khi xuất với VPB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`
                );

                await saveAlertToDatabase({
                timestamp: new Date().toISOString(),
                reason: `Phát hiện có thao tác thủ công khi xuất với VPB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`,
                filePath: localPath
                });

                return;
            }
        }   
    } catch (error) {    
        console.error("❌ Lỗi xử lý XML:", error.message);
    }
}

async function checkContentMB(device_id, localPath) {
    try {
        const content = fs.readFileSync(localPath, "utf-8").trim();

        const screenKeywords = [{
            name: "Chuyển tiền",
            vi: ["Số tài&#10;khoản", "Số&#10;điện thoại", "&#10;Số thẻ", "Truy vấn giao dịch giá trị lớn", "Đối tác MB", "Chuyển tiền"],
            en: ["Account", "Phone number", "Card", "Large-value transaction inquiry", "MB partner", "Transfer"]
        }];

        for (const screen of screenKeywords) {
            if (
                screen.vi.every(kw => content.includes(kw)) ||
                screen.en.every(kw => content.includes(kw))
            ) {
                console.log(`🚨 Phát hiện có thao tác thủ công khi xuất với MB ở màn hình: ${screen.name}`);

                console.log('Đóng app MB');
                await stopMB({
                    device_id
                });

                await sendTelegramAlert(
                    telegramToken,
                    chatId,
                    `🚨 Cảnh báo! Phát hiện có thao tác thủ công khi xuất với MB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`
                );

                await saveAlertToDatabase({
                    timestamp: new Date().toISOString(),
                    reason: `Phát hiện có thao tác thủ công khi xuất với MB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`,
                    filePath: localPath
                });

                return;
            }
        }

        const parsed = await xml2js.parseStringPromise(content, {
            explicitArray: false,
            mergeAttrs: true
        });
        const extractedData = extractNodesMB(parsed);

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
                await stopMB({
                    device_id
                });

                await sendTelegramAlert(
                    telegramToken,
                    chatId,
                    `🚨 Cảnh báo! Phát hiện có thay đổi dữ liệu QR khi xuất với MB (id thiết bị: ${device_id})`
                );

                await saveAlertToDatabase({
                    timestamp: new Date().toISOString(),
                    reason: `Phát hiện có thay đổi dữ liệu QR khi xuất với MB (id thiết bị: ${device_id})`,
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

function extractNodesOCB(obj) {
    let bin = null,
        account_number = null,
        amount = null;
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

            // 1️⃣ Tìm ngân hàng
            if (!bin) {
                for (let bank of bankList) {
                    if (text.includes(bank)) {
                        bin = bankBinMapOCB[bank] || bank;
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
                    console.log(`💳 Tìm thấy số tài khoản: ${account_number}`);
                    return;
                }
            }
        }

        // 3️⃣ Lấy số tiền từ đúng thẻ có resource-id="vn.com.ocb.awe:id/edtInput"
        if (typeof node === 'object' && node['resource-id'] === 'vn.com.ocb.awe:id/edtInput' && node.text) {
            amount = parseInt(node.text.replace(/,/g, ''), 10);
        }
    }

    traverse(obj);
    return {
        bin,
        account_number,
        amount
    };
}

function extractNodesMB(obj) {
    let bin = null,
        account_number = null,
        amount = null;
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

            // 1️⃣ Tìm ngân hàng trước
            if (!bin) {
                for (let bank of bankList) {
                    if (text.includes(bank)) {
                        bin = bankBinMapMB[bank] || bank;
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

    return {
        bin,
        account_number,
        amount
    };
}

// Bảng ánh xạ tên ngân hàng sang mã BIN khi dùng OCB
const bankBinMapOCB = {
    "Asia (ACB)": "970416",
    "Vietnam Foreign Trade (VCB)": "970436",
    "Vietinbank (Vietnam Joint Stock Commercial Bank for Industry and Trade)": "970415", "Ngân hàng TMCP Công Thương Việt Nam": "970415",  
    "Technology and Trade (TCB)": "970407",
    "Investment and development (BIDV)": "970418", "Ngân hàng TMCP Đầu Tư và Phát Triển Việt Nam": "970418",
    "Military (MB)": "970422", "Ngân hàng TMCP Quân Đội": "970422",
    "NCB": "970419", "Ngân hàng TMCP Quốc Dân": "970419"  
}

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
}

const compareData = (xmlData, jsonData) => {
    let differences = [];
    if (xmlData.bin !== jsonData.bin) differences.push(`BIN khác: XML(${xmlData.bin}) ≠ JSON(${jsonData.bin})`);
    if (xmlData.account_number !== String(jsonData.account_number)) differences.push(`Số tài khoản khác: XML(${xmlData.account_number}) ≠ JSON(${jsonData.account_number})`);
    if (Number(xmlData.amount) !== Number(jsonData.amount)) differences.push(`Số tiền khác: XML(${xmlData.amount}) ≠ JSON(${jsonData.amount})`);
    return differences;
}

async function stopACB ({ device_id }) {    
    await client.shell(device_id, 'am force-stop mobile.acb.com.vn');
    console.log('Đã dừng app ACB');
    await delay(500);
    return { status: 200, message: 'Success' };
}

async function stopEIB ({ device_id }) {    
    await client.shell(device_id, 'am force-stop com.vnpay.EximBankOmni');
    console.log('Đã dừng EIB');
    await delay(500);
    return { status: 200, message: 'Success' };
}

async function stopOCB ({ device_id }) {    
  await client.shell(device_id, 'am force-stop vn.com.ocb.awe');
  console.log('Đã dừng app OCB OMNI');
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopNAB ({ device_id }) {    
    await client.shell(device_id, 'input keyevent 3');
    await client.shell(device_id, 'am force-stop ops.namabank.com.vn');
    console.log('Dừng luôn app NAB');
    await delay(500);
    return { status: 200, message: 'Success' };
}

async function stopTPB ({ device_id }) {    
    await client.shell(device_id, 'input keyevent 3');
    await client.shell(device_id, 'am force-stop com.tpb.mb.gprsandroid');
    console.log('Dừng luôn app TPB');
    await delay(500);
    return { status: 200, message: 'Success' };
}

async function stopVPB ({ device_id }) {    
    await client.shell(device_id, 'input keyevent 3');
    await client.shell(device_id, 'am force-stop com.vnpay.vpbankonline');
    console.log('Dừng luôn app VPB');
    await delay(500);
    return { status: 200, message: 'Success' };
}

async function stopMB ({ device_id }) {    
    await client.shell(device_id, 'am force-stop com.mbmobile');
    console.log('Đã dừng app MB');
    await delay(500);
    return { status: 200, message: 'Success' };
}

module.exports = { checkContentACB, checkContentEIB, checkContentOCB, checkContentNAB, checkContentTPB, checkContentVPB, checkContentMB }