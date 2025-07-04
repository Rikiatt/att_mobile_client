const path = require('path');
const adb = require('adbkit');
const adbPath = path.join(__dirname, '../platform-tools', 'adb.exe');
const client = adb.createClient({ bin: adbPath });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function tapXY(device_id, x, y) {
    await client.shell(device_id, `input tap ${x} ${y}`);
    await sleep(500);
    return { status: 200, message: 'Success' };
}

function escapeAdbText(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\$/g, '\\$')
    .replace(/&/g, '\\&')
    .replace(/</g, '\\<')
    .replace(/>/g, '\\>')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\|/g, '\\|')
    .replace(/;/g, '\\;')
    .replace(/\*/g, '\\*')
    .replace(/\?/g, '\\?')
    .replace(/#/g, '\\#')
    .replace(/~/g, '\\~');
}

module.exports = { tapXY, escapeAdbText };