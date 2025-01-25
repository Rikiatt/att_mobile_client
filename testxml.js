const adb = require('adbkit');
const path = require('path');
const fs = require('fs');
const adbPath = path.join(__dirname, '../platform-tools', 'adb.exe');
const client = adb.createClient({ bin: adbPath });
const fetch = require('node-fetch');
const { MongoClient } = require('mongodb');
const mongoUri = 'mongodb://localhost:27017';
const dbName = 'rikidb';
const telegramToken = '7884594856:AAEKZXIBH2IaROGR_k6Q49IP2kSt8uJ4wE0';
const telegramChatId = 'YOUR_CHAT_ID';

const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

async function isMbAppRunning(deviceId) {
    try {
        const output = await client.shell(deviceId, 'pidof com.mbmobile')
            .then(adb.util.readAll)
            .then(buffer => buffer.toString().trim());
        return output !== '';
    } catch (error) {
        return false;
    }
}

async function clearTempFile(deviceId) {
    try {
        await client.shell(deviceId, `rm /sdcard/temp_dump.xml`);
    } catch (error) {
        console.error("Không thể xóa file tạm:", error.message);
    }
}

async function dumpXmlToLocal(deviceId, localPath) {
    try {
        const tempPath = `/sdcard/temp_dump.xml`;
        // Dump file XML trên thiết bị
        await client.shell(deviceId, `uiautomator dump ${tempPath}`);
        console.log(`XML dump saved temporarily to device as ${tempPath}`);
        // Kéo file từ thiết bị về local
        await client.pull(deviceId, tempPath)
            .then(stream => new Promise((resolve, reject) => {
                const fileStream = fs.createWriteStream(localPath);
                stream.pipe(fileStream);
                fileStream.on('finish', resolve);
                fileStream.on('error', reject);
            }));
        console.log(`XML dump pulled directly to local: ${localPath}`);
    } catch (error) {
        console.error(`Error during XML dump to local: ${error.message}`);
    }
}

function checkXmlContent(localPath) {
    try {
        const content = fs.readFileSync(localPath, 'utf-8');
        if (
            content.includes('Money transfer successful') ||
            content.includes('Gmail')
        ) {
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
}

async function main() {
    ensureDirectoryExists(targetDir);

    let running = await isMbAppRunning(deviceId);

    if (!running) {
        console.log("App MB Bank đang không chạy");
        return;
    }

    await clearTempFile(deviceId);
    await clearTempFile(deviceId);

    let previousContent = '';

    while (running) {
        console.log('App MB Bank đang được chạy');
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const localPath = path.join(targetDir, `${timestamp}.xml`);
        
        await dumpXmlToLocal(deviceId, localPath);

        const content = fs.readFileSync(localPath, 'utf-8');

        if (content !== previousContent) {
            previousContent = content;

            if (checkXmlContent(localPath)) {
                console.log("Phát hiện Money transfer successful || Gmail. Dừng lại.");
                return;
            }
        } 
        // else {
        //     console.log("Màn hình không thay đổi, bỏ qua.");
        // }

        running = await isMbAppRunning(deviceId);

        if (!running) {
            console.log("App MB Bank đã tắt. Ngừng dump, thoát chương trình.");
        }
    }
}

const deviceId = 'DEH6VC85YD5XZH8H';
const targetDir = path.join('C:\\att_mobile_client');

main();