import { swalToast } from './swal';

export const copyContent = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return swalToast('success', 'Sao chép thành công ' + text);
  } catch (err) {
    return swalToast('error', 'Sao chép thất bại');
  }
};

export const parseStringToJsonArray = (inputString) => {
  const elements = inputString.split('\n');
  const jsonArray = [];
  const result = {
    valid: false,
    message: ''
  };

  elements.forEach((element, index) => {
    try {
      const parsedElement = JSON.parse(element);
      if (typeof parsedElement !== 'object' || parsedElement === null) {
        result.message = `Lỗi phân tích cú pháp ở dòng ${index + 1}: ${element}`;
        return;
      }

      jsonArray.push(parsedElement);
    } catch (error) {
      result.message = `Lỗi phân tích cú pháp ở dòng ${index + 1}: ${element}`;
      return;
    }
  });
  if (result.message === '') {
    return {
      valid: true,
      message: jsonArray
    };
  } else {
    return result;
  }
};

export const randomId = () => {
  return Math.random().toString(36).substr(2, 9);
};

export const mergeObjects = (...objects) => {
  return objects.reduce((acc, curr) => {
    return { ...acc, ...curr };
  }, {});
};
