const xml2js = require('xml2js');
const adb = require('adbkit');
const fs = require('fs');
const path = require('path');
const adbPath = path.join(__dirname, '../platform-tools', 'adb.exe');
const client = adb.createClient({ bin: adbPath });

const xmlFilePath = path.join(__dirname, 'logs', 'window_dump.xml');
const jsonFilePath = path.join(__dirname, 'database', 'info-qr-xml.json');

function parseXML() {
    try {
        const xmlData = fs.readFileSync(xmlFilePath, 'utf8');

        xml2js.parseString(xmlData, { explicitArray: false, mergeAttrs: true }, (err, result) => {
            if (err) {
                console.error("❌ Lỗi khi phân tích XML:", err);
                return;
            }

            // console.log('📌 Log XML result:', JSON.stringify(result, null, 4));

            // Gọi hàm quét XML
            const extractedData = extractNodes(result);
            console.log('📌 Log extractedData:', extractedData);

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
    const bankList = ["Asia (ACB)", "Vietcombank", "Techcombank", "BIDV", "MB Bank", "Sacombank"];

    function traverse(node) {
        if (!node) return;

        // Nếu node là object, duyệt tiếp
        if (typeof node === 'object') {
            for (let key in node) {
                traverse(node[key]); // Đệ quy vào các node con
            }
        }

        // Nếu node chứa nội dung văn bản
        if (typeof node === 'string') {
            let text = node.trim();

            console.log(`🔍 Scanning: "${text}"`);

            // Kiểm tra ngân hàng thụ hưởng
            for (let bank of bankList) {
                if (!bin && text.includes(bank)) {
                    bin = bank;
                    console.log(`🏦 Tìm thấy BIN: ${bin}`);
                    break;
                }
            }

            // Kiểm tra số tài khoản thụ hưởng (ít nhất 6 chữ số liên tiếp)
            const accountMatch = text.match(/\b\d{6,}\b/);
            if (!account_number && accountMatch) {
                account_number = accountMatch[0];
                console.log(`💳 Tìm thấy Số tài khoản: ${account_number}`);
            }

            // Kiểm tra số tiền giao dịch (số có dấu phẩy hoặc chấm)
            const amountMatch = text.match(/\b\d{1,3}([,\.]\d{3})*\b/);
            if (!amount && amountMatch) {
                amount = amountMatch[0];
                console.log(`💰 Tìm thấy Số tiền: ${amount}`);
            }
        }
    }

    traverse(obj);
    return { bin, account_number, amount };
}

// Chạy hàm parseXML
console.log('📂 log xmlFilePath:', xmlFilePath);
console.log('📂 log jsonFilePath:', jsonFilePath);
parseXML();