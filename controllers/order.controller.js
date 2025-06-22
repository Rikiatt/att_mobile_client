const responseHelper = require('../helpers/responseHelper');
const { getOrderByDevice, clearOrderStatus } = require('../functions/order.function');

const getOrder = async (req, res) => {
  try {
    const { device_id } = req.query;
    if (!device_id) return responseHelper(res, 400, { valid: false, message: 'Thiếu device_id' });

    const data = getOrderByDevice(device_id);
    if (!data) return responseHelper(res, 200, { valid: false, message: 'Không có đơn hàng phù hợp' });

    return responseHelper(res, 200, { valid: true, data });
  } catch (error) {
    console.error('getOrder controller error:', error);
    return responseHelper(res, 500, { valid: false, message: 'Lỗi hệ thống' });
  }
};

const clearOrder = async (req, res) => {
  try {
    const { device_id } = req.body;
    if (!device_id) return responseHelper(res, 400, { valid: false, message: 'Thiếu device_id' });

    const result = clearOrderStatus(device_id);
    if (!result) return responseHelper(res, 404, { valid: false, message: 'Không tìm thấy đơn hàng để xóa' });

    return responseHelper(res, 200, { valid: true, message: 'Đơn hàng đã được cập nhật thành công' });
  } catch (error) {
    console.error('clearOrder controller error:', error);
    return responseHelper(res, 500, { valid: false, message: 'Lỗi hệ thống' });
  }
};

module.exports = { getOrder, clearOrder };
