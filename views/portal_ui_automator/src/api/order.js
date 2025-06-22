import axios from '../utils/axios';
import { swalNotification } from '../utils/swal';

/**
 * Gọi API để lấy đơn hàng theo device_id từ backend.
 * Backend sẽ kiểm tra file info-qr.json và trả về đơn hàng nếu device_id trùng khớp.
 * Nếu không có đơn hàng sẽ trả về { valid: false, message: 'Không có đơn hàng phù hợp' }
 */
export const getOrder = async (deviceId) => {
  try {
    const response = await axios.get(`/order/get-order?device_id=${deviceId}`);

    if (!response.data.valid) {
      // Tuỳ bạn muốn thông báo hay không – nếu popup không có đơn thì thôi
      // swalNotification('info', 'Thông báo', response.data.message);
    }

    return response.data;
  } catch (error) {
    swalNotification('error', 'Lỗi', error.message);
    return {
      valid: false,
      message: error.message
    };
  }
};

export const clearOrder = async (deviceId) => {
  try {
    const res = await axios.post(`/order/clear`, { device_id: deviceId });
    return res.data;
  } catch (err) {
    return { valid: false, message: 'Lỗi kết nối server' };
  }
};