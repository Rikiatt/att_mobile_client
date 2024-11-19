import axios from '../utils/axios';

export const endpoints = {
  key: 'adb',
  listDevice: '/list-devices',
  actionADB: '/action-adb'
};

export async function getListDevice() {
  try {
    const url = endpoints.key + endpoints.listDevice;
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

export async function postActionADB(data) {
  try {
    const url = endpoints.key + endpoints.actionADB;
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
