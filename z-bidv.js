const crypto = require('crypto');
const {BIDV} = require('../../../util/encript.handler.js')
const { v4: uuidv4 } = require('uuid');
const https = require('https');
const { exec, rest, dotenv } = require('../../../config/require.config.js');
const { request_handler } = rest;
const history = require('../../../models/history.js');
const { error } = require('console');
const httpsAgent = new https.Agent({ secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT });
dotenv.config({path:`./Main/const/env/.env.main`})
var merchant_id = process.env.MERCHANT_ID
var signature = process.env.SIGNATURE
var endpoint = process.env.ENDPOINT


const appVersion = '2.4.1.15';
const DT = 'WINDOWS';
const OV = '111.0.0.0';
const PM = 'Chrome';

const captcha_url = 'https://smartbanking.bidv.com.vn/w2/captcha/';
const login_url = 'https://smartbanking.bidv.com.vn/w2/auth';
const process_url = 'https://smartbanking.bidv.com.vn/w2/process';

const default_header = {
  'Accept-Language': 'vi',
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.54 Safari/537.36',
  'Host': 'smartbanking.bidv.com.vn',
  'Origin': 'https://smartbanking.bidv.com.vn',
  'Referer': 'https://smartbanking.bidv.com.vn/'
}

module.exports = async( routing ) => start(routing)

//PROCESSING

const start = async(routing) => {
  try {
    let {bankuser: username, bankpass: password, bank_account: account_number, extra: extend, site: page } = await request_handler({ pin: '' },"patch", endpoint+`/public/bank_info?auth=` + routing.port,
    response => response.data.result, [{ header: {"merchant-id": merchant_id, signature}}])
    let default_data = {
      DT,
      E: '',
      OV,
      PM,
      cif: '',
      username,
      password,
      token: '',
      appVersion,
      lang: 'vi',
      _timeout: 60,
      mobileId: '',
      clientId: '',
      sessionId: '',
      authToken: '',
      account_number,
      accessToken: '',
      captchaToken: '',
      captchaValue: '',
      file: `data/${username}.txt`
    }
  
    routing.site = page

    if ( !extend || extend.used == false) {
      await saveData(routing, default_data);
    } else {
      await parseData(routing, default_data);
    }

    doLogin(routing, default_data)
  } catch (error) {
    console.log(error)
    reset( routing, error.stack )
  }
}

const doLogin = async (routing, default_data) => {
  try {
    const solveCaptcha = await captcha_solver(routing, default_data);

    const param = {
      E: default_data.E,
      DT,
      OV,
      PM,
      appVersion,
      captchaToken: default_data.captchaToken,
      captchaValue: solveCaptcha,
      clientId: default_data.clientId,
      mid: 1,
      pin: default_data.password,
      user: default_data.username
    };
  
    let encData = BIDV.encryptRequest(param);
  
    let result = await request_handler(encData, 'post', login_url, response => {
      default_data.authToken = response.headers['authorization']
      return JSON.parse(BIDV.decryptResponse(response.data))
    }, [{ header: default_header, attribute: { httpsAgent } }]);
  
    if (result.code == '00') {
      console.log(result)
      if (result.accessToken) {
        default_data.sessionId = result.sessionId;
        default_data.accessToken = result.accessToken;
        await saveData(routing, default_data);
        getTransactions(routing, default_data)
      } else if (result.loginType == 3) {
        console.log(result)
        default_data.token = result.token;
        default_data = await saveData(routing, default_data);
        verifyOTP(routing, default_data)
      }
    } else {
      reset(routing, result.des)
    }
  } catch (error) {
    reset(routing, error.stack)
  }
}

