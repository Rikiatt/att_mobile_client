const { exec } = require('child_process');

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

function getDeviceModel(device_id) {
    return new Promise((resolve, reject) => {
        exec(`adb -s ${device_id} shell getprop ro.product.model`, (error, stdout) => {
            if (error) {
                reject(error);
            } else {
                // Xóa khoảng trắng và chuyển thành tên phù hợp với JSON
                // const deviceName = stdout.trim().replace(/ /g, '').replace();

                // Xử lý trường hợp Galaxy S10+ khác hậu tố
                const deviceModel = stdout.trim().replace(/ /g, '').replace(/SM-G975[FWU0-9]+/g, 'SM-G975');
                resolve(deviceModel);
            }
        });
    });
}

module.exports = { getConnectedDevices, getDeviceModel };