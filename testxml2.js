const xml2js = require('xml2js');
const adb = require('adbkit');
const fs = require('fs');
const path = require('path');

const xmlFilePath = path.join(__dirname, 'logs', 'window_dump.xml');
const jsonFilePath = path.join(__dirname, 'database', 'info-qr-xml.json');

// Bảng ánh xạ tên ngân hàng sang mã BIN
const bankBinMap = {
    "Asia (ACB)": "970416",
    "Vietnam Foreign Trade (VCB)": "970436",
    "Technology and Trade (TCB)": "970407",
    "Investment and development (BIDV)": "970418",
    "Military (MB)": "970422",
    "NCB": "970419"
};

function parseXML() {
    try {
        const xmlData = fs.readFileSync(xmlFilePath, 'utf8');

        xml2js.parseString(xmlData, { explicitArray: false, mergeAttrs: true }, (err, result) => {
            if (err) {
                console.error("❌ Lỗi khi phân tích XML:", err);
                return;
            }

            // Gọi hàm quét XML
            const extractedData = extractNodes(result);
            
            if (extractedData.bin || extractedData.account_number || extractedData.amount) {
                fs.writeFileSync(jsonFilePath, JSON.stringify(extractedData, null, 4), 'utf8');
                console.log("✅ Đã cập nhật dữ liệu vào JSON:", extractedData);
            } else {
                console.log("⚠ Không tìm thấy đầy đủ dữ liệu cần thiết.");
            }
        });

    } catch (error) {
        console.error("❌ Lỗi khi đọc file XML:", error);
    }
}

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
                let extractedAmount = amountMatch[0].replace(/[,.]/g, ''); // Loại bỏ dấu phân cách ngàn

                // Bỏ qua số dư tài khoản gửi (nếu có nhãn "PAYMENT ACCOUNT")
                if (lastText.includes("PAYMENT ACCOUNT")) {
                    console.log(`🚫 Bỏ qua số dư tài khoản gửi: ${extractedAmount}`);
                } else {
                    console.log(`💰 Tìm thấy số tiền: ${extractedAmount}`);
                    possibleAmounts.push(parseInt(extractedAmount)); // Lưu vào danh sách số tiền
                }
            }

            lastText = text; // Lưu lại dòng trước để kiểm tra
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

// Chạy hàm parseXML
console.log('📂 log xmlFilePath:', xmlFilePath);
console.log('📂 log jsonFilePath:', jsonFilePath);
parseXML();