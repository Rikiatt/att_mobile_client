const path = require('path');
const { delay } = require('../helpers/functionHelper');
const responseHelper = require('../helpers/responseHelper');
const { updateSource, getDataJson } = require('../functions/function');
const { stopGnirehtet, autoRunGnirehtet } = require('../functions/gnirehtet.function');

module.exports = {
  restart: async (req, res) => {
    updateSource();
    await delay(2000);
    responseHelper(res, 200, 'Thành công');
  },

  stopShare: async (req, res) => {
    await stopGnirehtet();
    responseHelper(res, 200, 'Thành công');
  },

  startShare: async (req, res) => {
    await autoRunGnirehtet();
    responseHelper(res, 200, 'Thành công');
  },

  get_qr: async (req, res) => {
    const { query } = req;
    let jsonPath = path.join(__dirname, '../database', query.device_id + '_url.json')
    const data = await getDataJson(jsonPath);
    res.json({
      status_code: 200,
      valid: true,
      message: 'Thành công',
      result: Date.now() - (data?.last_time || 0) < 30000 ? data.vietqr_url : null
    });
  },
};
