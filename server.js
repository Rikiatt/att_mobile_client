const express = require('express');
const app = express();

const path = require('path');
const cors = require('cors');
const { exec } = require('child_process');

const Router = require('./routers');
const { port } = require('./config');
const { updateSource } = require('./functions/function');
const cronTask = require('./functions/cron.function');

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

  exec(`start msedge http://localhost:${port}`, {
    windowsHide: true
  });

  console.log(`UI Automator is listening on http://localhost:${port}`);
});

cronTask();
