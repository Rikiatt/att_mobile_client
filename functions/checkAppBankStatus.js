require('dotenv').config();

const adb = require('adbkit');
const path = require('path');
const adbPath = path.join(__dirname, '../platform-tools', 'adb.exe');
const client = adb.createClient({ bin: adbPath });

async function isOCBRunning({ device_id }) {                 
    try {
        const output = await client.shell(device_id, 'pidof vn.com.ocb.awe')
            .then(adb.util.readAll)
            .then(buffer => buffer.toString().trim());                
        if (output !== '') return true;        
    } catch (error) {
        console.error("Error checking OCB app status:", error.message);
        return false;
    }
}

async function isACBRunning( { device_id } ) {             
    try {
        const output = await client.shell(device_id, 'pidof mobile.acb.com.vn')
            .then(adb.util.readAll)
            .then(buffer => buffer.toString().trim());                
        if (output !== '') return true;        
    } catch (error) {
        console.error("Error checking MB Bank app status:", error.message);
        return false;
    }
}

async function isMBRunning( { device_id } ) {             
    try {
        const output = await client.shell(device_id, 'pidof com.mbmobile')
            .then(adb.util.readAll)
            .then(buffer => buffer.toString().trim());                
        if (output !== '') return true;        
    } catch (error) {
        console.error("Error checking MB Bank app status:", error.message);
        return false;
    }
}

async function isMSBRunning( { device_id } ) {                  
    try {
        const output = await client.shell(device_id, 'pidof vn.com.msb.smartBanking')
            .then(adb.util.readAll)
            .then(buffer => buffer.toString().trim());                
        if (output !== '') return true;        
    } catch (error) {
        console.error("Error checking MSB app status:", error.message);
        return false;
    }
}

async function isNABRunning( { device_id } ) {      
    try {
        const output = await client.shell(device_id, 'pidof ops.namabank.com.vn')
            .then(adb.util.readAll)
            .then(buffer => buffer.toString().trim());
        if (output !== '') return true;        
    } catch (error) {
        console.error("Error checking Nam A Bank app status:", error.message);
        return false;
    }
}

async function isVPBRunning( { device_id } ) {      
    try {
        const output = await client.shell(device_id, 'pidof com.vnpay.vpbankonline')
            .then(adb.util.readAll)
            .then(buffer => buffer.toString().trim());
        if (output !== '') return true;        
    } catch (error) {
        console.error("Error checking VPB app status:", error.message);
        return false;
    }
}

module.exports = { isACBRunning, isMBRunning, isMSBRunning, isOCBRunning, isNABRunning, isVPBRunning };