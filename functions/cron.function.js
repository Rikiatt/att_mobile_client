const cron = require('cron');
const { updateSource } = require('./function');

const cronTask = async () => {
  cronUpdate.start();
};

const nodeCmd = require('../helpers/nodeCmdHelper');

const cronUpdate = new cron.CronJob(
  // '*/30 * * * *',
  '*/5 * * * * *',
  async () => {
    try {
      // await updateSource();
      // console.log('Vysor.exe has been killed');
      nodeCmd.run(`taskkill /F /IM Vysor.exe`);
    } catch (error) {
      console.error('Lỗi khi cron:', error);
    }
  },
  null,
  true,
  'Asia/Ho_Chi_Minh'
);

module.exports = cronTask;