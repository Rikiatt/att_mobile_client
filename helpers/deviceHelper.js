const path = require('path');
const adb = require('adbkit');
const adbPath = path.join(__dirname, '../platform-tools', 'adb.exe');
const client = adb.createClient({ bin: adbPath });

// const getDeviceModel = async (device_id) => {
//     try {
//         // const output = await client.shell(device_id, 'getprop ro.product.model');
//         const output = await client.shell(device_id, 'dumpsys | grep ro.product.model');
//         const buffer = await adb.util.readAll(output);
//         const deviceModel = buffer.toString().trim();
        
//         return deviceModel.replace(/ /g, ' ')
//             .replace(/SM-G975[FWU0-9]+/g, 'SM-G975') // Galaxy S10+
//             .replace(/SM-N960[A-Za-z0-9-_.]*/g, 'SM-N960') // Galaxy Note9
//             // .replace(/SCV40[A-Za-z0-9-_.]*/g, 'SCV40') // Galaxy Note9
//             .replace(/SM-G981[A-Za-z0-9-_.]*/g, 'SM-G981') // Galaxy S20 5G
//             .replace(/SM-G781[A-Za-z0-9-_.]*/g, 'SM-G781') // Galaxy S20 FE 5G
//             .replace(/SM-A155[A-Za-z0-9-_.]*/g, 'SM-A155') // Galaxy A15
//             .replace(/SM-G973[A-Za-z0-9-_.]*/g, 'SM-G973') // Galaxy S10
//             .replace(/SM-A536[A-Za-z0-9-_.]*/g, 'SM-A536') // Galaxy A53 5G
//             .replace(/SM-M156B[A-Za-z0-9-_.]*/g, 'SM-M156B') // Galaxy M15 5G          
//             .replace(/itel A666L[A-Za-z0-9-_.]*/g, 'itel A666L') // itel P55
//             .replace(/SM-G780[A-Za-z0-9-_.]*/g, 'SM-G780') // Galaxy S20 FE
//             .replace(/SM-M236[A-Za-z0-9-_.]*/g, 'SM-M236') // Galaxy M23
//             .replace(/SM-A346[A-Za-z0-9-_.]*/g, 'SM-A346') // Galaxy A34 5G
//             .replace(/CPH2565[A-Za-z0-9-_.]*/g, 'CPH2565') // OPPO A78
//     } catch (error) {
//         throw new Error(`Error getting device model: ${error.message}`);
//     }
// };

const getDeviceModel = async (device_id) => {
    try {
        const output = await client.shell(device_id, 'getprop ro.product.model'); // Lấy đúng model
        const buffer = await adb.util.readAll(output);
        let deviceModel = buffer.toString().trim();

        // Fix lỗi này:
        /*
            execve   111111111111111
            execve  [ro.product.model]: []
            ONEPLUS A5000
        */ 
        const match = deviceModel.match(/(ONEPLUS A5000|SM-[A-Za-z0-9]+|CPH2565|itel A666L)/);        
        if (match) {
            deviceModel = match[1]; // Chỉ giữ lại model hợp lệ
        } else {
            throw new Error(`Không tìm thấy model hợp lệ, giá trị nhận được: ${deviceModel}`);
        }

        return deviceModel
            .replace(/SM-G975[FWU0-9]+/g, 'SM-G975') // Galaxy S10+
            .replace(/SM-N960[A-Za-z0-9-_.]*/g, 'SM-N960') // Galaxy Note9
            .replace(/SM-G981[A-Za-z0-9-_.]*/g, 'SM-G981') // Galaxy S20 5G
            .replace(/SM-G781[A-Za-z0-9-_.]*/g, 'SM-G781') // Galaxy S20 FE 5G
            .replace(/SM-A155[A-Za-z0-9-_.]*/g, 'SM-A155') // Galaxy A15
            .replace(/SM-G973[A-Za-z0-9-_.]*/g, 'SM-G973') // Galaxy S10
            .replace(/SM-A536[A-Za-z0-9-_.]*/g, 'SM-A536') // Galaxy A53 5G
            .replace(/SM-M156B[A-Za-z0-9-_.]*/g, 'SM-M156B') // Galaxy M15 5G          
            .replace(/itel A666L[A-Za-z0-9-_.]*/g, 'itel A666L') // itel P55
            .replace(/SM-G780[A-Za-z0-9-_.]*/g, 'SM-G780') // Galaxy S20 FE
            .replace(/SM-M236[A-Za-z0-9-_.]*/g, 'SM-M236') // Galaxy M23
            .replace(/SM-A346[A-Za-z0-9-_.]*/g, 'SM-A346') // Galaxy A34 5G
            .replace(/CPH2565[A-Za-z0-9-_.]*/g, 'CPH2565'); // OPPO A78
    } catch (error) {
        throw new Error(`Error getting device model: ${error.message}`);
    }
};

const checkDeviceFHD = async (device_id) => {
    try {
        const output = await client.shell(device_id, 'wm size');
        const buffer = await adb.util.readAll(output);
        const deviceFHD = buffer.toString().trim();

        return deviceFHD.includes('1080x2220');
    } catch (error) {
        throw new Error(`Error checking device FHD+ or not: ${error.message}`);
    }
};

module.exports = { getDeviceModel, checkDeviceFHD };