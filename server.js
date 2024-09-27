const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
var Pusher = require('pusher-client');
const { exec } = require('child_process');
const Router = require('./routers');
const { port } = require('./config');
const cronTask = require('./functions/cron.function');
const { listDevice, sendFile, delImg } = require('./functions/adb.function');
const { updateSource, transToQr, downloadQr, setDataJson, getDataJson, getIpPublic } = require('./functions/function');
const { autoRunGnirehtet, stopGnirehtet } = require('./functions/gnirehtet.function');
const { delay } = require('./helpers/functionHelper');

const server = require('http').createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'views', 'portal_ui_automator', 'build')));

Router(app);

app.get('/test', async (req, res) => {
  res.send('ok');
});

app.use((req, res, next) => {
  res.status(404).json({ message: 'Không tìm thấy tài nguyên trên hệ thống, vui lòng kiểm tra và thử lại' });
});

server.listen(port, async () => {
  const ipPublic = await getIpPublic();
  await updateSource();
  await stopGnirehtet();
  exec(`start msedge http://localhost:${port}`, {
    windowsHide: true
  });
  console.log(`UI Automator is listening on http://localhost:${port}`);
  const lastReceived = {};
  try {
    const io = require('socket.io-client');
    // Khởi tạo file json
    let localPath = path.join(__dirname, 'database', 'localdata.json');
    const localData = await getDataJson(localPath);
    if (localData && localData.endpoint && localData.site) {
      const { site, endpoint } = localData;
      console.log("---> Listen on server <---");
      const socket = io(endpoint + "/" + site);

      // Khi kết nối thành công
      socket.on('connect', async () => {
        console.log('Connected to server:', socket.id);
        await setDataJson(localPath, { ...localData, connected: true });
      });

      // Nhận phản hồi từ server
      socket.on('broadcast', async (data) => {
        const now = Date.now();
        console.log('data', data);
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
          socket.emit('callback', { ...data, success: false });
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
        let qrLocalPath = path.join(__dirname, 'images', findId.split(':')[0] + '_qr.jpg')
        let qrDevicePath = '/sdcard/DCIM/Camera/' + filename + '.jpg';

        if (vietqr_url) {
          await downloadQr(vietqr_url, qrLocalPath);
        } else {
          await transToQr(data, qrLocalPath);
        }
        let jsonPath = path.join(__dirname, 'database', findId.split(':')[0] + '_url.json')

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
        socket.emit('callback', { ...data, success: true });
      });

      // Khi bị ngắt kết nối
      socket.on('disconnect', async () => {
        console.log('Disconnected from server');
        await setDataJson(localPath, { ...localData, connected: false });
      });
    }
  } catch (e) {
    console.log(e);
  }
});

cronTask();
