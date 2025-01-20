const adb = require('adbkit');
const path = require('path');
const fs = require('fs');
const adbPath = path.join(__dirname, '../platform-tools', 'adb.exe');
const client = adb.createClient({ bin: adbPath });

const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

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

async function dumpXmlToLocal(deviceId, localPath) {
    try {
        const tempPath = `/sdcard/temp_dump.xml`;
        
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
        if (content.includes('Money transfer successful')) {
            return true;
        }
        if (
            // content.includes('Transfer to') ||
            // content.includes('Account number') ||
            // content.includes('1') ||
            // content.includes('2') ||
            // content.includes('3') ||
            // content.includes('4') ||
            // content.includes('5') ||
            // content.includes('6') ||
            // content.includes('7') ||
            // content.includes('8') ||
            // content.includes('9') ||
            // content.includes('0')
            content.includes('Gmail') ||
            content.includes('Google') ||
            content.includes('Chrome')
        ) {
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
}

async function main() {
    const deviceId = 'DEH6VC85YD5XZH8H';
    const targetDir = path.join('C:\\att_mobile_client');
    ensureDirectoryExists(targetDir);

    let running = await isMbAppRunning(deviceId);

    if (!running) {
        console.log("App MB Bank đang không chạy");
        return;
    }

    let previousContent = '';

    while (running) {
        console.log('App MB Bank đang được chạy');
        const timestamp = Math.floor(Date.now() / 1000).toString();        
        const localPath = path.join(targetDir, `${timestamp}.xml`);

        await dumpXmlToLocal(deviceId, localPath);      
        
        const currentContent = fs.readFileSync(localPath, 'utf-8');

        if (currentContent !== previousContent) {
            previousContent = currentContent;

            if (checkXmlContent(localPath)) {
                console.log("Phát hiện Gmail || Google || Chrome. Dừng lại.");
                break;
            }
        } else {
            console.log("Màn hình chưa thay đổi, bỏ qua.");
        }

        running = await isMbAppRunning(deviceId);
    }
}

main();