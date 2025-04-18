require('dotenv').config();

const adb = require('adbkit');
const path = require('path');
const adbPath = path.join(__dirname, '../platform-tools', 'adb.exe');
const client = adb.createClient({ bin: adbPath });

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

async function isEIBRunning({ device_id }) {                 
    try {
        const output = await client.shell(device_id, 'pidof com.vnpay.EximBankOmni')
            .then(adb.util.readAll)
            .then(buffer => buffer.toString().trim());                
        if (output !== '') return true;        
    } catch (error) {
        console.error("Error checking EIB app status:", error.message);
        return false;
    }
}

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
        console.error("Got an error when checking NAB app status:", error.message);
        return false;
    }
}

async function isTPBRunning( { device_id } ) {      
    try {
        const output = await client.shell(device_id, 'pidof com.tpb.mb.gprsandroid')
            .then(adb.util.readAll)
            .then(buffer => buffer.toString().trim());
        if (output !== '') return true;        
    } catch (error) {
        console.error("Error checking TPB app status:", error.message);
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

module.exports = { isACBRunning, isEIBRunning, isMBRunning, isMSBRunning, isOCBRunning, isNABRunning, isTPBRunning, isVPBRunning };