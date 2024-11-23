import axios from '../utils/axios';

export const endpoints = {
  key: 'bridge',
  version: '/version',
  local_data: '/local-data',
  connect: '/connect'
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

export async function postLocalData(data) {
  try {
    const url = endpoints.key + endpoints.local_data;
    const response = await axios.post(url, data);
    return response.data;
  } catch (error) {
    console.log(error);
    return {
      status: false,
      msg: error.message
    };
  }
}

export async function connectEndpoint(data) {
  try {
    const url = endpoints.key + endpoints.connect;
    const response = await axios.post(url, data);
    return response.data;
  } catch (error) {
    console.log(error);
    return {
      status: false,
      msg: error.message
    };
  }
}