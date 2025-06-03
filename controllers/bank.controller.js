const responseHelper = require('../helpers/responseHelper');
const { bankTransfer } = require('../functions/bank.function');
const { checkRunningBanks } = require('../functions/bankStatus.function');

const mapAction = {  
    bankTransfer: bankTransfer,
    checkRunningBanks: checkRunningBanks    
}

module.exports = {  
    actionBank: async (req, res) => {
        try {                  
            const result = await mapAction[req.body.action](req.body);                 
            responseHelper(res, 200, { status: result?.status || 200, valid: result.valid || true, message: result?.message || 'Thành công' });
        } catch (error) {
            console.log('error:', error);
            responseHelper(res, 500, { message: error.message });
        }
    }
};