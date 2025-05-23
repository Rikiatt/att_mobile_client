const fs = require('fs');
const path = require('path');

const status_list = [
    "\x1b[32m[INFO]\x1b[0m",
    "\x1b[33m[WARN]\x1b[0m",
    "\x1b[31m[ERROR]\x1b[0m",
];

function getDeviceIdFromJSON() {
    try {
        const infoPath = path.join(__dirname, '../database/info-qr.json');
        const raw = fs.readFileSync(infoPath, 'utf8');
        const json = JSON.parse(raw);
        return json?.data?.device_id || 'unknown';
    } catch (err) {
        return 'unknown';
    }
}

function writeToFile(message, device_id) {
    const dir = path.join(__dirname, '../logs');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    const filePath = path.join(dir, `device_${device_id}.log`);
    fs.appendFileSync(filePath, message + '\n', 'utf8');
}

module.exports = {
    log: async (status, info, direction, device_id = null) => {
        if (!device_id) device_id = getDeviceIdFromJSON();

        let date = new Date();
        let time = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString();
        direction = direction ? `From: ${path.basename(direction)} -` : 'From: UNKOWN -';

        const message = `[${status_list[status].replace(/\x1b\[[0-9;]*m/g, '')}] ${direction} Detail: ${info} - Timestamp: ${time}`;
        console.log(status_list[status], direction, "Detail:", info, `- Timestamp: \x1b[33m${time}\x1b[0m`);
        writeToFile(message, device_id);
    },

    transmit: async (status, info, device_id = null) => {
        if (!device_id) device_id = getDeviceIdFromJSON();

        let date = new Date();
        let time = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString();
        const direction = 'From: UNKOWN -';

        const message = `[${status_list[status].replace(/\x1b\[[0-9;]*m/g, '')}] ${direction} Detail: ${info} - Timestamp: ${time}`;
        console.log(status_list[status], direction, "Detail:", info, `- Timestamp: \x1b[33m${time}\x1b[0m`);
        writeToFile(message, device_id);
    }
};
