const adb = require('adbkit');
const path = require('path');
const { delay } = require('../helpers/functionHelper');
const { Logger } = require("../config/require.config");
const adbPath = path.join(__dirname, '../platform-tools', 'adb.exe');
const client = adb.createClient({ bin: adbPath });

const hideDevOptions = async ({ device_id }) => {
    try {
        if (!device_id) {
            return { status: 400, valid: false, message: 'Thiếu device_id' };
        }

        // Kiểm tra biến môi trường PATH có chứa đường dẫn cần thiết không
        const pathEnv = process.env.PATH || process.env.Path || '';
        const requiredPath = 'C:\\att_mobile_client\\platform-tools';

        if (!pathEnv.split(';').some(p => p.trim().toLowerCase() === requiredPath.toLowerCase())) {
            return {
                status: 400,
                valid: false,
                message: `PATH chưa bao gồm đường dẫn ${requiredPath}`
            };
        }

        const command = 'settings put global development_settings_enabled 0';

        await client.shell(device_id, command);
        Logger.log(0, `Đã ẩn Developer Mode cho thiết bị ${device_id}`, __filename);
        await delay(200);

        return {
            status: 200,
            valid: true,
            message: `Đã ẩn chế độ nhà phát triển cho thiết bị ${device_id}`
        };
    } catch (err) {
        Logger.log(2, `Lỗi khi ẩn Developer Mode: ${err.message}`, __filename);
        return {
            status: 500,
            valid: false,
            message: `Lỗi khi ẩn Developer Mode: ${err.message}`
        };
    }
};

module.exports = {
    hideDevOptions
};
