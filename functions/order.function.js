const fs = require('fs');
const path = require('path');

const bankBins = {
  vcb: '970436', bidv: '970418', vietbank: '970433', tcb: '970407', stb: '970403',
  vpb: '970432', eib: '970431', abb: '970425', vba: '970405', bab: '970409',
  bvb: '970438', vcbneo: '970444', cimb: '422589', citibank: '533948',
  coopbank: '970446', dbs: '796500', vikki: '970406', gpb: '970408',
  hdb: '970437', hlbvn: '970442', hsbc: '458761', icb: '970415', ivb: '970434',
  ncb: '970419', nab: '970428', acb: '970416', shb: '970443', shbvn: '970424',
  cake: '546034', sgicb: '970400', seab: '970440', scb: '970429', pvcb: '970412',
  pgb: '970430', pbvn: '970439', mbv: '970414', ocb: '970448', lio: '963369',
  msb: '970426', mb: '970422', mafc: '977777', lpb: '970449', kbank: '668888',
  klb: '970452', kebhanahcm: '970466', kebhanahn: '970467', kbhn: '970462',
  kbhcm: '970463', ubank: '546035', scvn: '970410', tpb: '970423', timo: '963388',
  uob: '970458', vab: '970427', vbsp: '999888', vccb: '970454', vib: '970441',
  vnpbmoney: '971011', vrb: '970421', vtlmoney: '971005', wvn: '970457'
};

const reverseBankBins = Object.fromEntries(
  Object.entries(bankBins).map(([k, v]) => [v, k.toUpperCase()])
);

const getOrderByDevice = (device_id) => {
  try {
    const infoPath = path.join(__dirname, '../database/info-qr.json');
    if (!fs.existsSync(infoPath)) return null;

    const rawData = fs.readFileSync(infoPath, 'utf-8');
    const json = JSON.parse(rawData);

    if (json?.type !== 'att') return null;
    if (json?.data?.device_id !== device_id) return null;
    if (json?.data?.trans_status !== 'in_process') return null;

    const transId = json?.data?.trans_id;
    const vietqr = json?.data?.vietqr_url;
    const transStatus = json?.data?.trans_status;

    const matches = vietqr.match(/image\/(\d+)-(\d+)-qr\.png\?amount=(\d+)/);
    if (!matches) return null;

    const bin = matches[1];
    const account = matches[2];
    const amount = matches[3];
    const bank = reverseBankBins[bin] || 'UNKNOWN';

    return {
      id: transId,
      bank,
      account,
      amount,
      trans_status: transStatus
    };
  } catch (error) {
    console.error('getOrderByDevice error:', error);
    return null;
  }
};

const clearOrderStatus = (device_id) => {
  try {
    const filePath = path.join(__dirname, '../database/info-qr.json');
    if (!fs.existsSync(filePath)) return null;

    const raw = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(raw);

    if (json?.data?.device_id !== device_id || json?.type !== 'att') return null;

    json.data.trans_status = 'success';

    fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('clearOrderStatus error:', error);
    return null;
  }
};

module.exports = { getOrderByDevice, clearOrderStatus };