const cron = require('cron');
const { updateSource } = require('./function');

const cronTask = async () => {
  cronUpdate.start();
};

const cronUpdate = new cron.CronJob(
  '*/20 * * * *',
  async () => {
    try {
    } catch (error) {
      console.error('Lỗi khi cron:', error);
    }
  },
  null,
  true,
  'Asia/Ho_Chi_Minh'
);

module.exports = cronTask;