import axios from '../utils/axios';
import { swalNotification } from '../utils/swal';

export const endpoints = {
  key: 'hide-dev',
  actionHideDev: '/action-hide-dev'
};

export async function postActionHideDev(data) {
  try {
    const response = await axios.post('/api/hide-dev/action-hide-dev', data);

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
