import { postActionHideDev } from '../api/hideDev';
import { swalToast } from '../utils/swal';

export async function actionHideDev(data) {
  try {
    const result = await postActionHideDev(data);    

    if (result.status === false) {
      return swalToast('error', result.msg || result.message);
    }

    swalToast('success', 'Ẩn chế độ nhà phát triển thành công');
    return result;
  } catch (error) {
    console.log(error);
    swalToast('error', error.message);
  }
}