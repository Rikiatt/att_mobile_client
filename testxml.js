const adb = require('adbkit');
const path = require('path');
const fs = require('fs');
const adbPath = path.join(__dirname, '../platform-tools', 'adb.exe');
const client = adb.createClient({ bin: adbPath });

const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
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

// Gọi hàm dump XML
const deviceId = 'DEH6VC85YD5XZH8H';
const targetDir = path.join('C:\\att_mobile_client');
ensureDirectoryExists(targetDir);

async function startRepeatingDump(deviceId, targetDir) {
    let found = false;
    while (!found) {  
        let timestamp = Math.floor(Date.now() / 1000).toString();    
        const localPath = path.join(targetDir, `${timestamp}.xml`);       

        await dumpXmlToLocal(deviceId, localPath);        
        if (readXmlContent(localPath)) {
            // console.log('Text "Money transfer successful" found. Stopping dump.');
            console.log('Text "VCB Digibank" found. Stopping dump.');
            found = true;
        }
        await new Promise(resolve => setTimeout(resolve, 800));
    }
}

// Dump xml liên tục
startRepeatingDump(deviceId, targetDir);

function readXmlContent(localPath) {
    try {
        const content = fs.readFileSync(localPath, 'utf-8');
        // if (content.includes('Money transfer successful')) {
        if (content.includes('Money transfer successful')) {
            return true;
        }
        if (
            // content.includes('Transfer to') &&
            // content.includes('Account number') &&
            // content.includes('1') &&
            // content.includes('2') &&
            // content.includes('3') &&
            // content.includes('4') &&
            // content.includes('5') &&
            // content.includes('6') &&
            // content.includes('7') &&
            // content.includes('8') &&
            // content.includes('9') &&
            // content.includes('0')
            content.includes('Authenticator') &&
            content.includes('Chrome') &&
            content.includes('Drive') &&
            content.includes('Files') &&
            content.includes('Gmail')
        ) {
            // console.log('Text "Transfer to" and "Account number" and all digits 0-9 found. Stopping dump.');
            console.log('Text "..." and "..." found. Stopping dump.');
            return true;
        }
        return false;
    } catch (error) {
        console.error(`Error reading XML file: ${error.message}`);
        return false;
    }
}