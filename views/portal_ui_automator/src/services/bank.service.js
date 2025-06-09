import { postActionBank } from '../api/bank';
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