const xml2js = require('xml2js');
const adb = require('adbkit');
const fs = require('fs');
const path = require('path');

const xmlFilePath = path.join(__dirname, 'logs', 'window_dump.xml');
const jsonFilePath = path.join(__dirname, 'database', 'info-qr-xml.json');

const jsonFilePath1 = path.join(__dirname, 'database', 'info-qr-xml.json');
const jsonFilePath2 = path.join(__dirname, 'database', 'info-qr.json');

// Bảng ánh xạ tên ngân hàng sang mã BIN
const bankBinMap = {
    "Asia (ACB)": "970416",
    "Vietnam Foreign Trade (VCB)": "970436",
    "Technology and Trade (TCB)": "970407",
    "Investment and development (BIDV)": "970418",
    "Military (MB)": "970422",
    "NCB": "970419"
};

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

        if (extractedData.bin || extractedData.account_number || extractedData.amount) {
            fs.writeFileSync(jsonFilePath1, JSON.stringify(extractedData, null, 4), 'utf8');
            console.log("✅ Dữ liệu extract từ XML:", extractedData);

            // Kiểm tra sự khác biệt giữa dữ liệu mới và dữ liệu cũ
            if (!compareAndHandle(extractedData, jsonFilePath2)) return false;

            return true;
        }

        console.log("⚠ Không tìm thấy dữ liệu hợp lệ trong XML.");
        return false;
    } catch (error) {
        console.error("❌ Got an error:", error.message);
        return false;
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

const compareAndHandle = (newData, jsonFilePath2) => {
    try {
        const oldData = JSON.parse(fs.readFileSync(jsonFilePath2, 'utf8')).data;

        let differences = [];
        
        // Kiểm tra sự khác biệt từng trường dữ liệu
        if (newData.bin !== oldData.bin) {
            differences.push(`⚠ Bin khác biệt: ${oldData.bin} → ${newData.bin}`);
        }
        if (newData.account_number !== oldData.account_number) {
            differences.push(`⚠ Account khác biệt: ${oldData.account_number} → ${newData.account_number}`);
        }
        if (newData.amount !== oldData.amount) {
            differences.push(`⚠ Amount khác biệt: ${oldData.amount} → ${newData.amount}`);
        }

        // Nếu có bất kỳ khác biệt nào, gửi cảnh báo ngay lập tức
        if (differences.length > 0) {
            console.log("⚠ Phát hiện dữ liệu khác biệt:", differences.join(" | "));
            // handleAlert(differences.join("\n"), jsonFilePath1);
            console.log('stop app');
            console.log('sendTelegramAlert');
            console.log('saveAlertToDatabase');
            return false;
        }

        console.log("✅ Dữ liệu khớp nhau.");
        return true;
    } catch (error) {
        console.error("❌ Lỗi khi so sánh JSON:", error.message);
        return false;
    }
};

// const timestamp = Math.floor(Date.now() / 1000).toString();
const timestamp = 'window_dump';
const targetDir = path.join('C:\\att_mobile_client\\logs\\');
const localPath = path.join(targetDir, `${timestamp}.xml`);
checkXmlContentMB(localPath);
compareAndHandle();