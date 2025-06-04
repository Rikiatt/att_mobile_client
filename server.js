const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
var Pusher = require('pusher-client');
const { exec } = require('child_process');
const Router = require('./routers');
const { port } = require('./config');
const cronTask = require('./functions/cron.function');
const { autoRunGnirehtet, stopGnirehtet } = require('./functions/gnirehtet.function');
const { delay } = require('./helpers/functionHelper');
const notifier = require('./events/notifier');

const server = require('http').createServer(app);
const googleRoute = require('./routers/google.route');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'views', 'portal_ui_automator', 'build')));
app.use('/database', express.static(path.join(__dirname, 'database')));
app.use('/google', googleRoute);

Router(app);
// SSE - Server-Sent Events: Thông báo realtime cho frontend
app.get('/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders();

  const listener = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  notifier.on('multiple-banks-detected', listener);

  req.on('close', () => {
    notifier.removeListener('multiple-banks-detected', listener);
  });
});

app.get('/test', async (req, res) => {
  res.send('ok');
});

app.use((req, res, next) => {
  res.status(404).json({ message: 'Không tìm thấy tài nguyên trên hệ thống, vui lòng kiểm tra và thử lại' });
});

server.listen(port, async () => {
  // await updateSource();
  await stopGnirehtet();
  exec(`start msedge http://localhost:${port}`, {
    windowsHide: true
  });
  // Thực hiện theo dõi thao tác luôn ở đây
});