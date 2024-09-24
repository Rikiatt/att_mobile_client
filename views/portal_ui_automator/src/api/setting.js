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

export async function getIpPublic() {
  try {
    const response = await axios.get('https://api.ipify.org?format=json');
    console.log(`Your public IP is: ${response.data.ip}`);
    return response.data.ip || ' - ';
  } catch (error) {
    console.error('Error fetching IP:', error);
  }
} 