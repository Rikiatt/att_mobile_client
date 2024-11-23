const path = require('path');
const { ver } = require('../config');
const { setDataJson, getDataJson } = require('../functions/function');
const responseHelper = require('../helpers/responseHelper');
const { connectEndpoint } = require('../functions/endpoint');

module.exports = {
  getVersion: async (req, res) => {
    responseHelper(res, 200, { version: ver });
  },

  localdata: async (req, res) => {
    const { body } = req;
    let localPath = path.join(__dirname, '../database', 'localdata.json');
    const old = await getDataJson(localPath);
    await setDataJson(localPath, { ...old, ...body });

    responseHelper(res, 200, { valid: true });
  },

  connectEP: async (req, res) => {
    const { body } = req;
    await connectEndpoint(body)

    responseHelper(res, 200, { valid: true });
  },
};
