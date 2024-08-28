import axios from '../utils/axios';

export const endpoints = {
  key: 'setting',
};

export async function getSetting() {
  try {
    const url = endpoints.key;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.log(error);
    return {
      status: false,
      msg: error.message
    };
  }
}