const getTransactions = async(routing, default_data) => {
  try {
    let account_balance = await getBalance(routing, default_data)
    console.log( account_balance )

    const data = {
      DT,
      "E": default_data.E,
      OV,
      PM,
      appVersion,
      "clientId": default_data.clientId,
      "accType": "D",
      "accNo": default_data.account_number,
      "mid": 12,
      "moreRecord": "N",
    };
  
    let encData = BIDV.encryptRequest(data);
    
    default_header.authorization = default_data.authToken
  
    let result = await request_handler(encData, 'post', process_url, response => JSON.parse(BIDV.decryptResponse(response.data)),
    [{
      header: default_header,
      attribute: { httpsAgent }
    }])

    if (result.code == '00') {
      if( result.txnList && result.txnList.length > 0 ){
        let length = result.txnList.length
        let last_trans_data =  result.txnList[length-1]
        let data = result.txnList.map((e) => {
          let bank_note = e.txnRemark;
          let remark = e.txnRemark.replace(/\s/g, "");
          let amount = e.amount.replace(/,/g, "") * 1;
          let balance = e.balance.replace(/,/g, "") * 1;
          let transaction_type = e.txnType.includes("-") ? "transfer" : "deposit";
          let pre_balance = e.runbal.replace(/,/g, "") * 1;
          return {
            amount,
            remark,
            balance,
            bank_note,
            pre_balance,
            transaction_type,
            port: routing.port,
            site: routing.site,
            withdraw_id: "none",
            trans_status: "in_process",
            account_name: default_data.account_name
          };
        });
        await history.insertMany(data, { ordered: false }).catch((error) => error)
        more_histories( routing, default_data, result.txnList, last_trans_data, 0 )
      }else{
        reset(routing, "No transaction found!")
      }
    }else{
      reset(routing, result.des)
    }
  } catch (error) {
    reset(routing, error.stack)
  }
}

const more_histories = async( routing, default_data, trans, last_trans_data, timer ) => {
  try {
    timer++
    await getBalance(routing, default_data)

    if( timer < 11 ){
      console.log("Next: " + timer)
      let data = {
        DT,
        OV,
        PM,
        mid: 12,
        appVersion,
        accType: "D",
        moreRecord: "Y",
        E: default_data.E,
        clientId: default_data.clientId,
        nextRunbal: last_trans_data.runbal,
        accNo: default_data.account_number,
        postingDate: last_trans_data.postingDate,
        postingOrder: last_trans_data.postingOrder,
        fileIndicator: last_trans_data.fileIndicator
      };
    
      let encData = BIDV.encryptRequest(data);
        
      default_header.authorization = default_data.authToken
    
      let result = await request_handler(encData, 'post', process_url, response => JSON.parse(BIDV.decryptResponse(response.data)),
      [{
        header: default_header,
        attribute: { httpsAgent }
      }])
      .catch( error => {
        timer < 3
        ? setTimeout(()=> more_histories( routing, default_data, trans, last_trans_data, timer ), 1000)
        : reset(routing, error.stack)
      } )
    
      if (result.code == '00') {
        if( result.txnList && result.txnList.length > 0 ){
          let transactions = trans.concat(result.txnList)
          let length = result.txnList.length
          let next_trans =  result.txnList[length-1]
          let data = result.txnList.map((e) => {
            let bank_note = e.txnRemark;
            let remark = e.txnRemark.replace(/\s/g, "");
            let amount = e.amount.replace(/,/g, "") * 1;
            let balance = e.balance.replace(/,/g, "") * 1;
            let transaction_type = e.txnType.includes("-") ? "transfer" : "deposit";
            let pre_balance = e.runbal.replace(/,/g, "") * 1;
            return {
              amount,
              remark,
              balance,
              bank_note,
              pre_balance,
              transaction_type,
              port: routing.port,
              site: routing.site,
              withdraw_id: "none",
              trans_status: "in_process",
              account_name: default_data.account_name
            };
          });
          await history.insertMany(data, { ordered: false }).catch((error) => error)
          setTimeout(()=> more_histories( routing, default_data, transactions, next_trans, timer ), 1000)
        }else{
          more_histories( trans, last_trans_data, timer )
        }
      }else{
        console.log("ERROR: " + JSON.stringify(result))
        setTimeout(()=> more_histories( routing, default_data, trans, last_trans_data, timer ), 1000)
      }
    }else{
      console.log(trans)
      getTransactions( routing, default_data )
    }
  } catch (error) {
    timer < 3
      ? setTimeout(()=> more_histories( routing, default_data, trans, last_trans_data, timer ), 1000)
      : reset(routing, error.stack)
  }
}

//FUNCTIONAL

const captcha_solver = async(routing, default_data) => {
  const getCaptcha = await captcha_gen(default_data);
  try {
    return request_handler({ base64encode: getCaptcha, bank: "bidv" }, 'post', 'https://captcha.attapps.net/ocr', async response => response.data.result, [])
  } catch (error) {
    reset(routing, 'Error solving captcha')
  }
}

const captcha_gen = async(default_data) => {
  try {
    default_data.captchaToken = uuidv4()

    const response = await request_handler( null, 'get', captcha_url + default_data.captchaToken, response => response, [{attribute: {
      responseType: 'arraybuffer',
      httpsAgent
    }}]);
    return Buffer.from(response.data, 'binary').toString('base64');
  } catch (error) {
    console.log(error.stack);
  }
}

