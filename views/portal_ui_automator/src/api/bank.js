import axios from '../utils/axios';
import { swalNotification } from '../utils/swal';

export const endpoints = {
  key: 'bank',  
  actionBank: '/action-bank',
  transfer: 'transfer',
  actionTransfer: '/action-transfer'
};

export async function postActionBank(data) {
  try {
    const url = endpoints.key + endpoints.actionBank;
    const response = await axios.post(url, data);

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

export async function postActionTransfer(data) {
  try {
    const url = endpoints.transfer + endpoints.actionTransfer;
    const response = await axios.post(url, data);

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