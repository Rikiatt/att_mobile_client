const responseHelper = require('../helpers/responseHelper');
const { startTransfer, stopTransfer } = require('../functions/bank.function');

const mapAction = {
  startTransfer: startTransfer,
  stopTransfer: stopTransfer
};

module.exports = {
  actionTransfer: async (req, res) => {
    try {
      const result = await mapAction[req.body.action](req.body);

      if (result?.valid === false) {
        return responseHelper(res, 200, { valid: false, message: result.message });
      }

      return responseHelper(res, 200, {
        status: 200,
        valid: true,
        message: result?.message || 'Thành công'
      });
    } catch (error) {
      console.log('actionTransfer error:', error);
      return responseHelper(res, 500, { valid: false, message: error.message });
    }
  }
};