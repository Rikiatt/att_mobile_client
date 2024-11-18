const { exec } = require('child_process');
const path = require('path');
const adb = require('adbkit');
const adbPath = path.join(__dirname, '../platform-tools', 'adb.exe');
const client = adb.createClient({ bin: adbPath });

function getConnectedDevices() {
    return new Promise((resolve, reject) => {
        exec('adb devices', (error, stdout, stderr) => {
            if (error) {
                reject(`Error: ${stderr}`);
            } else {
                const devices = stdout.split('\n')
                    .slice(1)
                    .filter(line => line.includes('\tdevice'))
                    .map(line => line.split('\t')[0]);
                
                resolve(devices); // Trả về mảng `device_id`
            }
        });
    });
};

// function getDeviceModel(device_id) {
//     return new Promise((resolve, reject) => {
//         let resultModel =  client.shell(device_id, 'shell getprop ro.product.model');
//         exec(`${resultModel}`, (error, stdout) => {
//             if (error) {
//                 reject(error);
//             } else {
//                 // Xóa khoảng trắng và chuyển thành tên phù hợp với JSON
//                 // const deviceName = stdout.trim().replace(/ /g, '').replace();

//                 // Xử lý trường hợp Galaxy S10+ khác hậu tố
//                 const deviceModel = stdout.trim().replace(/ /g, '')
//                 .replace(/SM-G975[FWU0-9]+/g, 'SM-G975') // Galaxy S10+
//                 .replace(/SM-N960[A-Za-z0-9-_.]*/g, 'SM-N960') // Galaxy Note9                
//                 .replace(/SM-G981[A-Za-z0-9-_.]*/g, 'SM-G981') // Galaxy S20 5G                
//                 .replace(/SM-G781[A-Za-z0-9-_.]*/g, 'SM-G781'); // Galaxy S20 FE 5G
//                 resolve(deviceModel);
//             }
//         });
//     });
// }

const getDeviceModel = async (device_id) => {
    try {
        const output = await client.shell(device_id, 'getprop ro.product.model');
        const buffer = await adb.util.readAll(output);
        const deviceModel = buffer.toString().trim();
        
        return deviceModel.replace(/ /g, '')
            .replace(/SM-G975[FWU0-9]+/g, 'SM-G975') // Galaxy S10+
            .replace(/SM-N960[A-Za-z0-9-_.]*/g, 'SM-N960') // Galaxy Note9
            .replace(/SM-G981[A-Za-z0-9-_.]*/g, 'SM-G981') // Galaxy S20 5G
            .replace(/SM-G781[A-Za-z0-9-_.]*/g, 'SM-G781'); // Galaxy S20 FE 5G
    } catch (error) {
        throw new Error(`Error getting device model: ${error.message}`);
    }
};

module.exports = { getConnectedDevices, getDeviceModel };