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

function getDeviceName(device_id) {
    return new Promise((resolve, reject) => {
        exec(`adb -s ${device_id} shell settings get global device_name`, (error, stdout) => {
            if (error) {
                reject(error);
            } else {
                // Xóa khoảng trắng và chuyển thành tên phù hợp với JSON
                const deviceName = stdout.trim().replace(/ /g, '');
                resolve(deviceName);
            }
        });
    });
}

module.exports = { getConnectedDevices, getDeviceName };