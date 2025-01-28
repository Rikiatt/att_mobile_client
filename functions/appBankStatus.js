require('dotenv').config();

const adb = require('adbkit');
const path = require('path');
const adbPath = path.join(__dirname, '../platform-tools', 'adb.exe');
const client = adb.createClient({ bin: adbPath });

async function isMbAppRunning(device_id) {
    try {
        const output = await client.shell(device_id, 'pidof com.mbmobile')
            .then(adb.util.readAll)
            .then(buffer => buffer.toString().trim());
        console.log('log in isMbAppRunning. ok');    
        return output !== '';
    } catch (error) {
        return false;
    }
}

async function isOpenBankingAppRunning(device_id) {
    try {
        const output = await client.shell(device_id, 'pidof ops.namabank.com.vn')
            .then(adb.util.readAll)
            .then(buffer => buffer.toString().trim());
        return output !== '';
    } catch (error) {
        return false;
    }
}

module.exports = { isMbAppRunning, isOpenBankingAppRunning };