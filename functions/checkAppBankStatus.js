require('dotenv').config();

const adb = require('adbkit');
const path = require('path');
const adbPath = path.join(__dirname, '../platform-tools', 'adb.exe');
const client = adb.createClient({ bin: adbPath });

async function isMbAppRunning( { device_id } ) {
    // device_id = typeof device === 'string' ? device : device.device_id;
    console.log('log device_id in isMbAppRunning: ', device_id); 
    const device_id_here = device_id;   
    console.log('log device_id_here in isMbAppRunning: ', device_id_here); 
    try {
        const output = await client.shell(device_id_here, 'pidof com.mbmobile')
            .then(adb.util.readAll)
            .then(buffer => buffer.toString().trim());        
        console.log('log output: ', output);
        if (output !== '') return true;        
    } catch (error) {
        console.error("Error checking MB Bank app status:", error.message);
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