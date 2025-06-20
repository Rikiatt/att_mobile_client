import axios from '../utils/axios';
import { swalNotification } from '../utils/swal';

// export const endpoints = {
//   key: 'order',
//   getOrderInfo: '/get-order-info'
// };

// export async function fetchOrderInfo() {
//   try {
//     const url = endpoints.key + endpoints.getOrderInfo;
//     const response = await axios.get(url);

//     if (!response.data.valid) {
//       swalNotification('warning', 'Thông báo', response.data.message);
//     }

//     return response.data;
//   } catch (error) {
//     swalNotification('error', 'Lỗi', error.message);
//     return {
//       valid: false,
//       message: error.message
//     };
//   }
// }

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