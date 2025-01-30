const path = require('path');
const adb = require('adbkit');
const adbPath = path.join(__dirname, '../platform-tools', 'adb.exe');
const client = adb.createClient({ bin: adbPath });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function tapADBMB(device_id, x, y) {
    await client.shell(device_id, `input tap ${x} ${y}`);
    await sleep(500);
    return { status: 200, message: 'Success' };
};

async function tapADBBAB(device_id, x, y) {
    await client.shell(device_id, `input tap ${x} ${y}`);
    await sleep(500);
    return { status: 200, message: 'Success' };
};

async function tapADBOCB(device_id, x, y) {
    await client.shell(device_id, `input tap ${x} ${y}`);
    await sleep(500);
    return { status: 200, message: 'Success' };
};

async function tapADBVTB(device_id, x, y) {
    await client.shell(device_id, `input tap ${x} ${y}`);
    await sleep(500);
    return { status: 200, message: 'Success' };
};

async function tapADBBIDV(device_id, x, y) {
    await client.shell(device_id, `input tap ${x} ${y}`);
    await sleep(500);
    return { status: 200, message: 'Success' };
};

module.exports = { tapADBMB, tapADBBAB, tapADBOCB,tapADBVTB, tapADBBIDV };