const adb = require('adbkit');
const path = require('path');
const fs = require('fs');
const adbPath = path.join(__dirname, '../platform-tools', 'adb.exe');
const client = adb.createClient({ bin: adbPath });
// const fetch = require('node-fetch');
const { MongoClient } = require('mongodb');
const mongoUri = 'mongodb://localhost:27017';
const dbName = 'rikidb';
const telegramToken = '7884594856:AAEKZXIBH2IaROGR_k6Q49IP2kSt8uJ4wE0';
let telegramChatId;

const delay = async (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

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
        console.error("Cannot delete file temp_dump.xml:", error.message);
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
        if (content.includes('Money transfer successful') || content.includes('Gmail')) {
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
}

async function getChatId() {
    const fetch = await import('node-fetch'); 
    const url = `https://api.telegram.org/bot${telegramToken}/getUpdates`;
    try {
        const response = await fetch.default(url);
        const data = await response.json();
        if (data.ok && data.result.length > 0) {
            const chatId = data.result[0].message.chat.id;
            console.log(`You chat ID: ${chatId}`);
            return chatId;
        } else {
            console.error("Cannot find chat_id. Text message to the bot first pls.");
            return null;
        }
    } catch (error) {
        console.error('Got an error when get chat_id:', error.message);
        return null;
    }
}

async function sendTelegramAlert(message) {
    const fetch = await import('node-fetch'); // Use dynamic import for node-fetch
    const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    if (!telegramChatId) {
        telegramChatId = await getChatId();
        if (!telegramChatId) {
            console.error("Cannot send alert to you bot, find the chat_id.");
            return;
        }
    }
    
    try {
        await fetch.default(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: telegramChatId, text: message })
        });
        console.log("Alert sent to telegram.");
    } catch (error) {
        console.error('Cannot make an allert to Telegram:', error.message);
    }
}

async function saveAlertToDatabase(alert) {
    const client = new MongoClient(mongoUri);
    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection('alerts');
        await collection.insertOne(alert);
        console.log('Alert saved to database');
    } catch (error) {
        console.error('Failed to save alert to database:', error.message);
    } finally {
        await client.close();
    }
}

async function main() {
    ensureDirectoryExists(targetDir);

    telegramChatId = await getChatId(); // Dynamically fetch chat ID
    if (!telegramChatId) {
        console.error("Cannot continue cause of invalid chat ID.");
        return;
    }

    let running = await isMbAppRunning(deviceId);

    if (!running) {
        console.log("App MB Bank is not running.");
        return;
    }

    await clearTempFile(deviceId);
    await delay(1000);

    while (running) {
        console.log('App MB Bank đang được chạy');
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const localPath = path.join(targetDir, `${timestamp}.xml`);

        await dumpXmlToLocal(deviceId, localPath);

        if (checkXmlContent(localPath)) {
            console.log(`Phát hiện nội dung cần dừng. Dừng lại.`);
            await sendTelegramAlert(`Cảnh báo: Phát hiện nội dung cần dừng trên thiết bị ${deviceId}`);
            await saveAlertToDatabase({
                timestamp: new Date().toISOString(),
                reason: 'Detected sensitive content',
                filePath: localPath
            });
            return;
        }

        running = await isMbAppRunning(deviceId);

        if (!running) {            
            console.log("App MB Bank đã tắt. Thoát chương trình.");
            await clearTempFile(deviceId);    
        }
    }
}

const deviceId = 'DEH6VC85YD5XZH8H';
const targetDir = path.join('C:\\att_mobile_client');

main();