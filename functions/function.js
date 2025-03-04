const fs = require('fs');
const axios = require('axios');
const QRCode = require('qrcode');
const dataPath = './localdata.json';
const { QRPay } = require('vietnam-qr-pay');
const nodeCmd = require('../helpers/nodeCmdHelper');

module.exports = {
  updateSource: async () => {
    console.log('----- TIẾN TRÌNH CẬP NHẬT -----');
    nodeCmd.runSync('');
    nodeCmd.runSync('git reset --hard');

    const pull = nodeCmd.runSync('git pull');
    console.log(pull);
    if (pull.data.includes('Already up to date')) return;

    nodeCmd.run('pm2 restart ui');
  },

  transToQr: async (data, filename) => {
    const qrPay = QRPay.initVietQR({
      bankBin: data.bin,
      bankNumber: data.account_number,
      amount: data.amount,
      purpose: data.trans_mess
    });
    const content = qrPay.build();

    QRCode.toFile(filename, content, function (err) {
      if (err) {
        console.error(err);
        return false;
      }
      console.log(`Mã QR đã được lưu -> ${filename}`);
      return true;
    });
  },

  downloadQr: async (qrCodeUrl, localFilePath) => {
    let res = false;
    try {
      res = await new Promise(async (resolve, reject) => {
        return await axios({ url: qrCodeUrl, responseType: 'stream' })
          .then((response) =>
            response.data
              .pipe(fs.createWriteStream(localFilePath))
              .on('finish', () => {
                console.log('QR code downloaded.');
                resolve(true);
              })
              .on('error', (err) => {
                console.error('Error saving QR: ', err);
                reject(false);
              })
          )
          .catch((err) => {
            console.error('Error downloading QR code');
            reject(false);
          });
      });
    } catch (e) {
      res = false;
    }
    return res;
  },

  saveLocalData: async (data) => {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log('Update localdata successfully.');
  },

  getLocalData: async () => {
    if (!fs.existsSync(dataPath)) {
      const defaultData = { pusher_key: '' };
      fs.writeFileSync(dataPath, JSON.stringify(defaultData, null, 2), 'utf-8');
      console.log('File created with default content.');
      return defaultData;
    } else {
      const fileContent = fs.readFileSync(dataPath, 'utf-8');
      const jsonData = JSON.parse(fileContent);
      // console.log('File content:', jsonData);
      return jsonData;
    }
  },

  getDataJson: async (filePath) => {
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const jsonData = JSON.parse(fileContent);
      console.log('File:', JSON.stringify(jsonData));
      return jsonData;
    }
    return null;
  },

  setDataJson: async (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log('Update successfully.');
  },

  getIpPublic: async () => {
    try {
      const response = await axios.get('https://api.ipify.org?format=json');
      console.log(`Your public IP is: ${response.data.ip}`);
      return response.data.ip || ' - ';
    } catch (error) {
      console.error('Error fetching IP:', error);
    }
  }
};
