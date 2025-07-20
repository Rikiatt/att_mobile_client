const responseHelper = require('../helpers/responseHelper');
const { bankTransfer, 
    startBIDV, startNCB, startHDB, startVIETBANK, startEIB, stopICB, stopSHBVN, startICB, startSHBVN, 
    stopBIDV,
    copyQRImages,
    scanQRICB, clickScanQRBIDV, clickSelectImageBIDV,
    clickLoginHDB, clickConfirmBIDV, clickConfirmICB, clickConfirmOCB,
    inputPINBIDV, inputPINICB, inputICB, inputSHBVN, loginSHBVN } = require('../functions/bank.function');
const { checkRunningBanks } = require('../functions/bankStatus.function');

const mapAction = {
    bankTransfer: bankTransfer,
    checkRunningBanks: checkRunningBanks,
    startBIDV: startBIDV,
    startICB: startICB,
    startNCB: startNCB,
    startHDB: startHDB,
    startVIETBANK: startVIETBANK,
    startEIB: startEIB,
    stopBIDV: stopBIDV,
    stopICB: stopICB,
    stopSHBVN: stopSHBVN,
    startSHBVN: startSHBVN,
    copyQRImages: copyQRImages,
    scanQRICB: scanQRICB,
    clickScanQRBIDV: clickScanQRBIDV,
    clickSelectImageBIDV: clickSelectImageBIDV,
    clickLoginHDB: clickLoginHDB,
    clickConfirmBIDV: clickConfirmBIDV,
    clickConfirmICB: clickConfirmICB,
    clickConfirmOCB: clickConfirmOCB,
    inputPINICB: inputPINICB,
    inputPINBIDV: inputPINBIDV,
    inputICB: inputICB,
    inputSHBVN: inputSHBVN,
    loginSHBVN: loginSHBVN
}

module.exports = {
    actionBank: async (req, res) => {
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