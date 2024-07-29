const { updateSource } = require('../functions/function');
const { stopGnirehtet, autoRunGnirehtet } = require('../functions/gnirehtet.function');
const { delay } = require('../helpers/functionHelper');
const responseHelper = require('../helpers/responseHelper');

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
  }
};
