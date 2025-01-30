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
const chatId = '7098096854';

// test
const { isMbAppRunning } = require('./functions/appBankStatus');
const { clearTempFile } = require('./functions/adb.function');
const { dumpXmlToLocal } = require('./functions/adb.function');
const { checkXmlContent } = require('./functions/adb.function');
const { sendTelegramAlert } = require('./services/telegramService');
const { saveAlertToDatabase } = require('./controllers/alert.controller');

const delay = async (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

const ensureDirectoryExists = ( dirPath ) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// async function isMbAppRunning( device_id ) {
//     try {
//         const output = await client.shell(device_id, 'pidof com.mbmobile')
//             .then(adb.util.readAll)
//             .then(buffer => buffer.toString().trim());
//         return output !== '';
//     } catch (error) {
//         return false;
//     }
// }

// async function clearTempFile( device_id ) {
//     try {
//         await client.shell(device_id, `rm /sdcard/temp_dump.xml`);
//     } catch (error) {
//         console.error("Cannot delete file temp_dump.xml:", error.message);
//     }
// }

// async function dumpXmlToLocal( device_id, localPath ) {
//     try {
//         const tempPath = `/sdcard/temp_dump.xml`;
//         // Dump file XML trên thiết bị
//         await client.shell(device_id, `uiautomator dump ${tempPath}`);
//         console.log(`XML dump saved temporarily to device as ${tempPath}`);
//         // Kéo file từ thiết bị về local
//         await client.pull(device_id, tempPath)
//             .then(stream => new Promise((resolve, reject) => {
//                 const fileStream = fs.createWriteStream(localPath);
//                 stream.pipe(fileStream);
//                 fileStream.on('finish', resolve);
//                 fileStream.on('error', reject);
//             }));
//         console.log(`XML dump pulled directly to local: ${localPath}`);
//     } catch (error) {
//         console.error(`Error during XML dump to local: ${error.message}`);
//     }
// }

// function checkXmlContent( localPath ) {
//     try {
//         const content = fs.readFileSync(localPath, 'utf-8');
//         if (content.includes('Money transfer successful') || content.includes('Gmail')) {
//             return true;
//         }
//         return false;
//     } catch (error) {
//         return false;
//     }
// }

// async function getChatId() {
//     const fetch = await import('node-fetch'); 
//     const url = `https://api.telegram.org/bot${telegramToken}/getUpdates`;
//     try {
//         const response = await fetch.default(url);
//         const data = await response.json();
//         if (data.ok && data.result.length > 0) {
//             const chatId = data.result[0].message.chat.id;
//             console.log(`You chat ID: ${chatId}`);
//             return chatId;
//         } else {
//             console.error("Cannot find chatId. Text message to the bot first pls.");
//             return null;
//         }
//     } catch (error) {
//         console.error('Got an error when get chatId:', error.message);
//         return null;
//     }
// }

// async function sendTelegramAlert(message) {
//     const fetch = await import('node-fetch');
//     const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;

//     if (!chatId) {
//         console.error("Cannot send alert to your bot, find the chatId.");
//         return;
//     }

//     try {
//         const response = await fetch.default(url, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ chat_id: chatId, text: message }) // Corrected 'chat_id'
//         });

//         const result = await response.json();

//         if (!result.ok) {
//             console.error("Failed to send alert to Telegram:", result.description);
//         } else {
//             console.log("Alert sent to Telegram successfully.");
//         }
//     } catch (error) {
//         console.error("Cannot send alert to Telegram:", error.message);
//     }
// }

// async function saveAlertToDatabase(alert) {
//     const client = new MongoClient(mongoUri);
//     try {
//         await client.connect();
//         const db = client.db(dbName);
//         const collection = db.collection('alerts');
//         await collection.insertOne(alert);
//         console.log('Alert saved to database');
//     } catch (error) {
//         console.error('Failed to save alert to database:', error.message);
//     } finally {
//         await client.close();
//     }
// }

async function main() {
    ensureDirectoryExists(targetDir);

    // chatId = await getChatId(); // Dynamically fetch chat ID
    if (!chatId) {
        console.error("Cannot continue cause of invalid chat ID.");
        return;
    }

    let running = await isMbAppRunning(device_id);

    if (!running) {
        console.log("App MB Bank is not running.");
        return;
    }
    
    await clearTempFile(device_id);    

    while (running) {
        console.log('App MB Bank is in process');
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const localPath = path.join(targetDir, `${timestamp}.xml`);

        await dumpXmlToLocal( device_id, localPath );

        // testing
        if (checkXmlContent( localPath )) {    
            await sendTelegramAlert(
                telegramToken,
                chatId,
                `Cảnh báo: Phát hiện nội dung cần dừng trên thiết bị ${device_id}`);
            await saveAlertToDatabase({ // ok
                timestamp: new Date().toISOString(),
                reason: 'Detected sensitive content',
                filePath: localPath
            });
            console.log('stop!!!!!!');
            return;
        }

        running = await isMbAppRunning(device_id);

        if (!running) {            
            console.log("App MB Bank đã tắt. Thoát chương trình.");
            await clearTempFile(device_id);                
        }
    }
}

const device_id = 'F6JFZLUGSCPFBMA6';
const targetDir = path.join('C:\\att_mobile_client\\logs\\');

main();