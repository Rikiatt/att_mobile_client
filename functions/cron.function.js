const cron = require('cron');
const { updateSource } = require('./function');

const cronTask = async () => {
  cronUpdate.start();
};

const cronUpdate = new cron.CronJob(
  '*/30 * * * *',
  async () => {
    try {
      // await updateSource();
      console.log('updateSource() has been hidden');
    } catch (error) {
      console.error('Lỗi khi cron:', error);
    }
  },
  null,
  true,
  'Asia/Ho_Chi_Minh'
);

module.exports = cronTask;