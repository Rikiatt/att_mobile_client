import { postActionHideUSB } from '../api/hideUSB';
import { swalToast, swalNotification } from '../utils/swal';

export async function actionHideUSB(data) {
  try {
    const result = await postActionHideUSB(data);    

    if (result.status === false) {
      return swalToast('error', result.msg || result.message);
    }

    swalToast('success', 'Ẩn USB Debugging thành công');

    setTimeout(() => {
      swalNotification(
        'info',
        'Lưu ý',
        'Chú ý 20% PIN sẽ phải mang đi sạc!'
      );
    }, 800);
    
    return result;
  } catch (error) {
    console.log(error);
    swalToast('error', error.message);
  }
}
