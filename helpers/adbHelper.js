const adb = require('adbkit');
const path = require('path');
const adbPath = path.join(__dirname, '../platform-tools', 'adb.exe');
const client = adb.createClient({ bin: adbPath });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function tapADBVTB(device_id, x, y) {
    await client.shell(device_id, `input tap ${x} ${y}`);
    await sleep(500);
    return { status: 200, message: 'Success' };
}

module.exports = { tapADBVTB };