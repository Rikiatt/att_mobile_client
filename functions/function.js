const nodeCmd = require('../helpers/nodeCmdHelper');

module.exports = {
  updateSource: async () => {
    console.log('----- TIẾN TRÌNH CẬP NHẬT -----');
    nodeCmd.runSync('git reset --hard');
    nodeCmd.runSync('git config --global --add safe.directory C:/ui_automator_v2');

    const pull = nodeCmd.runSync('git pull');
    console.log(pull);
    if (pull.data.includes('Already up to date')) return;

    nodeCmd.run('pm2 restart ui');
  }
};
