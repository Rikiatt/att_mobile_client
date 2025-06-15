import { postActionHideUSB } from '../api/hideUSB';
import { swalToast } from '../utils/swal';

export async function actionHideUSB(data) {
  try {
    const result = await postActionHideUSB(data);    

    if (result.status === false) {
      return swalToast('error', result.msg || result.message);
    }

    swalToast('success', 'Ẩn USB Debugging thành công');
    return result;
  } catch (error) {
    console.log(error);
    swalToast('error', error.message);
  }
}