const {
    timeout
  } = require('puppeteer')
  const {
    fs,
    exec,
    rest,
    dotenv
  } = require('../../../config/require.config')
  const wait = ms => new Promise(r => setTimeout(r, ms))
  const history = require('../../../models/history')
  dotenv.config({
    path: `./Main/const/env/.env.main`
  })
  const puppeteer = require('puppeteer')
  const {
    request_handler
  } = rest;
  
  var merchant_id = process.env.MERCHANT_ID
  var signature = process.env.SIGNATURE
  var endpoint = process.env.ENDPOINT
  
  const EDGE_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  
  module.exports = async (routing) => {
    let {
      direction,
      port,
      bank_account
    } = routing
    start(direction, port, bank_account)
  }
  
  const start = async (direction, port, bank_account) => {
    try {
      let userDataDir = './Main/resource/user_data/' + bank_account
      if (fs.existsSync(userDataDir)) {
        let browser = await puppeteer.launch({
          headless: false,
          defaultViewport: null,
          args: ['--no-sandbox'],
          userDataDir,
          executablePath: EDGE_PATH
        })
        let page = await browser.newPage()
        let timmer = 0
        login(direction, port, page, timmer)
      } else {
        fs.mkdirSync(userDataDir, { recursive: true })
        setTimeout(() => exec('pm2 restart ' + direction), 1000)
      }
    } catch (error) {
      console.log(error)
      exec('pm2 restart ' + direction)
    }
  }
  
  const login = async (direction, port, page, timmer) => {
    try {
      let {
        bankpass,
        bankuser,
        bank_account,
        holder_name,
        account_name,
        site
      } = await request_handler({
        state: "on"
      }, "patch", endpoint + `/public/bank_info?auth=` + port,
        response => response.data.result, [{
          header: {
            "merchant-id": merchant_id,
            signature,
          }
        }])
        .catch(error => (console.log(error), console.log("Failed")))
      await request_handler({
        value: "on"
      }, 'post', `http://localhost:5000/${direction}/setup?find=state`, response => response.data.result, [])
      await request_handler({
        value: bank_account
      }, 'post', `http://localhost:5000/${direction}/setup?find=bank_account`, response => response.data.result, [])
      await page.evaluateOnNewDocument(function () {
        navigator.geolocation.getCurrentPosition = function (cb) {
          setTimeout(() => {
            cb({
              'coords': {
                accuracy: 21,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                latitude: 23.129163,
                longitude: 113.264435,
                speed: null
              }
            })
          }, 1000)
        }
      });
      await page.goto('https://ocbomni.ocb.com.vn/en/')
      await page.waitForSelector('#username', {
        timeout: 10000
      })
      let username = await page.$eval('#username', e => e.value);
      await wait(1000);
      if (username != '') {
        await page.type('#password', bankpass.toString())
        let submit = await page.waitForSelector('#kc-login')
        await submit.click()
        check_captcha(direction, port, page, timmer, bank_account, holder_name, account_name, site)
      } else {
        await page.type('#username', bankuser + "")
        await wait(1500)
        await page.type('#password', bankpass)
        await wait(500)
        let submit = await page.waitForSelector('#kc-login')
        await submit.click()
        check_captcha(direction, port, page, timmer, bank_account, holder_name, account_name, site)
      }
      await wait(500)
    } catch (error) {
      console.log(error)
      let page_url = await page.url()
      if (page_url == "https://ocbomni.ocb.com.vn/en/dashboard") {
        try {
          let {
            bank_account,
            account_name,
            site
          } = await request_handler({
            state: "on"
          }, "patch", endpoint + `/public/bank_info?auth=` + port,
            response => response.data.result, [{
              header: {
                "merchant-id": merchant_id,
                signature,
              }
            }])
  
          await page.goto('https://ocbomni.ocb.com.vn/en/accounts-management/vnd')
          setup(direction, port, page, bank_account, account_name, site)
        } catch (error) {
          setTimeout(() => exec('pm2 restart ' + direction), 1000)
        }
      } else {
        setTimeout(() => exec('pm2 restart ' + direction), 1000)
      }
    }
  }
  
  const check_captcha = async (direction, port, page, timmer, bank_account, holder_name, account_name, site) => {
    try {
      await page.waitForSelector(`text=Tài khoản của tôi`, {
        timeout: 30000
      })
      await page.goto('https://ocbomni.ocb.com.vn/en/accounts-management/vnd')
      setup(direction, port, page, bank_account, account_name, site)
    } catch (error) {
      console.log(error)
      exec('pm2 restart ' + direction)
    }
  }
  
  const setup = async (direction, port, page, bank_account, account_name, site) => {
    try {
      page.on('request', async result => {
        try {
          if (result.url().includes('transactions?bookingDateGreaterThan')) {
            let raw = await result.url().split('?')[1].split('&')
            let params
            await raw.map(e => {
              let key = e.split('=')[0]
              let value
              let month = new Date().getMonth() + 1
              let previous_month = new Date(new Date().getTime() - 86400000).getMonth() + 1
              let previous_date = new Date(new Date().getTime() - 86400000).getDate()
              let previous_year = new Date(new Date().getTime() - 86400000).getFullYear()
              let date = new Date().getDate()
              switch (key) {
                case "bookingDateGreaterThan":
                  value = previous_year + "-" + (previous_month < 10 ? "0" + "" + previous_month : previous_month) + "-" + (previous_date < 10 ? "0" + "" + previous_date : previous_date)
                  break;
  
                case "bookingDateLessThan":
                  value = new Date().getFullYear() + "-" + (month < 10 ? "0" + "" + month : month) + "-" + (date < 10 ? "0" + "" + date : date)
                  break
  
                case "size":
                  value = 500
                  break
  
                default:
                  value = e.split('=')[1]
                  break
              }
              params += key + '=' + value + "&"
            })
            let header = await result.headers()
            let cookies = await page.cookies()
  
            let cookie = ''
            cookies.map(e => {
              cookie += e.name + "=" + e.value + '; '
            })
  
            header.cookie = cookie
  
            await request_handler(null, "get", "https://ocbomni.ocb.com.vn/api/transaction-manager/client-api/v2/transactions?" + params.replace('undefined', ''),
              async response => {
                await page.waitForSelector('.account-detail-form__price')
                
                let default_balance = await page.$eval('.account-detail-form__price', e => e.textContent.replace(/[^0-9]/g, '') * 1)
  
                let results = response.data.map(e => {
                  let balance = default_balance
                  let remark = e.description.replace(/\s/g, '').toUpperCase() + e.reference + ""
                  var amount = e.transactionAmountCurrency.amount * 1
                  var transaction_type = e.creditDebitIndicator == "CRDT" ? "deposit" : "DBIT"
                  let pre_balance = transaction_type == "deposit" ? balance - amount : balance + amount
                  return {
                    port,
                    site,
                    amount,
                    remark,
                    balance,
                    pre_balance,
                    account_name,
                    transaction_type,
                    withdraw_id: "none",
                    trans_status: "in_process",
                    bank_note: e.description + " " + e.reference
                  }
                })
  
                await history.insertMany(results, {ordered: false})
                  .catch(err => err)
                let available_balance = results.length > 0 ? results[0].balance : default_balance
                await request_handler({
                  balance: available_balance,
                  available_balance
                }, "patch", endpoint + `/public/bank_info?auth=` + port,
                  response => response.data.result, [{
                    header: {
                      "merchant-id": merchant_id,
                      signature,
                    }
                  }])
                console.log(`OCB: ${account_name} >> Connected || Available Balance: ` + available_balance)
              },
              [{
                header
              }]
            )
              .catch(error => console.log(error))
          }
        } catch (error) {
          console.log(error.stack)
        }
      }, {
        timeout: 0
      })
  
      loops(direction, port, page, bank_account, 0)
  
    } catch (error) {
      console.log(error)
      await request_handler({
        value: "off"
      }, 'post', `http://localhost:5000/${direction}/setup?find=state`, response => response.data.result, [])
      exec('pm2 restart ' + direction)
    }
}
  
  const loops = async (direction, port, page, bank_account, timer) => {
    try {
      timer++
      console.log("Find transactions!")
      await page.evaluate((bank_account) => {
        Array.from(document.querySelectorAll('.value')).forEach(e => e.textContent == bank_account && e.click())
      }, bank_account)
      await page.waitForSelector('.account-detail__account-form', { timeout: 5000 })
      await page.reload()
      setTimeout(() => loops(direction, port, page, bank_account, 0), 55000)
    } catch (error) {
      if (timer < 5) {
        loops(direction, port, page, bank_account, timer)
      } else {
        exec('pm2 restart ' + direction)
      }
    }
}  