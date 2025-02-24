const xml2js = require('xml2js');
const adb = require('adbkit');
const fs = require('fs');
const path = require('path');

const targetDir = path.join('C:\\att_mobile_client\\logs\\');
const jsonFilePathQR = path.join(__dirname, 'database', 'info-qr-xml.json');
const jsonFilePathMain = path.join(__dirname, 'database', 'info-qr.json');

const bankBinMap = {
    "Asia (ACB)": "970416",
    "Vietnam Foreign Trade (VCB)": "970436",
    "Technology and Trade (TCB)": "970407",
    "Investment and development (BIDV)": "970418",
    "Military (MB)": "970422",
    "NCB": "970419"
};

async function trackMBApp({ device_id }) {
    console.log('🔍 Bắt đầu theo dõi MB Bank App...');
    let running = await isMbAppRunning({ device_id });

    if (!running) {
        console.log("App MB Bank is not running.");
        return;
    }

    await clearTempFile({ device_id });
    
    while (running) {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const localPath = path.join(targetDir, `${timestamp}.xml`);

        await dumpXmlToLocal(device_id, localPath);

        if (checkXmlContentMB(localPath)) {
            await handleViolation(device_id, localPath, 'Detected sensitive content');
            return;
        }
        
        if (await parseAndCompareQR()) {
            await handleViolation(device_id, localPath, 'QR Code Data Mismatch');
            return;
        }
        
        running = await isMbAppRunning({ device_id });

        if (!running) {
            console.log('🚫 App MB Bank đã tắt. Dừng theo dõi.');
            await clearTempFile({ device_id });
            return;
        }
    }
}

function checkXmlContentMB(localPath) {
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
        
        const foundVI = keywordsVI.every(kw => content.includes(kw));
        const foundEN = keywordsEN.every(kw => content.includes(kw));        

        return foundVI || foundEN;
    } catch (error) {
        console.error("❌ Got an error when reading XML:", error.message);
        return false;
    }
}

async function parseAndCompareQR() {
    try {
        const xmlData = fs.readFileSync(jsonFilePathQR, 'utf8');
        const qrData = JSON.parse(xmlData);
        const mainData = JSON.parse(fs.readFileSync(jsonFilePathMain, 'utf8')).data;

        if (qrData.bin !== mainData.bin ||
            qrData.account_number !== mainData.account_number ||
            qrData.amount !== mainData.amount) {
            return true;
        }
    } catch (error) {
        console.error("❌ Lỗi khi so sánh dữ liệu QR:", error);
    }
    return false;
}

async function handleViolation(device_id, localPath, reason) {
    console.log('🚨 Vi phạm phát hiện:', reason);
    await stopMBApp({ device_id });
    await sendTelegramAlert(
        'YOUR_TELEGRAM_TOKEN',
        'YOUR_CHAT_ID',
        `🚨 Cảnh báo! ${reason} trên thiết bị ${device_id}`
    );
    await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason,
        filePath: localPath
    });
}