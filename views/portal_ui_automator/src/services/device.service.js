import { postActionDevice } from '../api/device';
import { swalToast } from '../utils/swal';

export async function actionDevice(data) {
  try {
    const result = await postActionDevice(data);    

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