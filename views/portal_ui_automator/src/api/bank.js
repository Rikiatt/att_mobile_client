import axios from '../utils/axios';

export const endpoints = {
  key: 'bank',  
  actionBank: '/action-bank'
};

export async function postActionBank(data) {
  try {
    const url = endpoints.key + endpoints.actionBank;
    const response = await axios.post(url, data);
    console.log(response)
    return response.data;
  } catch (error) {
    console.log(error);
    return {
      status: false,
      msg: error.message
    };
  }
}