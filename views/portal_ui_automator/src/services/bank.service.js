import { postActionBank, postActionTransfer } from '../api/bank';
import { swalToast } from '../utils/swal';

export async function actionBank(data) {
  try {
    const result = await postActionBank(data);    

    if (result.status && result.status === false) {
      return swalToast('error', result.msg);
    }
    
    swalToast('success', 'Thành công');
    
    return result
  } catch (error) {
    console.log(error);
    swalToast('error', error.message);
  }
}

export async function startTransfer(data) {
  try {
    const result = await postActionTransfer({ ...data, action: 'startTransfer' });

    if (result.status === false) {
      return swalToast('error', result.msg);
    }

    swalToast('success', 'Đã bật tự động');
    return result;
  } catch (error) {
    swalToast('error', error.message);
  }
}

export async function stopTransfer(data) {
  try {
    const result = await postActionTransfer({ ...data, action: 'stopTransfer' });

    if (result.status === false) {
      return swalToast('error', result.msg);
    }

    swalToast('success', 'Đã tắt tự động');
    return result;
  } catch (error) {
    swalToast('error', error.message);
  }
}