const saveData = async(routing, default_data) => {
  try {
    let data = {
      used: true,
      username: default_data.username,
      password: default_data.password,
      account_number: default_data.account_number,
      sessionId: default_data.sessionId,
      mobileId: default_data.mobileId,
      clientId: default_data.clientId,
      cif: default_data.cif,
      token: default_data.token,
      accessToken: default_data.accessToken,
      E: default_data.E,
      authToken: default_data.authToken
    };
    return request_handler({extra: data}, "patch" , endpoint + `/public/bank_info?auth=` + routing.port,
    response => {
      return response.data.result.extra
    }, [{ header: {"merchant-id": merchant_id, signature}}])
  } catch (error) {
    console.log(error.stack)
  }

}

const parseData = async(routing, default_data) => {
  try {
    let data = await request_handler(null, "get" , endpoint + `/public/bank_info?auth=` + routing.port,
    response => response.data.result.extra, [{ header: {"merchant-id": merchant_id, signature}}])
    default_data.username = data.username;
    default_data.password = data.password;
    // default_data.account_number = data.account_number;
    default_data.sessionId = data.sessionId;
    default_data.mobileId = data.mobileId;
    default_data.clientId = data.clientId;
    default_data.cif = data.cif;
    default_data.token = data.token;
    default_data.accessToken = data.accessToken;
    default_data.authToken = data.authToken;
    default_data.E = data.E;
  } catch (error) {
    console.log(error)
  }
}

const verifyOTP = async(routing, default_data) => {
  try {
    let { pin } = await request_handler(null,"get", endpoint+`/public/bank_info?auth=` + routing.port,
    response => response.data.result, [{ header: {"merchant-id": merchant_id, signature}}])

    if( pin != '' ) {
      default_data.E = uuidv4() + default_data.username;
      const data = {
        DT,
        OV,
        PM,
        mid: 56,
        otp: pin,
        appVersion,
        location: '',
        E: default_data.E,
        token: default_data.token,
        user: default_data.username,
        clientId: default_data.clientId
      };

      let encData = BIDV.encryptRequest(data);

      let result = await request_handler(encData, 'post', login_url, response => {
        default_data.authToken = response.headers['authorization']
        return JSON.parse(BIDV.decryptResponse(response.data))
      },
      [{
        header: default_header,
        attribute: { httpsAgent }
      }])
      .catch( error => console.log(error.stack) )

      console.log(result)

      if (result.code == '00') {
        default_data.sessionId = result.sessionId;
        default_data.accessToken = result.accessToken;
        default_data.authToken = result.authToken;
        default_data.cif = result.cif;
        default_data.clientId = result.clientId;
    
        saveData(routing, default_data);
        reset(routing, "Credential set!")
      }else{
        reset(routing, result.des)
      }
    }else{
      console.log("retry...")
      setTimeout(() => verifyOTP(routing, default_data), 1000)
    }
  } catch (error) {
    reset(routing, error.stack)
  }
}

const getBalance = async(routing, default_data) => {
  try {
    const data = {
      DT,
      OV,
      PM,
      mid: 10,
      appVersion,
      accType: "D",
      isCache: false,
      E: default_data.E,
      maxRequestInCache: false,
      clientId: default_data.clientId
    };
  
    let encData = BIDV.encryptRequest(data);
  
    default_header.authorization = default_data.authToken
  
    let result = await request_handler(encData, 'post', process_url, response => JSON.parse(BIDV.decryptResponse(response.data)),
    [{
      header: default_header,
      attribute: { httpsAgent }
    }])

    if (result.code == '00') {
      let bank_balance = result.accList.filter( e => e.accNo == default_data.account_number )[0].balance*1
      let { account_name, balance } = await request_handler({
        balance: bank_balance,
        available_balance: bank_balance
      },"patch", endpoint+`/public/bank_info?auth=` + routing.port,
        response => response.data.result,
      [{ header: {"merchant-id": merchant_id, signature}}])
      return `BIDV: ${ account_name } >> Connected || Available Balance: `+ balance 
    }else{
      reset(routing, result.message)
    }
  } catch (error) {
    reset(routing, error.stack)
  }
}


const reset = async( routing, mess ) => {
  console.log( mess );
  exec( 'pm2 restart ' + routing.direction )
}