class TransferTaskManager {
  constructor() {
    this.tasks = new Map();       // device_id => async function
    this.controllers = new Map(); // device_id => controller { cancelled: true/false }
  }

  start(device_id, asyncFn) {
    if (this.tasks.has(device_id)) {
      console.log(`[TRANSFER] Task đã tồn tại cho device_id ${device_id}`);
      return;
    }

    console.log(`[TRANSFER] Bắt đầu task cho device_id ${device_id}`);

    const controller = { cancelled: false };
    this.controllers.set(device_id, controller);

    const task = async () => {
      try {
        await asyncFn(controller);
      } catch (err) {
        console.log(`[TRANSFER] Lỗi khi chạy task ${device_id}:`, err.message);
      } finally {
        this.tasks.delete(device_id);
        this.controllers.delete(device_id);
        console.log(`[TRANSFER] Dọn task cho device_id ${device_id}`);
      }
    };

    this.tasks.set(device_id, task);
    task(); // chạy luôn
  }

  stop(device_id) {
    const controller = this.controllers.get(device_id);
    if (controller) {
      controller.cancelled = true;
      console.log(`[TRANSFER] Task ${device_id} đã được yêu cầu dừng`);

      // 🔥 Dọn luôn để BẬT TỰ ĐỘNG lại sẽ không bị "task đã tồn tại"
      this.tasks.delete(device_id);
      this.controllers.delete(device_id);
    }
  }

  isRunning(device_id) {
    return this.tasks.has(device_id);
  }
}

module.exports = new TransferTaskManager();