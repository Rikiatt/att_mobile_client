const fs = require('fs');
const path = require('path');
const io = require('socket.io-client');
const { delay } = require('../helpers/functionHelper');
const { listDevice, sendFile, delImg } = require('./adb.function');
const { transToQr, downloadQr, setDataJson, getDataJson, getIpPublic } = require('./function');
let currentSocket = null;

module.exports = {
  connectEndpoint: async ({ type, disconnect }) => {
    const ipPublic = await getIpPublic();
    const lastReceived = {};
    try {
      if (currentSocket) {
        console.log('Closing existing socket connection...');
        currentSocket.disconnect();
        currentSocket = null; // Đặt lại biến
      }
      // Khởi tạo file json
      let localPath = path.join(__dirname, '..', 'database', 'localdata.json');
      const localData = await getDataJson(localPath);
      console.log("---> Listen on server <---", type, localData, localData[type]?.endpoint, localData[type]?.site);
      if (localData && localData[type]?.endpoint && localData[type]?.site) {
        // reset
        await setDataJson(localPath, { ...localData, connect: '', att: { ...localData.att, connected: false }, org: { ...localData.org, connected: false } });
        // 
        if (!disconnect) {
          const { site, endpoint } = localData[type];

          console.log("---> Listen on server <---");
          // Cấu hình kết nối socket tới attpays+ và attpay.org
          let handPath = '/socket.io';
          if (site.includes('ui_manual')) {
            handPath = "/ui_manual/connect/socket.io";
          }
          currentSocket = io(endpoint + "/" + site, {
            path: handPath,
            transports: ['websocket']
          });

          // Khi kết nối thành công
          currentSocket.on('connect', async () => {
            console.log('Connected to server:', currentSocket.id);
            await setDataJson(localPath, { ...localData, connect: type, [type]: { ...localData[type], connected: true, message: 'Success' } });
          });

          currentSocket.on('connect_error', async (error) => {
            console.error('Socket Fail:: ', error.message);
            await setDataJson(localPath, { ...localData, connect: type, [type]: { ...localData[type], connected: false, message: error.message } });
          });

          // Nhận phản hồi từ server
          currentSocket.on('broadcast', async (data) => {
            const now = Date.now();
            console.log('data ' + type, data);
            const devices = await listDevice();

            const findId = data.device_id.split('$')[0];
            const findIp = data.device_id.split('$')[1];

            const findDevice = devices.find((item) => ((!findIp || findIp == ipPublic) && item.id == findId));
            if (!findDevice) {
              return;
            }

            // Đúng thiết bị
            if (lastReceived[findId] && now - lastReceived[findId] < 5000) {
              return;
            };
            lastReceived[findId] = now;

            const { vietqr_url, trans_id, bin, account_number, amount, trans_mess } = data;

            if (!vietqr_url && (!bin || !account_number || !amount || !trans_mess)) {
              console.log("Mix Data");
              currentSocket.emit('callback', { ...data, success: false });
              return;
            }

            const date = new Date();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');

            const filename = `${year}${month}${day}_${hours}${minutes}${seconds}`;
            let qrLocalPath = path.join(__dirname, '..', 'images', findId.split(':')[0] + '_qr.jpg')
            let qrDevicePath = '/sdcard/DCIM/Camera/' + filename + '.jpg';

            if (vietqr_url) {
              await downloadQr(vietqr_url, qrLocalPath);
            } else {
              await transToQr(data, qrLocalPath);
            }
            let jsonPath = path.join(__dirname, '..', 'database', findId.split(':')[0] + '_url.json')

            await setDataJson(jsonPath, { vietqr_url: vietqr_url, last_time: Date.now() });

            await delImg(findId, '/sdcard/DCIM/Camera/');
            await delay(100);

            await sendFile(findId, qrLocalPath, qrDevicePath);

            setTimeout(async () => {
              await delImg(findId, '/sdcard/DCIM/Camera/', filename);
              console.log("Deleted QR old - " + filename);
            }, 300000);

            // Thành công !!!
            console.log("Success !!");
            currentSocket.emit('callback', { ...data, success: true });
          });

          // Khi bị ngắt kết nối
          currentSocket.on('disconnect', async () => {
            console.log('Disconnected from server');
            await setDataJson(localPath, { ...localData, connect: type, [type]: { ...localData[type], connected: false, message: 'Disconnected' } });
          });
        }
      }
    } catch (e) {
      console.log(e);
    }
  },
};
