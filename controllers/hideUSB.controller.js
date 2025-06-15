const responseHelper = require('../helpers/responseHelper');
const { hideUSBDebugging } = require('../functions/hideUSB.function');

const mapAction = {
    hideUSBDebugging: hideUSBDebugging
};

module.exports = {
    actionHideUSB: async (req, res) => {
        try {
            const result = await mapAction[req.body.action](req.body);

            if (result?.valid === false) {
                return responseHelper(res, 200, { valid: false, message: result.message });
            }

            return responseHelper(res, 200, { status: 200, valid: true, message: 'Thành công' });

        } catch (error) {
            console.log('error:', error);
            responseHelper(res, 500, { message: error.message });
        }
    }
};