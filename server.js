
const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
var Pusher = require('pusher-client');
const { exec } = require('child_process');
const Router = require('./routers');
const { port } = require('./config');
const cronTask = require('./functions/cron.function');
const { listDevice, sendFile } = require('./functions/adb.function');
const { updateSource, transToQr, downloadQr, setDataJson, getDataJson } = require('./functions/function');
const { autoRunGnirehtet, stopGnirehtet } = require('./functions/gnirehtet.function');

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
  await updateSource();
  await stopGnirehtet();

  exec(`start msedge http://localhost:${port}`, {
    windowsHide: true
  });

  console.log(`UI Automator is listening on http://localhost:${port}`);

  const lastReceived = {};

  // Khởi tạo file json
  let localPath = path.join(__dirname, 'database', 'localdata.json');
  const localData = await getDataJson(localPath);
  if (localData?.pusher_key && localData?.pusher_key !== "") {
    console.log("---> Listen event on server by Pusher <---");
    var pusher = new Pusher(localData.pusher_key, { cluster: 'ap1' });
    var channel = pusher.subscribe('my-channel');
    channel.bind('my-event', async function (data) {
      const now = Date.now();
      console.log('data', data);
      const devices = await listDevice();
      const findDevice = devices.find((item) => item.id === data.device_id);
      if (!findDevice) return;

      if (lastReceived[data.device_id] && now - lastReceived[data.device_id] < 5000) return;
      lastReceived[data.device_id] = now;

      const { vietqr_url, device_id, trans_id, bin, account_number, amount, trans_mess } = data;

      if (!vietqr_url && (!bin || !account_number || !amount || !trans_mess)) {
        console.log("Mix Data");
        return;
      }

      let qrLocalPath = path.join(__dirname, 'images', device_id + '_qr.png')
      let qrDevicePath = '/sdcard/' + device_id + '_qr.png';

      if (vietqr_url) {
        await downloadQr(vietqr_url, qrLocalPath);
      } else {
        await transToQr(data, qrLocalPath);
      }
      let jsonPath = path.join(__dirname, 'database', device_id + '_url.json')

      await setDataJson(jsonPath, { vietqr_url: vietqr_url, last_time: Date.now() });
      await sendFile(device_id, qrLocalPath, qrDevicePath);

      console.log("Success !!");
    });
  }
});

cronTask();
