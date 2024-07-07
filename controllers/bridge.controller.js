const { ver } = require('../config');
const responseHelper = require('../helpers/responseHelper');

module.exports = {
  getVersion: async (req, res) => {
    responseHelper(res, 200, { version: ver });
  }
};
