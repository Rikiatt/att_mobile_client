import axios from '../utils/axios';

export const endpoints = {
  key: 'bridge',
  version: '/version'
};

export async function getVersion() {
  try {
    const url = endpoints.key + endpoints.version;
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
