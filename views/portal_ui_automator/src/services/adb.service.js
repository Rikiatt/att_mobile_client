import { postActionADB } from '../api/adb';
import { swalToast } from '../utils/swal';

export async function actionADB(data) {
  try {
    const result = await postActionADB(data);

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

export function actionADB2(data) {
  try {
    const result = postActionADB(data);

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