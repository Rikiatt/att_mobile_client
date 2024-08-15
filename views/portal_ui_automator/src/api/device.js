import axios from '../utils/axios';

export const endpoints = {
  key: 'device',
  restart: '/restart',
  stopShare: '/stop-share',
  startShare: '/start-share'
};

export async function getActionDevice(type) {
  try {
    const url = endpoints.key + endpoints[type];
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
