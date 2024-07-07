const { updateSource } = require('../functions/function');
const { delay } = require('../helpers/functionHelper');
const responseHelper = require('../helpers/responseHelper');

module.exports = {
  restart: async (req, res) => {
    updateSource();
    await delay(2000);
    responseHelper(res, 200, 'Thành công');
  }
};
