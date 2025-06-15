import axios from '../utils/axios';
import { swalNotification } from '../utils/swal';

export const endpoints = {
  key: 'hide-usb',
  actionHideUSB: '/action-hide-usb'
};

export async function postActionHideUSB(data) {
  try {
    const response = await axios.post('/api/hide-usb/action-hide-usb', data);

    if (!response.data.valid) {
      swalNotification('warning', 'Thông báo', response.data.message);
    }

    return response.data;
  } catch (error) {
    swalNotification('error', 'Lỗi', error.message);
    return {
      status: false,
      msg: error.message
    };
  }
}
